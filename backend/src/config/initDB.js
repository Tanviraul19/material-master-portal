const { sequelize } = require('./db');
const bcrypt = require('bcryptjs');

const initDB = async () => {
    try {
        // Core tables — only create if they don't exist (preserve data on restart)
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT,
                department TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS material_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                req_number TEXT UNIQUE,
                requester_id INTEGER,
                material_name TEXT,
                material_type TEXT,
                plant TEXT,
                storage_location TEXT,
                description TEXT,
                long_description TEXT,
                uom TEXT,
                purchase_group TEXT,
                material_group TEXT,
                control_code TEXT,
                valuation_category TEXT,
                valuation_class TEXT,
                department TEXT,
                status TEXT DEFAULT 'Pending Plant Head',
                current_stage TEXT DEFAULT 'Plant Head',
                priority TEXT DEFAULT 'Medium',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS approval_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER,
                approver_id INTEGER,
                action TEXT,
                comments TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES material_requests(id),
                FOREIGN KEY (approver_id) REFERENCES users(id)
            )
        `);

        // ── Master data tables for dropdowns ──
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS master_plants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plant TEXT NOT NULL,
                storage_location TEXT NOT NULL,
                storage_location_desc TEXT,
                UNIQUE(plant, storage_location)
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_plants_plant ON master_plants(plant)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_plants_sloc ON master_plants(storage_location)`);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS master_uom (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uom_code TEXT UNIQUE NOT NULL,
                uom_description TEXT
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_uom_code ON master_uom(uom_code)`);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS master_purchase_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pg_code TEXT UNIQUE NOT NULL,
                pg_description TEXT
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_pg_code ON master_purchase_groups(pg_code)`);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS master_material_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mg_code TEXT UNIQUE NOT NULL,
                short_description TEXT,
                long_description TEXT
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_mg_code ON master_material_groups(mg_code)`);

        // ── NEW: Material Descriptions master table for duplicate detection ──
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS material_descriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_description TEXT NOT NULL,
                normalized_key TEXT NOT NULL,
                source TEXT DEFAULT 'excel',
                material_type TEXT,
                material_code TEXT,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Indexes for fast lookup on normalized_key (the sorted-word hash)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_mat_desc_norm_key
            ON material_descriptions(normalized_key)
        `);
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_mat_req_norm
            ON material_requests(description)
        `);

        // ── Workflow tables ──────────────────────────────────────────────
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS approval_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                approver_id INTEGER,
                stage TEXT NOT NULL,
                action TEXT NOT NULL,
                comments TEXT,
                fields_changed TEXT,
                is_restart INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES material_requests(id)
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ah_request ON approval_history(request_id)`);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                request_id INTEGER,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read)`);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                actor_id INTEGER,
                actor_name TEXT,
                actor_role TEXT,
                action TEXT NOT NULL,
                field_name TEXT,
                old_value TEXT,
                new_value TEXT,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_logs(request_id)`);

        // Add workflow columns to material_requests if missing
        // NOTE: SQLite does NOT allow ALTER TABLE ... ADD COLUMN with DEFAULT CURRENT_TIMESTAMP
        //       (non-constant default). All timestamp defaults must be handled in app logic.
        const cols = await sequelize.query(`PRAGMA table_info(material_requests)`, { type: sequelize.constructor.QueryTypes.SELECT });
        const colNames = cols.map(c => c.name);
        if (!colNames.includes('it_sendback_to_user')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN it_sendback_to_user INTEGER DEFAULT 0`);
        }
        if (!colNames.includes('assigned_approver')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN assigned_approver TEXT`);
        }
        if (!colNames.includes('pending_since')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN pending_since DATETIME`);
            await sequelize.query(`UPDATE material_requests SET pending_since = updated_at WHERE pending_since IS NULL`);
        }
        // sendback_stage: stores which stage sent the request back, so resubmit returns to exact same stage
        if (!colNames.includes('sendback_stage')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN sendback_stage TEXT`);
        }
        if (!colNames.includes('sendback_role')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN sendback_role TEXT`);
        }
        // resume_after_dept: used for material_type-change reroute (dept approval returns to the editing approver)
        if (!colNames.includes('resume_after_dept')) {
            await sequelize.query(`ALTER TABLE material_requests ADD COLUMN resume_after_dept TEXT`);
        }

        // ── Seed default users if empty ──────────────────────────────────
        const existing = await sequelize.query(
            'SELECT COUNT(*) as cnt FROM users',
            { type: sequelize.constructor.QueryTypes.SELECT }
        );
        if (existing[0].cnt === 0) {
            const testHash = await bcrypt.hash('password123', 10);
            await sequelize.query(
                'INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)',
                { replacements: ['Test User', 'test_user', 'user@enterprise.com', testHash, 'User', 'General'] }
            );
        }

        // ── Disable old Super Admin accounts (Saurabh, Komal) ───────────────
        await sequelize.query(
            `UPDATE users SET is_active = 0, role = 'Disabled' WHERE email IN ('saurabh@enterprise.com', 'komal@enterprise.com')`
        );

        // ── Upsert enterprise workflow approvers (always ensure these exist) ──
        const workflowUsers = [
            { full_name: 'Plant Head',    username: 'plant_head',          email: 'plant.head@masterportal.com',         password: 'Plant@123',    role: 'Plant Head',     department: 'Management' },
            { full_name: 'Deepak Sir',    username: 'deepak_mechanical',   email: 'deepak.mechanical@masterportal.com',  password: 'Deepak@123',   role: 'Mechanical Team', department: 'Mechanical' },
            { full_name: 'Pradeep Sir',   username: 'pradeep_electrical',  email: 'pradeep.electrical@masterportal.com', password: 'Pradeep@123',  role: 'Electrical Team', department: 'Electrical' },
            { full_name: 'Purchase Team', username: 'purchase_team',       email: 'purchase.team@masterportal.com',      password: 'Purchase@123', role: 'Purchase Team',  department: 'Purchase'   },
            { full_name: 'GST Team',      username: 'gst_team',            email: 'gst.team@masterportal.com',           password: 'GST@123',      role: 'GST Team',       department: 'Finance'    },
            { full_name: 'Store Head',    username: 'store_head',          email: 'store.head@masterportal.com',         password: 'Store@123',    role: 'Store Head',     department: 'Stores'     },
            { full_name: 'IT Team',       username: 'it_team',             email: 'it.team@masterportal.com',            password: 'IT@123',       role: 'IT Team',        department: 'IT'         },
        ];
        for (const wu of workflowUsers) {
            const exists = await sequelize.query(
                'SELECT id FROM users WHERE email = ?',
                { replacements: [wu.email], type: sequelize.constructor.QueryTypes.SELECT }
            );
            const hash = await bcrypt.hash(wu.password, 10);
            if (exists.length === 0) {
                await sequelize.query(
                    'INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)',
                    { replacements: [wu.full_name, wu.username, wu.email, hash, wu.role, wu.department] }
                );
                console.log(`✅ Created workflow user: ${wu.full_name} (${wu.role})`);
            } else {
                await sequelize.query(
                    'UPDATE users SET full_name = ?, username = ?, password_hash = ?, role = ?, department = ?, is_active = 1 WHERE email = ?',
                    { replacements: [wu.full_name, wu.username, hash, wu.role, wu.department, wu.email] }
                );
                console.log(`🔄 Updated workflow user: ${wu.full_name} (${wu.role})`);
            }
        }
        // After upsert, backfill assigned_approver for any requests still at Plant Head stage
        // that have the generic placeholder instead of the real user name
        const [phUser] = await sequelize.query(
            `SELECT full_name FROM users WHERE role = 'Plant Head' AND is_active = 1 LIMIT 1`,
            { type: sequelize.constructor.QueryTypes.SELECT }
        );
        if (phUser) {
            await sequelize.query(
                `UPDATE material_requests SET assigned_approver = ? WHERE current_stage = 'Plant Head' AND (assigned_approver IS NULL OR assigned_approver = 'Plant Head')`,
                { replacements: [phUser.full_name] }
            );
        }
        console.log('✅ Enterprise workflow users ready');
        console.log('   plant.head@masterportal.com         / Plant@123    → Plant Head (Stage 1)');
        console.log('   deepak.mechanical@masterportal.com  / Deepak@123   → Mechanical Team (Stage 2 — Mech only)');
        console.log('   pradeep.electrical@masterportal.com / Pradeep@123  → Electrical Team (Stage 2 — Elec only)');
        console.log('   purchase.team@masterportal.com      / Purchase@123 → Purchase Team');
        console.log('   gst.team@masterportal.com           / GST@123      → GST Team');
        console.log('   store.head@masterportal.com         / Store@123    → Store Head');
        console.log('   it.team@masterportal.com            / IT@123       → IT Team (Final)');

        console.log('✅ Database initialized with full workflow tables');
    } catch (err) {
        console.error('❌ DB Init failed:', err);
    }
};

module.exports = initDB;
