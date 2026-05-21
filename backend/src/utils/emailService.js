'use strict';
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  Material Master Portal — Centralized Email Service
 * ═══════════════════════════════════════════════════════════════════════════════
 *  SAFE TO LOAD even if nodemailer is not installed.
 *  App will NEVER crash due to email failures.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Safe nodemailer require ───────────────────────────────────────────────────
// If nodemailer is missing (npm install not run yet), gracefully fall back
// to console-only logging instead of crashing the entire app.
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_e) {
  console.warn('⚠️  [EmailService] nodemailer not found. Run: cd backend && npm install');
  console.warn('    Emails will be logged to console only until nodemailer is installed.');
}

// ── Environment config ────────────────────────────────────────────────────────
const SMTP_HOST    = process.env.SMTP_HOST    || 'smtp.gmail.com';
const SMTP_PORT    = parseInt(process.env.SMTP_PORT || '587', 10);
const EMAIL_USER   = process.env.EMAIL_USER;
const EMAIL_PASS   = process.env.EMAIL_PASS;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── SMTP Transporter ──────────────────────────────────────────────────────────
let transporter = null;
try {
  if (nodemailer && EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    console.log(`✅ [EmailService] SMTP ready — sender: ${EMAIL_USER} via ${SMTP_HOST}:${SMTP_PORT}`);
  } else if (nodemailer && (!EMAIL_USER || !EMAIL_PASS)) {
    console.warn('⚠️  [EmailService] EMAIL_USER or EMAIL_PASS missing in .env — emails will be console-only.');
  }
} catch (initErr) {
  console.error('❌ [EmailService] SMTP init failed:', initErr.message);
  transporter = null;
}

// ── Test Email Role Mapping ───────────────────────────────────────────────────
// Maps workflow roles → test inboxes (configurable via .env)
function getRecipientEmail(role, dbEmail) {
  const testUser      = process.env.TEST_USER_EMAIL       || 'raulankesh96@gmail.com';
  const testAdmin     = process.env.TEST_ADMIN_EMAIL      || 'tanviraul196@gmail.com';
  const testApprover  = process.env.TEST_APPROVER_EMAIL   || 'tanviraul09@gmail.com';
  const testPlantDept = process.env.TEST_PLANT_DEPT_EMAIL || 'anushkadange5@gmail.com';

  const r = String(role || '').toUpperCase().trim();

  if (r === 'USER')                                                   return testUser;
  if (['IT TEAM', 'SUPER ADMIN', 'ADMIN'].includes(r))               return testAdmin;
  if (r === 'GST TEAM')                                               return testApprover;
  if (['PLANT HEAD', 'STORE HEAD', 'PURCHASE TEAM',
       'MECHANICAL TEAM', 'ELECTRICAL TEAM', 'DEPARTMENT'].includes(r)) return testPlantDept;

  return dbEmail || testApprover;
}

