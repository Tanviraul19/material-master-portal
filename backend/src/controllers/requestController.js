'use strict';
const db = require('../config/db');
const { normalizeDescription, similarityScore, DUPLICATE_THRESHOLD } = require('../utils/searchHelper');
const emailService = require('../utils/emailService');

const VALUATION_MAPPING = {
  'ZMIS': { department: 'Mechanical', category: 'M', class: 'ZMID' },
  'ZEIS': { department: 'Electrical', category: 'E', class: 'ZEID' },
  'ZCOM': { department: 'Consumable', category: 'C', class: 'ZCOD' },
  'ZPAC': { department: '-',          category: '-', class: 'ZPAC' },
  'ZPRT': { department: 'Production', category: 'T', class: 'ZPRD' },
};

// ── POST /requests ────────────────────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  const {
    material_type, plant, storage_location, description,
    long_description, uom, purchase_group, material_group, control_code
  } = req.body;

  const requester_id = req.userId;
  const req_number   = `MMR-${Date.now()}`;
  const mapping      = VALUATION_MAPPING[material_type?.toUpperCase()] || { department: '-', category: '-', class: '-' };

  try {
    // ── Duplicate check ───────────────────────────────────────────────────
    const normDesc = normalizeDescription(description);
    const [exactInRequests] = await db.query(
      'SELECT id FROM material_requests WHERE description IS NOT NULL LIMIT 500'
    ).then(rows => [rows.filter(r => normalizeDescription(r.description) === normDesc)]);

    const exactInMaster = await db.query(
      'SELECT id FROM material_descriptions WHERE normalized_key = ? LIMIT 1', [normDesc]
    );
    if ((exactInRequests && exactInRequests.length > 0) || exactInMaster.length > 0) {
      return res.status(409).json({ error: 'Duplicate description detected. Request blocked.' });
    }

    // ── Get Plant Head ────────────────────────────────────────────────────
    const [plantHeadUser] = await db.query(
      `SELECT id, full_name, email, personal_email FROM users WHERE role = 'Plant Head' AND is_active = TRUE AND (assigned_plants IS NULL OR assigned_plants = '' OR assigned_plants LIKE ?) LIMIT 1`,
      [`%${plant}%`]
    );
    const assignedApprover = plantHeadUser ? plantHeadUser.full_name : 'Plant Head';

    // ── Insert request ────────────────────────────────────────────────────
    await db.execute(
      `INSERT INTO material_requests
        (req_number, requester_id, material_type, plant, storage_location, material_name, description,
         long_description, uom, purchase_group, material_group, control_code, valuation_category,
         valuation_class, department, status, current_stage, assigned_approver, pending_since)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [req_number, requester_id, material_type, plant, storage_location, description, description,
       long_description, uom, purchase_group, material_group, control_code, mapping.category,
       mapping.class, mapping.department, 'Pending Plant Head', 'Plant Head', assignedApprover]
    );

    const [newReq] = await db.query('SELECT * FROM material_requests WHERE req_number = ?', [req_number]);

    // ── Emails (awaited — reliable on Render) ────────────────────────────────
    // 1. Confirm to requester — use personal_email (real inbox) if available
    const [requester] = await db.query('SELECT email, personal_email, full_name FROM users WHERE id = ?', [requester_id]);
    const requesterEmailTarget = requester?.personal_email || requester?.email;
    if (requesterEmailTarget) {
      try {
        await emailService.sendRequestCreatedEmail(requesterEmailTarget, newReq);
        console.log(`[Email] ✅ Request confirmation sent to: ${requesterEmailTarget}`);
      } catch (e) { console.error('[Email] sendRequestCreatedEmail error:', e.message); }
    }

    // 2. Notify Plant Head — use personal_email if available
    const phEmailTarget = plantHeadUser?.personal_email || plantHeadUser?.email;
    if (phEmailTarget) {
      try {
        await emailService.sendWorkflowStageEmail(phEmailTarget, 'Plant Head', newReq);
        console.log(`[Email] ✅ Plant Head notified: ${phEmailTarget}`);
      } catch (e) { console.error('[Email] sendWorkflowStageEmail (Plant Head) error:', e.message); }
    }

    res.status(201).json(newReq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /requests ─────────────────────────────────────────────────────────────
exports.getRequests = async (req, res) => {
  const { search, status } = req.query;
  const userId   = req.userId;
  const userRole = req.userRole;

  try {
    let sql = `SELECT mr.*,
      ru.full_name AS requester_name,
      (SELECT ah.comments FROM approval_history ah WHERE ah.request_id = mr.id AND ah.action = 'SEND_BACK' ORDER BY ah.created_at DESC LIMIT 1) AS sendback_reason,
      (SELECT sb_u.full_name FROM approval_history sb_ah LEFT JOIN users sb_u ON sb_ah.approver_id = sb_u.id WHERE sb_ah.request_id = mr.id AND sb_ah.action = 'SEND_BACK' ORDER BY sb_ah.created_at DESC LIMIT 1) AS sendback_by,
      (SELECT sb_u2.role FROM approval_history sb_ah2 LEFT JOIN users sb_u2 ON sb_ah2.approver_id = sb_u2.id WHERE sb_ah2.request_id = mr.id AND sb_ah2.action = 'SEND_BACK' ORDER BY sb_ah2.created_at DESC LIMIT 1) AS sendback_role,
      (SELECT sb_ah3.stage FROM approval_history sb_ah3 WHERE sb_ah3.request_id = mr.id AND sb_ah3.action = 'SEND_BACK' ORDER BY sb_ah3.created_at DESC LIMIT 1) AS sendback_stage,
      (SELECT sb_ah4.created_at FROM approval_history sb_ah4 WHERE sb_ah4.request_id = mr.id AND sb_ah4.action = 'SEND_BACK' ORDER BY sb_ah4.created_at DESC LIMIT 1) AS sendback_at
    FROM material_requests mr
    LEFT JOIN users ru ON mr.requester_id = ru.id
    WHERE 1=1`;
    const params = [];

    if (userRole !== 'Super Admin' && userRole !== 'IT Team' && userRole !== 'Admin') {
      sql += ' AND mr.requester_id = ?';
      params.push(userId);
    }
    if (search) {
      sql += ' AND (mr.req_number LIKE ? OR mr.material_name LIKE ? OR mr.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { sql += ' AND mr.status = ?'; params.push(status); }
    sql += ' ORDER BY mr.created_at DESC';

    const results = await db.query(sql, params);
    res.status(200).json(Array.isArray(results) ? results : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /requests/:id/resubmit ────────────────────────────────────────────────
exports.resubmitRequest = async (req, res) => {
  const { id } = req.params;
  const { material_type, plant, storage_location, description, long_description, uom, purchase_group, material_group, control_code } = req.body;
  const userId = req.userId;

  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const [request] = await db.query('SELECT * FROM material_requests WHERE id = ?', [id]);
    if (!request) { await t.rollback(); return res.status(404).json({ error: 'Request not found' }); }

    if (request.requester_id !== userId) {
      await t.rollback();
      return res.status(403).json({ error: 'Only the original requester can resubmit.' });
    }

    const editableStatuses = ['Sent Back For Changes', 'Sent Back To User'];
    if (!editableStatuses.includes(request.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Request is not in an editable state. Current: ${request.status}` });
    }

    await sequelize.query(
      `UPDATE material_requests SET
        material_type = ?, plant = ?, storage_location = ?,
        description = ?, long_description = ?, uom = ?,
        purchase_group = ?, material_group = ?, control_code = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      { replacements: [
          material_type || request.material_type, plant || request.plant,
          storage_location || request.storage_location,
          description, long_description, uom, purchase_group, material_group, control_code, id
        ], transaction: t }
    );

    let sbStage = request.sendback_stage;
    if (!sbStage || sbStage === 'Completed' || sbStage === 'User Correction') {
      sbStage = request.it_sendback_to_user ? 'IT Team' : null;
    }
    if (!sbStage) { await t.rollback(); return res.status(400).json({ error: 'No sendback stage recorded.' }); }

    // If user changed material_type on resubmit, update department accordingly
    const newMaterialType = material_type || request.material_type;
    // Full mapping - always update department based on new material type
    const FULL_MATTYPE_DEPT = {
      'ZMIS': 'Mechanical', 'ZEIS': 'Electrical',
      'ZCOM': 'Consumable', 'ZPAC': '-', 'ZPRT': 'Production',
      'ZNVA': '-', 'ZNVM': '-', 'ZRET': '-',
    };
    // Use new material type's department, NOT the old one
    const newDepartment = FULL_MATTYPE_DEPT[newMaterialType?.toUpperCase()] !== undefined
      ? FULL_MATTYPE_DEPT[newMaterialType?.toUpperCase()]
      : request.department;

    // Update department on request if material_type changed
    if (newMaterialType !== request.material_type || newDepartment !== request.department) {
      await sequelize.query(
        `UPDATE material_requests SET department = ?, material_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        { replacements: [newDepartment, newMaterialType, id], transaction: t }
      );
    }

    const DEPT_ROLE_MAP = { 'Mechanical': 'Mechanical Team', 'Electrical': 'Electrical Team' };

    // If sent back from Dept stage, route to correct dept team based on NEW material type
    // e.g. user changed ZMIS→ZCOM (Consumable) → skip dept → go to Purchase Team
    // e.g. user changed ZMIS→ZEIS (Electrical) → go to Electrical Team (Pradeep Sir)
    let resolvedStage = sbStage;
    if (sbStage === 'Department' || sbStage === 'Mechanical Team' || sbStage === 'Electrical Team') {
      const newDeptRole = DEPT_ROLE_MAP[newDepartment];
      if (!newDeptRole) {
        // New material type has no dept approver (e.g. ZCOM) — skip dept, go to Purchase
        resolvedStage = 'Purchase Team';
      } else {
        // Route to correct dept team based on new material type
        resolvedStage = newDeptRole;
      }
    }

    const stageToStatus = {
      'Plant Head':      { status: 'Pending Plant Head',        role: 'Plant Head' },
      'Department':      { status: 'Pending Department',        role: DEPT_ROLE_MAP[newDepartment] || 'Purchase Team' },
      'Purchase Team':   { status: 'Pending Purchase',          role: 'Purchase Team' },
      'GST Team':        { status: 'Pending GST',               role: 'GST Team' },
      'Store Head':      { status: 'Pending Store Head',        role: 'Store Head' },
      'IT Team':         { status: 'Pending IT Final Approval', role: 'IT Team' },
      'Mechanical Team': { status: 'Pending Department',        role: 'Mechanical Team' },
      'Electrical Team': { status: 'Pending Department',        role: 'Electrical Team' },
    };
    const mapping = stageToStatus[resolvedStage];
    if (!mapping) { await t.rollback(); return res.status(400).json({ error: `Unknown sendback stage: ${resolvedStage}` }); }

    const nextStatus       = mapping.status;
    const nextStage        = resolvedStage;
    const nextApproverRole = mapping.role;

    let query = `SELECT full_name, email, personal_email FROM users WHERE role = ? AND is_active = TRUE`;
    let replacements = [nextApproverRole];
    if (nextApproverRole === 'Plant Head') {
      query += ` AND (assigned_plants IS NULL OR assigned_plants = '' OR assigned_plants LIKE ?)`;
      replacements.push(`%${plant || request.plant}%`);
    }
    query += ` LIMIT 1`;
    const [approverUser] = await db.query(query, replacements);
    const assignedApprover = approverUser ? approverUser.full_name : nextApproverRole;

    await sequelize.query(
      `UPDATE material_requests SET status = ?, current_stage = ?, assigned_approver = ?,
        pending_since = CURRENT_TIMESTAMP, it_sendback_to_user = 0,
        sendback_stage = NULL, sendback_role = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      { replacements: [nextStatus, nextStage, assignedApprover, id], transaction: t }
    );

    await sequelize.query(
      `INSERT INTO approval_history (request_id, approver_id, stage, action, comments) VALUES (?, ?, ?, 'RESUBMIT', 'User edited and resubmitted.')`,
      { replacements: [id, userId, 'User Correction'], transaction: t }
    );

    const [actor] = await db.query('SELECT full_name FROM users WHERE id = ?', [userId]);
    await sequelize.query(
      `INSERT INTO audit_logs (request_id, actor_id, actor_name, actor_role, action, reason) VALUES (?, ?, ?, 'User', 'RESUBMIT', 'User edited and resubmitted.')`,
      { replacements: [id, userId, actor?.full_name || 'User'], transaction: t }
    );

    const notifyUsers = await sequelize.query(
      `SELECT id FROM users WHERE role = ? AND is_active = TRUE`,
      { replacements: [nextApproverRole], type: sequelize.constructor.QueryTypes.SELECT }
    );
    for (const u of notifyUsers) {
      await sequelize.query(
        `INSERT INTO notifications (user_id, request_id, type, message) VALUES (?, ?, 'RESUBMITTED', ?)`,
        { replacements: [u.id, id, `${request.req_number} corrected and resubmitted. Awaiting your review.`], transaction: t }
      );
    }

    await t.commit();

    // ── Post-commit emails (fire-and-forget) ─────────────────────────────
    db.query('SELECT * FROM material_requests WHERE id = ?', [id]).then(([freshReq]) => {
      if (!freshReq) return;
      if (approverUser?.email) {
        emailService.sendWorkflowStageEmail(approverUser.email, nextApproverRole, freshReq)
          .catch(e => console.error('[Email] sendWorkflowStageEmail (resubmit) error:', e.message));
      }
      db.query('SELECT email FROM users WHERE id = ?', [userId]).then(([reqUser]) => {
        if (reqUser?.email) {
          emailService.sendWorkflowActionEmail(
            reqUser.email, freshReq, 'RESUBMIT', 'System',
            actor?.full_name || 'User', 'Request corrected and resubmitted.', nextStatus
          ).catch(e => console.error('[Email] resubmit action email error:', e.message));
        }
      }).catch(() => {});
    }).catch(() => {});

    res.status(200).json({ message: 'Resubmitted successfully', status: nextStatus, stage: nextStage });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ── GET /requests/check-duplicate ────────────────────────────────────────────
exports.checkDuplicate = async (req, res) => {
  const { description } = req.query;
  if (!description) return res.status(400).json({ error: 'Description required' });
  try {
    const normInput = normalizeDescription(description);
    const all = await db.query('SELECT req_number, description FROM material_requests WHERE description IS NOT NULL');
    const matches = all
      .map(m => ({ ...m, similarity: similarityScore(normInput, normalizeDescription(m.description)) }))
      .filter(m => m.similarity >= DUPLICATE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
