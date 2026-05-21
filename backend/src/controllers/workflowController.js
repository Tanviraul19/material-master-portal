const db = require('../config/db');
const { sequelize } = require('../config/db');

// ── Routing rules ────────────────────────────────────────────────────────────
const DEPT_ROLE_MAP = {
  'Mechanical': 'Mechanical Team',
  'Electrical': 'Electrical Team',
};

const HAS_DEPT_APPROVER = ['Mechanical', 'Electrical'];

// Material type → department mapping (for rerouting on type change)
const MATTYPE_DEPT_MAP = {
  'ZMIS': 'Mechanical',
  'ZEIS': 'Electrical',
};

// Stage that triggered the reroute → status to resume after dept approval
// NOTE: resume-after-dept is tracked via material_requests.resume_after_dept.
// Store Head / IT Team reroutes will resume back to the correct role after dept approval.


// Fields each role can edit during approval
const EDITABLE_FIELDS = {
  'GST Team':   ['control_code'],
  'Store Head': ['material_type', 'description', 'material_group'],
  'IT Team':    ['material_type', 'plant', 'storage_location', 'description', 'long_description', 'uom', 'purchase_group', 'material_group', 'control_code'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function insertAuditLog(t, { request_id, actor_id, actor_name, actor_role, action, field_name, old_value, new_value, reason }) {
  await sequelize.query(
    `INSERT INTO audit_logs (request_id, actor_id, actor_name, actor_role, action, field_name, old_value, new_value, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    { replacements: [request_id, actor_id, actor_name, actor_role, action, field_name || null, old_value || null, new_value || null, reason || null], transaction: t }
  );
}

async function insertHistory(t, { request_id, approver_id, stage, action, comments, fields_changed, is_restart }) {
  await sequelize.query(
    `INSERT INTO approval_history (request_id, approver_id, stage, action, comments, fields_changed, is_restart)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    { replacements: [request_id, approver_id, stage, action, comments || null, fields_changed || null, is_restart ? 1 : 0], transaction: t }
  );
}

async function createNotification(t, { user_id, request_id, type, message }) {
  await sequelize.query(
    `INSERT INTO notifications (user_id, request_id, type, message) VALUES (?, ?, ?, ?)`,
    { replacements: [user_id, request_id, type, message], transaction: t }
  );
}

async function notifyRoleUsers(t, role, request_id, type, message) {
  const users = await sequelize.query(
    `SELECT id FROM users WHERE role = ? AND is_active = 1`,
    { replacements: [role], type: sequelize.constructor.QueryTypes.SELECT }
  );
  for (const u of users) {
    await createNotification(t, { user_id: u.id, request_id, type, message });
  }
}

// Resolve the role that should handle the department stage for a given department
function getDeptRole(department) {
  return DEPT_ROLE_MAP[department] || null;
}

// Decide whether a department needs a dept-team approval step
function needsDeptApproval(department) {
  return HAS_DEPT_APPROVER.includes(department);
}

// Look up the first active user for a given role and return their display info
async function getApproverForRole(role) {
  const [u] = await sequelize.query(
    `SELECT full_name, email, role FROM users WHERE role = ? AND is_active = 1 LIMIT 1`,
    { replacements: [role], type: sequelize.constructor.QueryTypes.SELECT }
  );
  return u || { full_name: role, email: '', role };
}

// ── GET /workflow/pending ────────────────────────────────────────────────────
exports.getPendingApprovals = async (req, res) => {
  const { userRole, userId } = req;

  const stageMap = {
    'Plant Head':       'Pending Plant Head',
    'Mechanical Team':  'Pending Department',
    'Electrical Team':  'Pending Department',
    'Purchase Team':    'Pending Purchase',
    'GST Team':         'Pending GST',
    'Store Head':       'Pending Store Head',
    'IT Team':          'Pending IT Final Approval',
    'Super Admin':      null,
  };

  try {
    let results;
    if (userRole === 'Super Admin' || userRole === 'IT Team') {
      // IT Team sees ALL requests (admin view) plus their own approval queue
      results = await db.query(
        `SELECT mr.*, u.full_name as requester_name, u.email as requester_email
         FROM material_requests mr
         LEFT JOIN users u ON mr.requester_id = u.id
         ORDER BY mr.created_at DESC LIMIT 100`
      );
    } else if (userRole === 'User') {
      results = await db.query(
        `SELECT mr.*, u.full_name as requester_name, u.email as requester_email
         FROM material_requests mr
         LEFT JOIN users u ON mr.requester_id = u.id
         WHERE mr.requester_id = ? AND mr.status = 'Sent Back To User'
         ORDER BY mr.created_at DESC`,
        [userId]
      );
    } else {
      const statusFilter = stageMap[userRole];
      if (!statusFilter) return res.status(200).json([]);

      // Mechanical/Electrical teams only see requests for their department
      if (['Mechanical Team', 'Electrical Team'].includes(userRole)) {
        const deptMap = { 'Mechanical Team': 'Mechanical', 'Electrical Team': 'Electrical' };
        const dept = deptMap[userRole];
        results = await db.query(
          `SELECT mr.*, u.full_name as requester_name, u.email as requester_email
           FROM material_requests mr
           LEFT JOIN users u ON mr.requester_id = u.id
           WHERE mr.status = ? AND mr.department = ?
           ORDER BY mr.pending_since ASC`,
          [statusFilter, dept]
        );
      } else {
        results = await db.query(
          `SELECT mr.*, u.full_name as requester_name, u.email as requester_email
           FROM material_requests mr
           LEFT JOIN users u ON mr.requester_id = u.id
           WHERE mr.status = ?
           ORDER BY mr.pending_since ASC`,
          [statusFilter]
        );
      }
    }

    // Enrich each result with current approver details from users table
    const enriched = await Promise.all((Array.isArray(results) ? results : []).map(async (r) => {
      const approver = await resolveCurrentApprover(r);
      return { ...r, ...approver };
    }));

    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resolve current approver details for a request row
async function resolveCurrentApprover(r) {
  const stageRoleMap = {
    'Plant Head':             'Plant Head',
    'Department':             r.department ? getDeptRole(r.department) : null,
    'Purchase Team':          'Purchase Team',
    'GST Team':               'GST Team',
    'Store Head':             'Store Head',
    'IT Team':                'IT Team',
  };
  const role = stageRoleMap[r.current_stage];
  if (!role) return { current_approver_name: r.assigned_approver || r.current_stage, current_approver_email: '', current_approver_role: r.current_stage };

  const approver = await getApproverForRole(role);
  return {
    current_approver_name:  approver.full_name,
    current_approver_email: approver.email,
    current_approver_role:  approver.role,
  };
}

// ── GET /workflow/:id/history ────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const history = await db.query(
      `SELECT ah.*, u.full_name as approver_name, u.role as approver_role, u.email as approver_email
       FROM approval_history ah
       LEFT JOIN users u ON ah.approver_id = u.id
       WHERE ah.request_id = ?
       ORDER BY ah.created_at ASC`,
      [id]
    );
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /workflow/:id/audit ──────────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await db.query(
      `SELECT * FROM audit_logs WHERE request_id = ? ORDER BY created_at ASC`,
      [id]
    );
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /workflow/notifications ──────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  const { userId } = req;
  try {
    const notifs = await db.query(
      `SELECT n.*, mr.req_number, mr.description as mat_desc
       FROM notifications n
       LEFT JOIN material_requests mr ON n.request_id = mr.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 30`,
      [userId]
    );
    res.status(200).json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /workflow/notifications/read ──────────────────────────────────────
exports.markNotificationsRead = async (req, res) => {
  const { userId } = req;
  try {
    await db.execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
    res.status(200).json({ message: 'Marked read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /workflow/:id/detail ─────────────────────────────────────────────────
exports.getRequestDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [request] = await db.query(
      `SELECT mr.*, u.full_name as requester_name, u.email as requester_email
       FROM material_requests mr
       LEFT JOIN users u ON mr.requester_id = u.id
       WHERE mr.id = ?`,
      [id]
    );
    if (!request) return res.status(404).json({ error: 'Not found' });

    const approver = await resolveCurrentApprover(request);
    res.status(200).json({ ...request, ...approver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /workflow/:id/approve ───────────────────────────────────────────────
exports.handleApproval = async (req, res) => {
  const { id } = req.params;
  const { action, comments, editData } = req.body;
  const { userId, userRole } = req;

  const t = await sequelize.transaction();
  try {
    const [request] = await db.query('SELECT * FROM material_requests WHERE id = ?', [id]);
    if (!request) { await t.rollback(); return res.status(404).json({ error: 'Request not found' }); }

    const [actor] = await db.query('SELECT full_name FROM users WHERE id = ?', [userId]);
    const actorName = actor?.full_name || 'Unknown';

    let nextStatus = request.status;
    let currentStage = request.current_stage;
    let fieldsChanged = null;
    let nextApproverRole = null;

    // ── Role + stage validation ──────────────────────────────────────────────
    const allowedMap = {
      'Plant Head':       'Pending Plant Head',
      'Mechanical Team':  'Pending Department',
      'Electrical Team':  'Pending Department',
      'Purchase Team':    'Pending Purchase',
      'GST Team':         'Pending GST',
      'Store Head':       'Pending Store Head',
      'IT Team':          'Pending IT Final Approval',
      'Super Admin':      null,
    };

    const expectedStatus = allowedMap[userRole];
    // IT Team can also act as admin (null = no restriction)
    const isAdmin = userRole === 'Super Admin' || userRole === 'IT Team';
    if (!isAdmin && expectedStatus && request.status !== expectedStatus) {
      if (!(userRole === 'IT Team' && request.status === 'Sent Back To User' && request.it_sendback_to_user)) {
        await t.rollback();
        return res.status(403).json({ error: `Not authorized for this stage. Expected: ${expectedStatus}, Got: ${request.status}` });
      }
    }

    // ── Handle field edits (GST / Store Head) ────────────────────────────────
    if (editData && (userRole === 'GST Team' || userRole === 'Store Head' || isAdmin)) {
      const allowedEdit = EDITABLE_FIELDS[userRole] || [];
      const changes = [];

      for (const field of allowedEdit) {
        if (editData[field] !== undefined && editData[field] !== request[field]) {
          changes.push({ field, old: request[field], new: editData[field] });
          await insertAuditLog(t, {
            request_id: id, actor_id: userId, actor_name: actorName, actor_role: userRole,
            action: 'FIELD_EDIT', field_name: field,
            old_value: request[field], new_value: editData[field],
            reason: comments || 'Edited during approval'
          });
        }
      }

      if (changes.length > 0) {
        fieldsChanged = JSON.stringify(changes);
        const setClauses = allowedEdit.filter(f => editData[f] !== undefined).map(f => `${f} = ?`).join(', ');
        const vals = allowedEdit.filter(f => editData[f] !== undefined).map(f => editData[f]);
        if (setClauses) {
          await sequelize.query(
            `UPDATE material_requests SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            { replacements: [...vals, id], transaction: t }
          );
        }
      }
    }

    // ── Material type change rerouting (Store Head / IT Team) ────────────────
    // Runs only on APPROVE when material_type was edited in this same request.
    // If the new type requires a dept team that hasn't reviewed yet, reroute there
    // and store resume_after_dept so the dept team's approval returns here.
    let reroutedToDept = false;
    if (action === 'APPROVE' && editData && editData.material_type) {
      const oldType = request.material_type;
      const newType = editData.material_type;
      const canReroute = userRole === 'Store Head' || userRole === 'IT Team';

      if (canReroute && newType !== oldType) {
        const newDept    = MATTYPE_DEPT_MAP[newType];   // e.g. 'Mechanical' or 'Electrical' or undefined
        const deptRole   = newDept ? getDeptRole(newDept) : null;

        if (deptRole) {
          // Update department on the request to match new material type
          await sequelize.query(
            `UPDATE material_requests SET department = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            { replacements: [newDept, id], transaction: t }
          );

          // Store which stage to resume after dept approval
          const resumeStage = userRole; // 'Store Head' or 'IT Team'
          // Ensure column exists in SQLite schema; if not present, add safely.
          // (Older DBs may not have this column yet.)
          await sequelize.query(
            `PRAGMA table_info(material_requests)`,
            { type: sequelize.constructor.QueryTypes.SELECT, transaction: t }
          );
          // Note: we cannot conditionally ALTER within a single query; handled in initDB.
          await sequelize.query(
            `UPDATE material_requests SET resume_after_dept = ? WHERE id = ?`,
            { replacements: [resumeStage, id], transaction: t }
          );

          // Reroute to dept team
          nextStatus      = 'Pending Department';
          currentStage    = 'Department';
          nextApproverRole = deptRole;
          reroutedToDept  = true;

          // Audit log
          await insertAuditLog(t, {
            request_id: id, actor_id: userId, actor_name: actorName, actor_role: userRole,
            action: 'WORKFLOW_RESTART', field_name: 'material_type',
            old_value: oldType, new_value: newType,
            reason: `Workflow restarted due to material type change: ${oldType} → ${newType}. Rerouted to ${deptRole}.`
          });

          // History entry
          await insertHistory(t, {
            request_id: id, approver_id: userId,
            stage: request.current_stage,
            action: 'WORKFLOW_RESTART',
            comments: `Material type changed from ${oldType} to ${newType}. Workflow restarted — awaiting ${deptRole}.`,
            fields_changed: JSON.stringify([{ field: 'material_type', old: oldType, new: newType }]),
            is_restart: 1
          });

          await notifyRoleUsers(t, deptRole, id, 'APPROVAL_NEEDED',
            `${request.req_number}: material type changed to ${newType} by ${actorName} (${userRole}). Dept review required before continuing.`);
        }
      }
    }

    // ── Determine next status ────────────────────────────────────────────────
    if (reroutedToDept) {
      // Already handled above — skip normal routing
    } else if (action === 'APPROVE') {

      if (userRole === 'Plant Head' || (userRole === 'Super Admin' && request.status === 'Pending Plant Head')) {
        // ── KEY ROUTING LOGIC ──────────────────────────────────────────────
        // Mechanical (ZMIS) → Mechanical Team (Deepak Sir)
        // Electrical (ZEIS) → Electrical Team (Pradeep Sir)
        // All others        → skip dept → Purchase Team directly
        if (needsDeptApproval(request.department)) {
          nextStatus = 'Pending Department';
          currentStage = 'Department';
          nextApproverRole = getDeptRole(request.department);
          await notifyRoleUsers(t, nextApproverRole, id, 'APPROVAL_NEEDED',
            `${request.req_number} approved by Plant Head. Awaiting ${nextApproverRole} review.`);
        } else {
          // Non-Mechanical/Electrical → skip dept stage entirely
          nextStatus = 'Pending Purchase';
          currentStage = 'Purchase Team';
          nextApproverRole = 'Purchase Team';
          await notifyRoleUsers(t, 'Purchase Team', id, 'APPROVAL_NEEDED',
            `${request.req_number} approved by Plant Head. No department review required — forwarded to Purchase Team.`);
        }

      } else if (['Mechanical Team', 'Electrical Team'].includes(userRole)) {
        // Check if this dept approval was triggered by a mid-workflow reroute
        const resumeStage = request.resume_after_dept; // 'Store Head' | 'IT Team' | null
        if (resumeStage === 'Store Head') {
          nextStatus       = 'Pending Store Head';
          currentStage     = 'Store Head';
          nextApproverRole = 'Store Head';
          // Clear resume flag
          await sequelize.query(
            `UPDATE material_requests SET resume_after_dept = NULL WHERE id = ?`,
            { replacements: [id], transaction: t }
          );
          await notifyRoleUsers(t, 'Store Head', id, 'APPROVAL_NEEDED',
            `${request.req_number} dept review complete (${userRole}). Returning to Store Head.`);
        } else if (resumeStage === 'IT Team') {
          nextStatus       = 'Pending IT Final Approval';
          currentStage     = 'IT Team';
          nextApproverRole = 'IT Team';
          await sequelize.query(
            `UPDATE material_requests SET resume_after_dept = NULL WHERE id = ?`,
            { replacements: [id], transaction: t }
          );
          await notifyRoleUsers(t, 'IT Team', id, 'APPROVAL_NEEDED',
            `${request.req_number} dept review complete (${userRole}). Returning to IT Team.`);
        } else {
          // Normal flow: dept approval → Purchase Team
          nextStatus       = 'Pending Purchase';
          currentStage     = 'Purchase Team';
          nextApproverRole = 'Purchase Team';
          await notifyRoleUsers(t, 'Purchase Team', id, 'APPROVAL_NEEDED',
            `${request.req_number} approved by ${actorName} (${userRole}). Awaiting Purchase Team.`);
        }

      } else if (userRole === 'Purchase Team') {
        nextStatus = 'Pending GST';
        currentStage = 'GST Team';
        nextApproverRole = 'GST Team';
        await notifyRoleUsers(t, 'GST Team', id, 'APPROVAL_NEEDED',
          `${request.req_number} forwarded by Purchase Team. Awaiting GST review.`);

      } else if (userRole === 'GST Team') {
        nextStatus = 'Pending Store Head';
        currentStage = 'Store Head';
        nextApproverRole = 'Store Head';
        await notifyRoleUsers(t, 'Store Head', id, 'APPROVAL_NEEDED',
          `${request.req_number} reviewed by GST Team. Awaiting Store Head.`);

      } else if (userRole === 'Store Head') {
        nextStatus = 'Pending IT Final Approval';
        currentStage = 'IT Team';
        nextApproverRole = 'IT Team';
        await notifyRoleUsers(t, 'IT Team', id, 'APPROVAL_NEEDED',
          `${request.req_number} approved by Store Head. Awaiting IT Final Approval.`);

      } else if (userRole === 'IT Team') {
        nextStatus = 'Approved';
        currentStage = 'Completed';
        nextApproverRole = null;
        await createNotification(t, {
          user_id: request.requester_id, request_id: id,
          type: 'APPROVED', message: `Your request ${request.req_number} has been FULLY APPROVED!`
        });
        await notifyRoleUsers(t, 'Super Admin', id, 'APPROVED',
          `${request.req_number} fully approved by IT Team.`);

      } else if (isAdmin) {
        nextStatus = 'Approved';
        currentStage = 'Completed';
        nextApproverRole = null;
      }
    } else if (action === 'SEND_BACK') {
      // All approvers: store which stage sent it back so resubmit returns to EXACT same stage
      const sendbackStageKey = request.current_stage; // e.g. 'Store Head', 'GST Team', 'IT Team'
      const sendbackStatusKey = request.status;       // e.g. 'Pending Store Head'

      if (userRole === 'IT Team') {
        nextStatus = 'Sent Back To User';
        currentStage = 'User Correction';
        nextApproverRole = null;
        // Always save sendback_stage as 'IT Team' — never 'Completed'
        await sequelize.query(
          `UPDATE material_requests SET it_sendback_to_user = 1, sendback_stage = 'IT Team', sendback_role = 'IT Team' WHERE id = ?`,
          { replacements: [id], transaction: t }
        );
        await createNotification(t, {
          user_id: request.requester_id, request_id: id,
          type: 'SENT_BACK', message: `IT Team sent back ${request.req_number} for corrections. Please update and resubmit.`
        });
      } else {
        nextStatus = 'Sent Back For Changes';
        currentStage = 'User Correction';
        nextApproverRole = null;
        // Store the exact stage/status to return to on resubmit
        await sequelize.query(
          `UPDATE material_requests SET sendback_stage = ?, sendback_role = ?, it_sendback_to_user = 0 WHERE id = ?`,
          { replacements: [sendbackStageKey, userRole, id], transaction: t }
        );
        await createNotification(t, {
          user_id: request.requester_id, request_id: id,
          type: 'SENT_BACK', message: `${request.req_number} sent back by ${actorName} (${userRole}). Reason: ${comments || 'See comments'}`
        });
      }

    } else if (action === 'REJECT') {
      nextStatus = 'Rejected';
      currentStage = 'Rejected';
      nextApproverRole = null;
      await createNotification(t, {
        user_id: request.requester_id, request_id: id,
        type: 'REJECTED', message: `Your request ${request.req_number} was rejected by ${actorName}. Reason: ${comments || 'No reason provided'}`
      });

    } else if (action === 'RESUBMIT') {
      // Route back to the EXACT stage that sent it back — never restart full workflow
      // For IT Team sendbacks, it_sendback_to_user=1 is the authoritative flag
      let sbStage = request.sendback_stage;
      if (!sbStage || sbStage === 'Completed' || sbStage === 'User Correction') {
        sbStage = request.it_sendback_to_user ? 'IT Team' : null;
      }
      if (!sbStage) {
        await t.rollback();
        return res.status(400).json({ error: 'No sendback stage recorded. Cannot resubmit.' });
      }

      // Comprehensive stage → status + role mapping
      const stageToStatus = {
        'Plant Head':    { status: 'Pending Plant Head',        role: 'Plant Head' },
        'Department':    { status: 'Pending Department',        role: request.department ? getDeptRole(request.department) : null },
        'Purchase Team': { status: 'Pending Purchase',          role: 'Purchase Team' },
        'GST Team':      { status: 'Pending GST',               role: 'GST Team' },
        'Store Head':    { status: 'Pending Store Head',        role: 'Store Head' },
        'IT Team':       { status: 'Pending IT Final Approval', role: 'IT Team' },
        // Role-name aliases (sendback_role stored instead of stage)
        'Mechanical Team': { status: 'Pending Department',     role: 'Mechanical Team' },
        'Electrical Team': { status: 'Pending Department',     role: 'Electrical Team' },
      };
      const mapping = stageToStatus[sbStage];
      if (!mapping) {
        await t.rollback();
        return res.status(400).json({ error: `Unknown sendback stage: ${sbStage}` });
      }

      nextStatus = mapping.status;
      currentStage = sbStage;
      nextApproverRole = mapping.role;

      // Clear sendback flags
      await sequelize.query(
        `UPDATE material_requests SET it_sendback_to_user = 0, sendback_stage = NULL, sendback_role = NULL WHERE id = ?`,
        { replacements: [id], transaction: t }
      );

      await notifyRoleUsers(t, nextApproverRole, id, 'RESUBMITTED',
        `${request.req_number} corrected by user and resubmitted. Awaiting ${nextApproverRole} review.`);
    }

    // Resolve the next approver's display name
    let assignedApproverName = request.assigned_approver;
    if (nextApproverRole) {
      const nextApprover = await getApproverForRole(nextApproverRole);
      assignedApproverName = nextApprover.full_name;
    } else if (nextStatus === 'Approved' || nextStatus === 'Rejected' || currentStage === 'Completed') {
      assignedApproverName = null;
    }

    // ── Update request ───────────────────────────────────────────────────────
    await sequelize.query(
      `UPDATE material_requests SET status = ?, current_stage = ?, assigned_approver = ?, pending_since = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      { replacements: [nextStatus, currentStage, assignedApproverName, id], transaction: t }
    );

    await insertHistory(t, {
      request_id: id, approver_id: userId,
      stage: request.current_stage || request.status,
      action, comments, fields_changed: fieldsChanged, is_restart: reroutedToDept ? 1 : 0
    });

    await insertAuditLog(t, {
      request_id: id, actor_id: userId, actor_name: actorName, actor_role: userRole,
      action, reason: comments || null
    });

    await t.commit();
    res.status(200).json({ message: 'Workflow processed', status: nextStatus, stage: currentStage, restarted: reroutedToDept });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ── GET /workflow/all ────────────────────────────────────────────────────────
exports.getAllRequests = async (req, res) => {
  const { search, status, stage } = req.query;
  try {
    let sql = `SELECT mr.*, u.full_name as requester_name
               FROM material_requests mr
               LEFT JOIN users u ON mr.requester_id = u.id
               WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (mr.req_number LIKE ? OR mr.description LIKE ? OR mr.material_type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { sql += ' AND mr.status = ?'; params.push(status); }
    if (stage)  { sql += ' AND mr.current_stage = ?'; params.push(stage); }
    sql += ' ORDER BY mr.updated_at DESC LIMIT 200';
    const results = await db.query(sql, params);
    res.status(200).json(Array.isArray(results) ? results : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
