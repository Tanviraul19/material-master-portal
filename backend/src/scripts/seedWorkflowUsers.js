/**
 * seedWorkflowUsers.js
 * Upserts the 5 enterprise workflow approvers into the live database.
 * Run: node src/scripts/seedWorkflowUsers.js
 */
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const WORKFLOW_USERS = [
  { full_name: 'Deepak Sir',  username: 'deepak_mechanical', email: 'deepak.mechanical@masterportal.com', password: 'Deepak@123',  role: 'Mechanical Team', department: 'Mechanical' },
  { full_name: 'Pradeep Sir', username: 'pradeep_electrical', email: 'pradeep.electrical@masterportal.com', password: 'Pradeep@123', role: 'Electrical Team', department: 'Electrical' },
  { full_name: 'GST Team',    username: 'gst_team',           email: 'gst.team@masterportal.com',          password: 'GST@123',     role: 'GST Team',       department: 'Finance'    },
  { full_name: 'Store Head',  username: 'store_head',         email: 'store.head@masterportal.com',        password: 'Store@123',   role: 'Store Head',     department: 'Stores'     },
  { full_name: 'IT Team',     username: 'it_team',            email: 'it.team@masterportal.com',           password: 'IT@123',      role: 'IT Team',        department: 'IT'         },
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    for (const u of WORKFLOW_USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const existing = await sequelize.query(
        'SELECT id FROM users WHERE email = ?',
        { replacements: [u.email], type: sequelize.constructor.QueryTypes.SELECT }
      );

      if (existing.length === 0) {
        await sequelize.query(
          'INSERT INTO users (full_name, username, email, password_hash, role, department, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          { replacements: [u.full_name, u.username, u.email, hash, u.role, u.department] }
        );
        console.log(`  ✅ CREATED  → ${u.full_name.padEnd(14)} | ${u.role.padEnd(16)} | ${u.email}`);
      } else {
        await sequelize.query(
          'UPDATE users SET full_name = ?, username = ?, password_hash = ?, role = ?, department = ?, is_active = 1 WHERE email = ?',
          { replacements: [u.full_name, u.username, hash, u.role, u.department, u.email] }
        );
        console.log(`  🔄 UPDATED  → ${u.full_name.padEnd(14)} | ${u.role.padEnd(16)} | ${u.email}`);
      }
    }

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('  Enterprise Workflow Users — Login Credentials');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('  Deepak Sir   deepak.mechanical@masterportal.com  Deepak@123  → Mechanical Team');
    console.log('  Pradeep Sir  pradeep.electrical@masterportal.com Pradeep@123 → Electrical Team');
    console.log('  GST Team     gst.team@masterportal.com           GST@123     → GST Team');
    console.log('  Store Head   store.head@masterportal.com         Store@123   → Store Head');
    console.log('  IT Team      it.team@masterportal.com            IT@123      → IT Team');
    console.log('─────────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
