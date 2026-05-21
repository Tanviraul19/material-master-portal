const nodemailer = require('nodemailer');

// Load environment variables (dotenv is loaded in src/index.js)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Configure SMTP transporter
let transporter = null;
try {
  if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
    console.log(`SMTP Mail Transporter initialized for user: ${EMAIL_USER}`);
  } else {
    console.warn('WARNING: SMTP credentials not fully configured in environment variables. Emails will be logged to console instead.');
  }
} catch (error) {
  console.error('Failed to initialize SMTP transporter:', error);
}

/**
 * Maps a real database email and role to the appropriate temporary test email.
 * This satisfies the strict testing mapping requirement, while remaining configurable.
 * 
 * Mapping criteria:
 * - USER role -> raulankesh96@gmail.com
 * - ADMIN / IT TEAM / SUPER ADMIN role -> tanviraul196@gmail.com
 * - GST Team / fallback -> tanviraul09@gmail.com
 * - PLANT_HEAD / STORE / PURCHASE / DEPARTMENT (Mechanical/Electrical) -> anushkadange5@gmail.com
 */
function getRecipientEmail(role, dbEmail) {
  // If explicitly configured in environment, prioritize those overrides
  const testUser = process.env.TEST_USER_EMAIL || 'raulankesh96@gmail.com';
  const testAdmin = process.env.TEST_ADMIN_EMAIL || 'tanviraul196@gmail.com';
  const testApprover = process.env.TEST_APPROVER_EMAIL || 'tanviraul09@gmail.com';
  const testPlantDept = process.env.TEST_PLANT_DEPT_EMAIL || 'anushkadange5@gmail.com';

  const roleName = String(role || '').toUpperCase();

  if (roleName === 'USER') {
    return testUser;
  }
  if (['IT TEAM', 'SUPER ADMIN', 'ADMIN'].includes(roleName)) {
    return testAdmin;
  }
  if (roleName === 'GST TEAM') {
    return testApprover;
  }
  if ([
    'PLANT HEAD', 'STORE HEAD', 'PURCHASE TEAM', 
    'MECHANICAL TEAM', 'ELECTRICAL TEAM', 'DEPARTMENT'
  ].includes(roleName)) {
    return testPlantDept;
  }

  // Fallback default
  return dbEmail || testApprover;
}

/**
 * Reusable HTML Email Template Wrapper
 * Uses a gorgeous Slate-Indigo theme, responsive cards, and clean typography.
 */
function buildHtmlTemplate({ title, badgeText, badgeColor, preheader, contentHtml, actionLink, actionText }) {
  const primaryColor = '#4f46e5'; // Indigo
  const textColor = '#1e293b'; // Slate
  const bgLight = '#f8fafc'; // White/gray

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: ${textColor};
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f1f5f9;
          padding: 30px 10px;
          box-sizing: border-box;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          padding: 32px 40px;
          text-align: left;
          position: relative;
        }
        .logo-text {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin: 0;
          text-transform: uppercase;
        }
        .logo-sub {
          font-size: 11px;
          color: #818cf8;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 9999px;
          color: #ffffff;
          background-color: ${badgeColor || primaryColor};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 15px;
        }
        .content {
          padding: 40px;
        }
        .content h1 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .content p {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin-top: 0;
          margin-bottom: 24px;
        }
        .table-container {
          background-color: ${bgLight};
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
        }
        .table-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 1px;
          margin-top: 0;
          margin-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table td {
          padding: 10px 0;
          font-size: 13.5px;
          vertical-align: top;
        }
        .data-table td.label {
          font-weight: 700;
          color: #64748b;
          width: 35%;
        }
        .data-table td.value {
          color: #0f172a;
          font-weight: 600;
        }
        .cta-container {
          text-align: center;
          margin: 35px 0 15px 0;
        }
        .btn-cta {
          display: inline-block;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff !important;
          background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
          padding: 14px 32px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
          transition: all 0.2s ease;
        }
        .btn-secondary-cta {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          color: #4f46e5 !important;
          background-color: #eff6ff;
          border: 1px dashed #bfdbfe;
          padding: 10px 24px;
          border-radius: 10px;
          text-decoration: none;
          margin: 0 6px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 30px 40px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0 0 10px 0;
          line-height: 1.5;
        }
        .footer a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo-text">Viraj Profiles</div>
            <div class="logo-sub">Material Master Portal</div>
            ${badgeText ? `<div class="badge">${badgeText}</div>` : ''}
          </div>
          <!-- Body -->
          <div class="content">
            ${contentHtml}
            
            ${actionLink ? `
              <div class="cta-container">
                <a href="${actionLink}" class="btn-cta" target="_blank">${actionText || 'Open Portal'}</a>
              </div>
            ` : ''}
          </div>
          <!-- Footer -->
          <div class="footer">
            <p>This is an automated workflow notification from the Material Master Portal.</p>
            <p>© 2026 Viraj Profiles Ltd. All rights reserved.</p>
            <p><a href="${FRONTEND_URL}">Access Portal</a> · <a href="${FRONTEND_URL}/settings">Account Settings</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Core send helper wrapper with error isolation.
 * Prevents SMTP server connection failures or unconfigured variables from crashing requests.
 */