// ── HTML Email Template ───────────────────────────────────────────────────────
function buildHtmlTemplate({ title, badgeText, badgeColor, contentHtml, actionLink, actionText }) {
  const brand  = '#1e1b4b';
  const brand2 = '#312e81';
  const accent = '#4f46e5';
  const border = '#e2e8f0';

  const badgeHtml = badgeText
    ? `<span style="display:inline-block;margin-top:14px;padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:#fff;background-color:${badgeColor || accent};">${badgeText}</span>`
    : '';

  const ctaHtml = actionLink
    ? `<div style="text-align:center;margin:36px 0 8px;">
         <a href="${actionLink}" target="_blank" style="display:inline-block;padding:14px 34px;background:linear-gradient(135deg,${accent} 0%,#4338ca 100%);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
           ${actionText || 'Open Portal'}
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid ${border};box-shadow:0 10px 30px -5px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,${brand} 0%,${brand2} 100%);padding:32px 40px;">
            <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;text-transform:uppercase;">Viraj Profiles</div>
            <div style="font-size:11px;font-weight:600;color:#818cf8;letter-spacing:1px;text-transform:uppercase;margin-top:3px;">Material Master Portal</div>
            ${badgeHtml}
          </td>
        </tr>
        <tr><td style="padding:40px 40px 10px;">${contentHtml}${ctaHtml}</td></tr>
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid ${border};text-align:center;">
            <p style="margin:0 0 8px;font-size:11.5px;color:#94a3b8;line-height:1.6;">Automated workflow notification — Material Master Portal.<br>Do not reply to this email.</p>
            <p style="margin:0;font-size:11.5px;color:#94a3b8;">© 2026 Viraj Profiles Ltd. &nbsp;·&nbsp;
              <a href="${FRONTEND_URL}" style="color:${accent};text-decoration:none;font-weight:600;">Access Portal</a> &nbsp;·&nbsp;
              <a href="${FRONTEND_URL}/settings" style="color:${accent};text-decoration:none;font-weight:600;">Settings</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Core Send Wrapper ─────────────────────────────────────────────────────────
// NEVER throws. NEVER crashes the app. Always returns null on failure.
async function sendMailSafe(options) {
  try {
    const { role, to, subject, html, trigger } = options;
    const recipient = getRecipientEmail(role, to);

    console.log(`\n📧 [Email] trigger="${trigger}" | role="${role}" | db="${to}" | to="${recipient}"`);
    console.log(`   subject: "${subject}"`);

    if (!transporter) {
      console.warn(`   ↳ [SKIP] SMTP not ready — check EMAIL_USER/EMAIL_PASS in .env`);
      return null;
    }

    const info = await transporter.sendMail({
      from:    `"Material Master Portal" <${EMAIL_USER}>`,
      to:      recipient,
      subject: subject,
      html:    html,
    });

    console.log(`   ↳ [SENT ✓] messageId=${info.messageId} to=${recipient}`);
    return info;
  } catch (err) {
    console.error(`   ↳ [ERROR ✗] trigger="${options.trigger}": ${err.message}`);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTED EMAIL TRIGGERS
// ═════════════════════════════════════════════════════════════════════════════

// 1. Admin creates new user → welcome email with credentials
exports.sendUserCreatedEmail = async (userEmail, fullName, tempPassword) => {
  const loginUrl = `${FRONTEND_URL}/login`;

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Welcome, ${fullName}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      An administrator has created your account on the <strong>Material Master Request &amp; Approval Portal</strong>.
      Use the credentials below to sign in for the first time.
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#475569;">
      ⚠️ <strong>Important:</strong> Please change your password after your first login.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">Your Login Credentials</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;width:38%;">Portal URL</td>
            <td style="padding:9px 0;font-size:13px;"><a href="${loginUrl}" style="color:#4f46e5;font-weight:600;">${loginUrl}</a></td>
          </tr>
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Username / Email</td>
            <td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:700;color:#0f172a;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Temporary Password</td>
            <td style="padding:9px 0;font-size:16px;font-family:monospace;font-weight:800;color:#4f46e5;letter-spacing:1px;">${tempPassword}</td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">Go to <strong>Settings</strong> after login to set a new password.</p>
      </td></tr>
    </table>`;

  return sendMailSafe({
    to: userEmail, role: 'USER',
    subject: 'Material Master Portal — Your Account Has Been Created',
    trigger: 'USER_CREATED',
    html: buildHtmlTemplate({
      title: 'Your Account Has Been Created', badgeText: 'New Account', badgeColor: '#10b981',
      contentHtml, actionLink: loginUrl, actionText: 'Login to Portal →',
    }),
  });
};

