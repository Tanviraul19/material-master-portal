'use strict';
/**
 * Material Master Portal — Email Service
 * Uses SendGrid HTTP API (port 443) — works on Render free plan
 * SMTP is blocked on Render; HTTP API is not.
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.EMAIL_PASS;
const FROM_EMAIL       = process.env.EMAIL_USER || 'materialmasterportal@gmail.com';
const FROM_NAME        = 'Material Master Portal';
const FRONTEND_URL     = process.env.FRONTEND_URL || 'https://material-master-frontend.onrender.com';

// ── Test Email Routing ────────────────────────────────────────────────────────
// Maps workflow roles → test inboxes (set via Render Environment Variables)
// Remove TEST_ variables from Render env to send to real DB emails in production
function getTestEmail(role, realEmail) {
  const testUser      = process.env.TEST_USER_EMAIL;
  const testAdmin     = process.env.TEST_ADMIN_EMAIL;
  const testApprover  = process.env.TEST_APPROVER_EMAIL;
  const testPlantDept = process.env.TEST_PLANT_DEPT_EMAIL;

  // If no TEST_ vars set — use real email (production mode)
  if (!testUser && !testAdmin && !testApprover && !testPlantDept) return realEmail;

  const r = String(role || '').toUpperCase().trim();
  if (r === 'USER')                                                          return testUser || realEmail;
  if (['IT TEAM', 'SUPER ADMIN', 'ADMIN'].includes(r))                      return testAdmin || realEmail;
  if (r === 'GST TEAM')                                                      return testApprover || realEmail;
  if (['PLANT HEAD','STORE HEAD','PURCHASE TEAM',
       'MECHANICAL TEAM','ELECTRICAL TEAM','DEPARTMENT'].includes(r))        return testPlantDept || realEmail;
  return realEmail;
}

if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
  console.log(`✅ [EmailService] SendGrid HTTP API ready — sender: ${FROM_EMAIL}`);
} else {
  console.warn('⚠️  [EmailService] SENDGRID_API_KEY not set or invalid. Emails will be skipped.');
}

// ── Core HTTP send via SendGrid REST API ──────────────────────────────────────
async function sendViaSendGrid(to, subject, html, role) {
  // Apply test email routing if TEST_ vars are set in environment
  const recipient = role ? getTestEmail(role, to) : to;
  to = recipient;
  if (!SENDGRID_API_KEY || !SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn(`[Email] Skipping — no valid SendGrid API key`);
    return null;
  }

  const body = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: subject,
    content: [{ type: 'text/html', value: html }],
  });

  try {
    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.sendgrid.com',
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.statusCode === 202) {
      console.log(`   ↳ [SENT ✓] HTTP 202 — to=${to} subject="${subject}"`);
      return result;
    } else {
      console.error(`   ↳ [ERROR] HTTP ${result.statusCode} — ${result.body}`);
      return null;
    }
  } catch (err) {
    console.error(`   ↳ [ERROR] SendGrid HTTP request failed: ${err.message}`);
    return null;
  }
}

// ── HTML Template ─────────────────────────────────────────────────────────────
function buildHtmlTemplate({ title, badgeText, badgeColor, contentHtml, actionLink, actionText }) {
  const accent = '#4f46e5';
  const brand  = '#1e1b4b';
  const brand2 = '#312e81';
  const border = '#e2e8f0';

  const badgeHtml = badgeText
    ? `<span style="display:inline-block;margin-top:14px;padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:#fff;background-color:${badgeColor || accent};">${badgeText}</span>`
    : '';

  const ctaHtml = actionLink
    ? `<div style="text-align:center;margin:36px 0 8px;">
         <a href="${actionLink}" target="_blank" style="display:inline-block;padding:14px 34px;background:linear-gradient(135deg,${accent} 0%,#4338ca 100%);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
           ${actionText || 'Open Portal'}
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid ${border};box-shadow:0 10px 30px -5px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,${brand} 0%,${brand2} 100%);padding:32px 40px;">
            <div style="font-size:20px;font-weight:800;color:#fff;text-transform:uppercase;">Viraj Profiles</div>
            <div style="font-size:11px;font-weight:600;color:#818cf8;letter-spacing:1px;text-transform:uppercase;margin-top:3px;">Material Master Portal</div>
            ${badgeHtml}
          </td>
        </tr>
        <tr><td style="padding:40px 40px 10px;">${contentHtml}${ctaHtml}</td></tr>
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid ${border};text-align:center;">
            <p style="margin:0;font-size:11.5px;color:#94a3b8;">
              Automated notification — Material Master Portal &nbsp;·&nbsp;
              <a href="${FRONTEND_URL}" style="color:${accent};text-decoration:none;">Access Portal</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
//  EXPORTED EMAIL TRIGGERS
// ═══════════════════════════════════════════════════════════

// 1. Admin creates new user
exports.sendUserCreatedEmail = async (personalEmail, fullName, tempPassword, workEmail) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  console.log(`\n📧 [Email] USER_CREATED → ${personalEmail}`);

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Welcome, ${fullName}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      An administrator has created your account on the <strong>Material Master Request &amp; Approval Portal</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">Your Login Credentials</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;width:38%;">Portal URL</td>
            <td style="padding:9px 0;font-size:13px;"><a href="${loginUrl}" style="color:#4f46e5;">${loginUrl}</a></td>
          </tr>
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Login Email</td>
            <td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:700;color:#0f172a;">${workEmail || personalEmail}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Temporary Password</td>
            <td style="padding:9px 0;font-size:16px;font-family:monospace;font-weight:800;color:#4f46e5;">${tempPassword}</td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">⚠️ Please change your password after first login.</p>
      </td></tr>
    </table>`;

  return sendViaSendGrid(
    personalEmail,
    'Material Master Portal — Your Account Has Been Created',
    buildHtmlTemplate({ title: 'Account Created', badgeText: 'New Account', badgeColor: '#10b981', contentHtml, actionLink: loginUrl, actionText: 'Login to Portal →' }),
    'USER'
  );
};

// 2. User submits new request
exports.sendRequestCreatedEmail = async (creatorEmail, request) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;
  console.log(`\n📧 [Email] REQUEST_CREATED → ${creatorEmail}`);

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Request Submitted!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      Your Material Master Creation Request has been registered and routed to <strong>Plant Head</strong> for review.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Request Number</td><td style="padding:8px 0;font-size:13px;font-family:monospace;font-weight:800;color:#4f46e5;">${request.req_number}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Description</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.description || '—'}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Material Type</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.material_type || '—'}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Plant</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.plant || '—'}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Status</td><td style="padding:8px 0;font-size:13px;font-weight:800;color:#d97706;">⏳ Pending Plant Head</td></tr>
        </table>
      </td></tr>
    </table>`;

  return sendViaSendGrid(
    creatorEmail,
    'Material Creation Request Submitted',
    buildHtmlTemplate({ title: 'Request Submitted', badgeText: 'Submitted', badgeColor: '#3b82f6', contentHtml, actionLink: portalUrl, actionText: 'Track Your Request →' }),
    'USER'
  );
};

// 3. Notify next approver
exports.sendWorkflowStageEmail = async (approverEmail, approverRole, request) => {
  const portalUrl = `${FRONTEND_URL}/approvals?highlight=${request.id}`;
  console.log(`\n📧 [Email] WORKFLOW_STAGE → ${approverEmail} (${approverRole})`);

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Action Required</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      A Material Master Request is pending your review as <strong>${approverRole}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Request Number</td><td style="padding:8px 0;font-size:13px;font-family:monospace;font-weight:800;color:#4f46e5;">${request.req_number}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Your Stage</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;">${approverRole}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Description</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.description || '—'}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Material Type</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.material_type || '—'}</td></tr>
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">✓ Approve</a></td>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">✕ Reject</a></td>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#fffbeb;border:1px solid #fde68a;color:#d97706;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">↩ Send Back</a></td>
      </tr>
    </table>`;

  return sendViaSendGrid(
    approverEmail,
    `Action Required: ${request.req_number} — Pending Your Review`,
    buildHtmlTemplate({ title: 'Action Required', badgeText: `Pending ${approverRole}`, badgeColor: '#f59e0b', contentHtml, actionLink: portalUrl, actionText: 'Review in Portal →' }),
    approverRole
  );
};

// 4. Notify requester of action taken
exports.sendWorkflowActionEmail = async (creatorEmail, request, action, actorRole, actorName, comments, newStatus, changedFields) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;
  console.log(`\n📧 [Email] WORKFLOW_ACTION (${action}) → ${creatorEmail}`);

  let badgeText = '', badgeColor = '#64748b', heading = '', alertBox = '';
  if (action === 'APPROVE') { badgeText = 'Approved'; badgeColor = '#10b981'; heading = `Approved by ${actorRole}`; }
  else if (action === 'SEND_BACK') { badgeText = 'Sent Back'; badgeColor = '#f59e0b'; heading = `Sent Back by ${actorRole}`; alertBox = `<div style="margin:16px 0;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:13px;color:#b45309;"><strong>Action Required:</strong> Please edit and resubmit your request.</div>`; }
  else if (action === 'REJECT') { badgeText = 'Rejected'; badgeColor = '#ef4444'; heading = `Rejected by ${actorRole}`; alertBox = `<div style="margin:16px 0;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;font-size:13px;color:#b91c1c;"><strong>Request Closed.</strong> This request has been permanently rejected.</div>`; }
  else { badgeText = action; heading = 'Workflow Update'; }

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">${heading}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Your request <strong>${request.req_number}</strong> has been reviewed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Actioned By</td><td style="padding:8px 0;font-size:13px;color:#0f172a;">${actorName || actorRole} (${actorRole})</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">New Status</td><td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;">${newStatus || action}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;">Remarks</td><td style="padding:8px 0;font-size:13px;color:#475569;font-style:italic;">"${comments || 'No remarks.'}"</td></tr>
        </table>
        ${alertBox}
        ${(changedFields && changedFields.length > 0) ? '<div style="margin:16px 0;padding:14px 18px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;"><div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#0369a1;margin-bottom:8px;border-bottom:1px solid #bae6fd;padding-bottom:5px;">Fields Modified by ' + actorRole + '</div><table width=\"100%\">' + changedFields.map(f => '<tr><td style="padding:4px 0;font-size:12px;font-weight:700;color:#64748b;width:35%;">' + f.field.replace(/_/g,' ').toUpperCase() + '</td><td style="font-size:12px;color:#ef4444;text-decoration:line-through;">' + (f.old||'—') + '</td><td style="padding:0 6px;font-size:12px;color:#94a3b8;">→</td><td style="font-size:12px;color:#16a34a;font-weight:700;">' + (f.new||'—') + '</td></tr>').join('') + '</table></div>' : ''}
      </td></tr>
    </table>`;

  return sendViaSendGrid(
    creatorEmail,
    `Update: ${request.req_number} — ${heading}`,
    buildHtmlTemplate({ title: heading, badgeText, badgeColor, contentHtml, actionLink: portalUrl, actionText: action === 'SEND_BACK' ? 'Edit & Resubmit →' : 'View Status →' }),
    'USER'
  );
};

// 5. Final approval
exports.sendFinalApprovalEmail = async (creatorEmail, request) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;
  console.log(`\n📧 [Email] FINAL_APPROVAL → ${creatorEmail}`);

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">&#127881; Request Fully Approved!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      Your request <strong>${request.req_number}</strong> has been <span style="color:#10b981;font-weight:800;">FULLY APPROVED</span> and is ready for SAP integration.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#166534;width:40%;">Request Number</td><td style="padding:8px 0;font-size:13px;font-family:monospace;font-weight:800;color:#14532d;">${request.req_number}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#166534;">Description</td><td style="padding:8px 0;font-size:13px;color:#14532d;">${request.description || '—'}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#166534;">Status</td><td style="padding:8px 0;font-size:13px;font-weight:800;color:#10b981;">&#10003; Completed</td></tr>
          ${request.material_code ? `<tr><td style="padding:8px 0;font-size:13px;font-weight:700;color:#166534;">SAP Material Code</td><td style="padding:8px 0;font-size:16px;font-family:monospace;font-weight:900;color:#1e40af;letter-spacing:1px;">${request.material_code}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>`;

  return sendViaSendGrid(
    creatorEmail,
    `Approved: ${request.req_number} — Completed Successfully`,
    buildHtmlTemplate({ title: 'Request Approved', badgeText: 'Fully Approved', badgeColor: '#10b981', contentHtml, actionLink: portalUrl, actionText: 'View Approved Material →' }),
    'USER'
  );
};