async function sendMailSafe(options) {
  try {
    const role = options.role || 'GST Team';
    const mappedRecipient = getRecipientEmail(role, options.to);
    
    const mailOptions = {
      from: `"Material Master Portal" <${EMAIL_USER || 'no-reply@masterportal.com'}>`,
      to: mappedRecipient,
      subject: options.subject,
      html: options.html,
    };

    console.log(`[Email Attempt] Trigger: "${options.trigger}". Recipient Role: "${role}". Target: "${options.to}" -> Mapped To: "${mappedRecipient}". Subject: "${options.subject}"`);

    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Success] Message Sent: ${info.messageId}. Target: ${mappedRecipient}`);
      return info;
    } else {
      console.warn(`[Email Skip] SMTP not configured. Logged content:\nSubject: ${options.subject}\nRecipient: ${mappedRecipient}\nTrigger: ${options.trigger}`);
      return null;
    }
  } catch (error) {
    console.error(`[Email Error] Failed to send email for trigger "${options.trigger}":`, error.message || error);
    // Suppress error to avoid application crash
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED WORKFLOW EMAILS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Admin User Creation Email
 * Triggered when Admin creates a new user.
 */
exports.sendUserCreatedEmail = async (userEmail, fullName, tempPassword) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  
  const contentHtml = `
    <h1>Welcome, ${fullName}!</h1>
    <p>An administrator has created your corporate account on the **Material Master Request & Approval Portal**.</p>
    <p>Please use the temporary credentials below to sign in. For your security, you are required to change your password immediately after your first successful login.</p>
    
    <div class="table-container">
      <div class="table-title">Your Portal Credentials</div>
      <table class="data-table">
        <tr>
          <td class="label">Portal Link</td>
          <td class="value"><a href="${loginUrl}">${loginUrl}</a></td>
        </tr>
        <tr>
          <td class="label">Username/Email</td>
          <td class="value" style="font-family: monospace;">${userEmail}</td>
        </tr>
        <tr>
          <td class="label">Temporary Password</td>
          <td class="value" style="font-family: monospace; font-size: 15px; color: #4f46e5;">${tempPassword}</td>
        </tr>
      </table>
    </div>
    
    <p><strong>Next Steps:</strong> Click the "Login to Portal" button below, enter your credentials, and navigate to the <em>Settings</em> tab to update your password to a strong personal one.</p>
  `;

  return sendMailSafe({
    to: userEmail,
    role: 'USER', // mapped to raulankesh96@gmail.com
    subject: 'Material Portal - Account Created Successfully',
    trigger: 'USER_CREATED',
    html: buildHtmlTemplate({
      title: 'Your Account Has Been Created',
      badgeText: 'New Account',
      badgeColor: '#10b981', // Emerald
      contentHtml,
      actionLink: loginUrl,
      actionText: 'Login to Portal'
    })
  });
};

/**
 * 2. Request Creation Confirmation Email (To USER / Creator)
 * Triggered when USER creates a new request.
 */
exports.sendRequestCreatedEmail = async (creatorEmail, request) => {
  const reqId = request.id;
  const reqNum = request.req_number;
  const portalUrl = `${FRONTEND_URL}/requests/my?id=${reqId}`;

  const contentHtml = `
    <h1>Request Submitted!</h1>
    <p>Your Material Master Creation Request has been registered successfully in our workflow system.</p>
    <p>The request has been routed to the **Plant Head** stage for initial review. You will receive real-time email notifications as your request moves through each approval layer.</p>
    
    <div class="table-container">
      <div class="table-title">Request Specifications</div>
      <table class="data-table">
        <tr>
          <td class="label">Request Number</td>
          <td class="value" style="font-family: monospace;">${reqNum}</td>
        </tr>
        <tr>
          <td class="label">Description</td>
          <td class="value">${request.description || request.material_name}</td>
        </tr>
        <tr>
          <td class="label">Material Type</td>
          <td class="value">${request.material_type}</td>
        </tr>
        <tr>
          <td class="label">Plant / Storage Loc</td>
          <td class="value">${request.plant} / ${request.storage_location || '—'}</td>
        </tr>
        <tr>
          <td class="label">Base UOM</td>
          <td class="value">${request.uom || '—'}</td>
        </tr>
        <tr>
          <td class="label">Current Status</td>
          <td class="value" style="color: #d97706;">Pending Plant Head Approval</td>
        </tr>
      </table>
    </div>
  `;

  return sendMailSafe({
    to: creatorEmail,
    role: 'USER', // mapped to raulankesh96@gmail.com
    subject: 'Material Creation Request Submitted',
    trigger: 'REQUEST_CREATED',
    html: buildHtmlTemplate({
      title: 'Material Creation Request Submitted',
      badgeText: 'Submitted',
      badgeColor: '#3b82f6', // Blue
      contentHtml,
      actionLink: portalUrl,
      actionText: 'Track Your Request'
    })
  });
};

/**
 * 3. Action Required Workflow Email (To NEXT Approver)
 * Triggered when a request enters an approver's queue.
 */
exports.sendWorkflowStageNotificationEmail = async (approverEmail, approverRole, request) => {
  const reqId = request.id;
  const reqNum = request.req_number;
  const portalUrl = `${FRONTEND_URL}/approvals?id=${reqId}`;

  const contentHtml = `
    <h1>Review Required</h1>
    <p>A Material Master Creation Request has been routed to your queue and is awaiting your explicit action.</p>
    <p>Please review the details below. You can log into the portal directly via the buttons to Approve, Reject, or Send Back with comments.</p>
    
    <div class="table-container">
      <div class="table-title">Material Specifications</div>
      <table class="data-table">
        <tr>
          <td class="label">Request ID</td>
          <td class="value" style="font-family: monospace;">${reqNum}</td>
        </tr>
        <tr>
          <td class="label">Stage / Role</td>
          <td class="value">${approverRole}</td>
        </tr>
        <tr>
          <td class="label">Description</td>
          <td class="value">${request.description || request.material_name}</td>
        </tr>
        <tr>
          <td class="label">Material Type</td>
          <td class="value">${request.material_type}</td>
        </tr>
        <tr>
          <td class="label">Plant / S-Loc</td>
          <td class="value">${request.plant} / ${request.storage_location || '—'}</td>
        </tr>
        <tr>
          <td class="label">UOM / Purch Group</td>
          <td class="value">${request.uom || '—'} / ${request.purchase_group || '—'}</td>
        </tr>
      </table>
    </div>
    
    <p style="text-align: center; margin: 15px 0;">
      <a href="${portalUrl}" class="btn-secondary-cta" style="color: #059669 !important; background-color: #ecfdf5; border-color: #a7f3d0;">✓ Open to Approve</a>
      <a href="${portalUrl}" class="btn-secondary-cta" style="color: #dc2626 !important; background-color: #fef2f2; border-color: #fecaca;">✕ Open to Reject</a>
    </p>
  `;

  return sendMailSafe({
    to: approverEmail,
    role: approverRole, // dynamically maps to the target test email
    subject: `Action Required: Material Creation Request ${reqNum}`,
    trigger: 'APPROVER_NOTIFICATION',
    html: buildHtmlTemplate({
      title: 'Action Required',
      badgeText: `Pending ${approverRole}`,
      badgeColor: '#f59e0b', // Amber
      contentHtml,
      actionLink: portalUrl,
      actionText: 'Review in Portal'
    })
  });
};

/**
 * 4. Workflow Action Taken Email (To Creator / USER)
 * Triggered when an approver takes action: APPROVE, REJECT, or SEND_BACK.
 */
exports.sendWorkflowActionNotificationEmail = async (creatorEmail, request, action, actorRole, comments) => {
  const reqId = request.id;
  const reqNum = request.req_number;
  
  // Custom badges and links depending on the action
  let statusLabel = '';
  let badgeColor = '';
  let portalUrl = `${FRONTEND_URL}/requests/my?id=${reqId}`;
  let actionTitle = '';

  if (action === 'APPROVE') {
    statusLabel = 'Approved (Moved Forward)';
    badgeColor = '#10b981'; // Green
    actionTitle = `Approved by ${actorRole}`;
  } else if (action === 'SEND_BACK') {
    statusLabel = 'Sent Back for Changes';
    badgeColor = '#f59e0b'; // Amber
    actionTitle = `Sent Back by ${actorRole}`;
  } else if (action === 'REJECT') {
    statusLabel = 'Rejected';
    badgeColor = '#ef4444'; // Red
    actionTitle = `Rejected by ${actorRole}`;
  } else {
    statusLabel = action;
    badgeColor = '#64748b'; // Slate
    actionTitle = `Workflow Update`;
  }

  const contentHtml = `
    <h1>Workflow Action: ${actionTitle}</h1>
    <p>An approver has processed your Material Master Request <strong>${reqNum}</strong>.</p>
    
    <div class="table-container">
      <div class="table-title">Workflow Log</div>
      <table class="data-table">
        <tr>
          <td class="label">Action Role</td>
          <td class="value">${actorRole}</td>
        </tr>
        <tr>
          <td class="label">Action Status</td>
          <td class="value" style="color: ${badgeColor};">${statusLabel}</td>
        </tr>
        <tr>
          <td class="label">Timestamp</td>
          <td class="value">${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
        </tr>
        <tr>
          <td class="label">Remarks / Comments</td>
          <td class="value" style="font-style: italic; color: #475569;">"${comments || 'No remarks provided.'}"</td>
        </tr>
      </table>
    </div>
    
    ${action === 'SEND_BACK' ? `
      <p style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 10px; font-size: 13.5px; color: #b45309; line-height: 1.5;">
        <strong>Action Required:</strong> Please click the button below to edit your request description, material type, plant, or other fields as indicated in the remarks, and then click **Resubmit** to route it back.
      </p>
    ` : ''}
  `;

  return sendMailSafe({
    to: creatorEmail,
    role: 'USER', // mapped to raulankesh96@gmail.com
    subject: `Update: Material Request ${reqNum} - ${actionTitle}`,
    trigger: 'ACTION_LOGGED',
    html: buildHtmlTemplate({
      title: actionTitle,
      badgeText: statusLabel,
      badgeColor,
      contentHtml,
      actionLink: portalUrl,
      actionText: action === 'SEND_BACK' ? 'Edit & Resubmit' : 'View Request Details'
    })
  });
};

/**
 * 5. Final Approval Confirmation Email (To Creator / USER)
 * Triggered when IT Team approves request (moves to Approved).
 */
exports.sendFinalApprovalEmail = async (creatorEmail, request) => {
  const reqId = request.id;
  const reqNum = request.req_number;
  const portalUrl = `${FRONTEND_URL}/requests/my?id=${reqId}`;

  const contentHtml = `
    <h1>Request Fully Approved!</h1>
    <p>Congratulations! Your Material Master Creation Request <strong>${reqNum}</strong> has been **FULLY APPROVED** and processed by the IT Team.</p>
    <p>The material record has been created successfully in the portal database and is now flagged as completed. It is ready for replication and SAP integration.</p>
    
    <div class="table-container">
      <div class="table-title">Approved Specifications</div>
      <table class="data-table">
        <tr>
          <td class="label">Request Number</td>
          <td class="value" style="font-family: monospace;">${reqNum}</td>
        </tr>
        <tr>
          <td class="label">Description</td>
          <td class="value">${request.description || request.material_name}</td>
        </tr>
        <tr>
          <td class="label">Material Type</td>
          <td class="value">${request.material_type}</td>
        </tr>
        <tr>
          <td class="label">Control Code (HSN)</td>
          <td class="value" style="font-family: monospace;">${request.control_code || '—'}</td>
        </tr>
        <tr>
          <td class="label">Plant / Storage Loc</td>
          <td class="value">${request.plant} / ${request.storage_location || '—'}</td>
        </tr>
        <tr>
          <td class="label">Base UOM</td>
          <td class="value">${request.uom || '—'}</td>
        </tr>
        <tr>
          <td class="label">Status</td>
          <td class="value" style="color: #10b981; font-weight: 800;">Completed (Ready for SAP)</td>
        </tr>
      </table>
    </div>
  `;

  return sendMailSafe({
    to: creatorEmail,
    role: 'USER', // mapped to raulankesh96@gmail.com
    subject: `Approved: Material Request ${reqNum} Completed Successfully`,
    trigger: 'FINAL_APPROVAL',
    html: buildHtmlTemplate({
      title: 'Request Approved & Completed',
      badgeText: 'Completed',
      badgeColor: '#10b981', // Emerald
      contentHtml,
      actionLink: portalUrl,
      actionText: 'View Approved Material'
    })
  });
};