// 2. User submits new request → confirmation email
exports.sendRequestCreatedEmail = async (creatorEmail, request) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Request Submitted!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      Your Material Master Creation Request has been registered and routed to <strong>Plant Head</strong> for review.
      You will receive email updates as it moves through each approval stage.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">Request Details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Request Number</td><td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:800;color:#4f46e5;">${request.req_number}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Description</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.description || request.material_name || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Material Type</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.material_type || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Plant / Storage</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.plant || '—'} / ${request.storage_location || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">UOM</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.uom || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Status</td><td style="padding:9px 0;font-size:13px;font-weight:800;color:#d97706;">⏳ Pending Plant Head</td></tr>
        </table>
      </td></tr>
    </table>`;

  return sendMailSafe({
    to: creatorEmail, role: 'USER',
    subject: 'Material Creation Request Submitted',
    trigger: 'REQUEST_CREATED',
    html: buildHtmlTemplate({
      title: 'Material Creation Request Submitted', badgeText: 'Submitted', badgeColor: '#3b82f6',
      contentHtml, actionLink: portalUrl, actionText: 'Track Your Request →',
    }),
  });
};

// 3. Notify next approver that request is in their queue
exports.sendWorkflowStageEmail = async (approverEmail, approverRole, request) => {
  const portalUrl = `${FRONTEND_URL}/approvals?highlight=${request.id}`;

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Action Required</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      A Material Master Creation Request is pending your review as <strong>${approverRole}</strong>.
      Please login and Approve, Reject, or Send Back with comments.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">Request Details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Request Number</td><td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:800;color:#4f46e5;">${request.req_number}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Your Role / Stage</td><td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f172a;">${approverRole}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Description</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.description || request.material_name || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Material Type</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.material_type || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Plant / S-Loc</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.plant || '—'} / ${request.storage_location || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">UOM</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.uom || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Purchase Group</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${request.purchase_group || '—'}</td></tr>
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">✓ Open to Approve</a></td>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">✕ Open to Reject</a></td>
        <td align="center" style="padding:0 5px;"><a href="${portalUrl}" target="_blank" style="display:inline-block;padding:11px 20px;background:#fffbeb;border:1px solid #fde68a;color:#d97706;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">↩ Send Back</a></td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">All actions must be performed inside the portal after login.</p>`;

  return sendMailSafe({
    to: approverEmail, role: approverRole,
    subject: `Action Required: Material Request ${request.req_number} — Pending Your Review`,
    trigger: 'WORKFLOW_STAGE_NOTIFY',
    html: buildHtmlTemplate({
      title: 'Action Required', badgeText: `Pending ${approverRole}`, badgeColor: '#f59e0b',
      contentHtml, actionLink: portalUrl, actionText: 'Review in Portal →',
    }),
  });
};

// 4. Notify requester when approver takes action (APPROVE / REJECT / SEND_BACK)
exports.sendWorkflowActionEmail = async (creatorEmail, request, action, actorRole, actorName, comments, newStatus) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;

  let badgeText = '', badgeColor = '#64748b', heading = '', statusNote = '', alertBox = '';

  if (action === 'APPROVE') {
    badgeText = 'Approved — Moving Forward'; badgeColor = '#10b981';
    heading = `Approved by ${actorRole}`;
    statusNote = `<span style="color:#10b981;font-weight:800;">${newStatus || 'Moved to next stage'}</span>`;
  } else if (action === 'SEND_BACK') {
    badgeText = 'Sent Back for Corrections'; badgeColor = '#f59e0b';
    heading = `Sent Back by ${actorRole}`;
    statusNote = `<span style="color:#d97706;font-weight:800;">${newStatus || 'Sent Back For Changes'}</span>`;
    alertBox = `<div style="margin:20px 0 0;padding:15px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:13.5px;color:#b45309;line-height:1.6;"><strong>Action Required:</strong> Click "Edit &amp; Resubmit" below, update the flagged fields, then resubmit.</div>`;
  } else if (action === 'REJECT') {
    badgeText = 'Request Rejected'; badgeColor = '#ef4444';
    heading = `Rejected by ${actorRole}`;
    statusNote = `<span style="color:#ef4444;font-weight:800;">Rejected</span>`;
    alertBox = `<div style="margin:20px 0 0;padding:15px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;font-size:13.5px;color:#b91c1c;line-height:1.6;"><strong>Request Closed.</strong> This request has been permanently rejected.</div>`;
  } else if (action === 'RESUBMIT') {
    badgeText = 'Request Resubmitted'; badgeColor = '#3b82f6';
    heading = 'Your Request Was Resubmitted';
    statusNote = `<span style="color:#3b82f6;font-weight:800;">${newStatus || 'Pending Review'}</span>`;
  } else {
    badgeText = action; heading = 'Workflow Update';
    statusNote = `<span style="color:#64748b;">${newStatus || action}</span>`;
  }

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">${heading}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569;">
      Your Material Master Request <strong>${request.req_number}</strong> has been reviewed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px;">Workflow Event Log</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">Request Number</td><td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:800;color:#4f46e5;">${request.req_number}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Actioned By</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#0f172a;">${actorName || actorRole} <span style="color:#94a3b8;">(${actorRole})</span></td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Action</td><td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f172a;">${action}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">New Status</td><td style="padding:9px 0;font-size:13px;">${statusNote}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;">Timestamp</td><td style="padding:9px 0;font-size:13px;color:#0f172a;">${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#64748b;vertical-align:top;">Remarks</td><td style="padding:9px 0;font-size:13px;color:#475569;font-style:italic;">"${comments || 'No remarks provided.'}"</td></tr>
        </table>
        ${alertBox}
      </td></tr>
    </table>`;

  return sendMailSafe({
    to: creatorEmail, role: 'USER',
    subject: `Update: Material Request ${request.req_number} — ${heading}`,
    trigger: 'WORKFLOW_ACTION_NOTIFY',
    html: buildHtmlTemplate({
      title: heading, badgeText, badgeColor,
      contentHtml, actionLink: portalUrl,
      actionText: action === 'SEND_BACK' ? 'Edit & Resubmit →' : 'View Request Status →',
    }),
  });
};

// 5. Final approval — IT Team approves → completion email
exports.sendFinalApprovalEmail = async (creatorEmail, request) => {
  const portalUrl = `${FRONTEND_URL}/requests/my?highlight=${request.id}`;

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">&#127881; Request Fully Approved!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
      Your Material Master Creation Request <strong>${request.req_number}</strong> has been
      <span style="color:#10b981;font-weight:800;">FULLY APPROVED</span> by the IT Team and is ready for SAP integration.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#16a34a;border-bottom:1px solid #bbf7d0;padding-bottom:10px;margin-bottom:14px;">Approved Specifications</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;width:40%;">Request Number</td><td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:800;color:#14532d;">${request.req_number}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">Description</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#14532d;">${request.description || request.material_name || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">Material Type</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#14532d;">${request.material_type || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">Control Code</td><td style="padding:9px 0;font-size:13px;font-family:monospace;font-weight:600;color:#14532d;">${request.control_code || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">Plant / Storage</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#14532d;">${request.plant || '—'} / ${request.storage_location || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">UOM</td><td style="padding:9px 0;font-size:13px;font-weight:600;color:#14532d;">${request.uom || '—'}</td></tr>
          <tr><td style="padding:9px 0;font-size:13px;font-weight:700;color:#166534;">Status</td><td style="padding:9px 0;font-size:13px;font-weight:800;color:#10b981;">&#10003; Completed — Ready for SAP</td></tr>
        </table>
      </td></tr>
    </table>`;

  return sendMailSafe({
    to: creatorEmail, role: 'USER',
    subject: `Approved: Material Request ${request.req_number} — Completed Successfully`,
    trigger: 'FINAL_APPROVAL',
    html: buildHtmlTemplate({
      title: 'Request Approved & Completed', badgeText: 'Fully Approved', badgeColor: '#10b981',
      contentHtml, actionLink: portalUrl, actionText: 'View Approved Material →',
    }),
  });
};
