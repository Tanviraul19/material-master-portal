'use strict';
const { sequelize } = require('./db');
const bcrypt = require('bcryptjs');

const isPostgres = !!process.env.DATABASE_URL;

const initDB = async () => {
    try {
        if (isPostgres) {
            // ── PostgreSQL Tables ─────────────────────────────────────────
            await sequelize.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name TEXT, username TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT, role TEXT, department TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_login TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS material_requests (id SERIAL PRIMARY KEY, req_number TEXT UNIQUE, requester_id INTEGER, material_name TEXT, material_type TEXT, plant TEXT, storage_location TEXT, description TEXT, long_description TEXT, uom TEXT, purchase_group TEXT, material_group TEXT, control_code TEXT, valuation_category TEXT, valuation_class TEXT, department TEXT, status TEXT DEFAULT 'Pending Plant Head', current_stage TEXT DEFAULT 'Plant Head', priority TEXT DEFAULT 'Medium', it_sendback_to_user INTEGER DEFAULT 0, assigned_approver TEXT, pending_since TIMESTAMP, sendback_stage TEXT, sendback_role TEXT, resume_after_dept TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS approval_logs (id SERIAL PRIMARY KEY, request_id INTEGER, approver_id INTEGER, action TEXT, comments TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_plants (id SERIAL PRIMARY KEY, plant TEXT NOT NULL, storage_location TEXT NOT NULL, storage_location_desc TEXT, UNIQUE(plant, storage_location))`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_uom (id SERIAL PRIMARY KEY, uom_code TEXT UNIQUE NOT NULL, uom_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_purchase_groups (id SERIAL PRIMARY KEY, pg_code TEXT UNIQUE NOT NULL, pg_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_material_groups (id SERIAL PRIMARY KEY, mg_code TEXT UNIQUE NOT NULL, short_description TEXT, long_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS material_descriptions (id SERIAL PRIMARY KEY, original_description TEXT NOT NULL, normalized_key TEXT NOT NULL, source TEXT DEFAULT 'excel', material_type TEXT, material_code TEXT, imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS approval_history (id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL, approver_id INTEGER, stage TEXT NOT NULL, action TEXT NOT NULL, comments TEXT, fields_changed TEXT, is_restart INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, request_id INTEGER, type TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL, actor_id INTEGER, actor_name TEXT, actor_role TEXT, action TEXT NOT NULL, field_name TEXT, old_value TEXT, new_value TEXT, reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        } else {
            // ── SQLite Tables (local dev) ─────────────────────────────────
            await sequelize.query(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT, username TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT, role TEXT, department TEXT, is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS material_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, req_number TEXT UNIQUE, requester_id INTEGER, material_name TEXT, material_type TEXT, plant TEXT, storage_location TEXT, description TEXT, long_description TEXT, uom TEXT, purchase_group TEXT, material_group TEXT, control_code TEXT, valuation_category TEXT, valuation_class TEXT, department TEXT, status TEXT DEFAULT 'Pending Plant Head', current_stage TEXT DEFAULT 'Plant Head', priority TEXT DEFAULT 'Medium', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS approval_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER, approver_id INTEGER, action TEXT, comments TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_plants (id INTEGER PRIMARY KEY AUTOINCREMENT, plant TEXT NOT NULL, storage_location TEXT NOT NULL, storage_location_desc TEXT, UNIQUE(plant, storage_location))`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_uom (id INTEGER PRIMARY KEY AUTOINCREMENT, uom_code TEXT UNIQUE NOT NULL, uom_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_purchase_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, pg_code TEXT UNIQUE NOT NULL, pg_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS master_material_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, mg_code TEXT UNIQUE NOT NULL, short_description TEXT, long_description TEXT)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS material_descriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, original_description TEXT NOT NULL, normalized_key TEXT NOT NULL, source TEXT DEFAULT 'excel', material_type TEXT, material_code TEXT, imported_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS approval_history (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, approver_id INTEGER, stage TEXT NOT NULL, action TEXT NOT NULL, comments TEXT, fields_changed TEXT, is_restart INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, request_id INTEGER, type TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await sequelize.query(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, actor_id INTEGER, actor_name TEXT, actor_role TEXT, action TEXT NOT NULL, field_name TEXT, old_value TEXT, new_value TEXT, reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

            // SQLite: add missing columns
            const cols = await sequelize.query(`PRAGMA table_info(material_requests)`, { type: sequelize.constructor.QueryTypes.SELECT });
            const colNames = cols.map(c => c.name);
            if (!colNames.includes('it_sendback_to_user')) await sequelize.query(`ALTER TABLE material_requests ADD COLUMN it_sendback_to_user INTEGER DEFAULT 0`);
            if (!colNames.includes('assigned_approver'))   await sequelize.query(`ALTER TABLE material_requests ADD COLUMN assigned_approver TEXT`);
            if (!colNames.includes('pending_since'))       await sequelize.query(`ALTER TABLE material_requests ADD COLUMN pending_since DATETIME`);
            if (!colNames.includes('sendback_stage'))      await sequelize.query(`ALTER TABLE material_requests ADD COLUMN sendback_stage TEXT`);
            if (!colNames.includes('sendback_role'))       await sequelize.query(`ALTER TABLE material_requests ADD COLUMN sendback_role TEXT`);
            if (!colNames.includes('resume_after_dept'))   await sequelize.query(`ALTER TABLE material_requests ADD COLUMN resume_after_dept TEXT`);
        }

        // Indexes
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_ah_request ON approval_history(request_id)`).catch(() => {});
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read)`).catch(() => {});
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_logs(request_id)`).catch(() => {});
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mat_desc_orig ON material_descriptions(original_description)`).catch(() => {});
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mat_desc_norm ON material_descriptions(normalized_key)`).catch(() => {});
        // Enable trigram extension for fast ILIKE search on PostgreSQL
        if (isPostgres) {
            await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).catch(() => {});
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mat_desc_orig_trgm ON material_descriptions USING gin(original_description gin_trgm_ops)`).catch(() => {});
            await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mat_desc_norm_trgm ON material_descriptions USING gin(normalized_key gin_trgm_ops)`).catch(() => {});
            console.log('✅ Trigram indexes ready for fast search');
        }

        // Seed users if empty
        const existing = await sequelize.query(`SELECT COUNT(*) as cnt FROM users`, { type: sequelize.constructor.QueryTypes.SELECT });
        const count = parseInt(existing[0]?.cnt || existing[0]?.count || 0);

        if (count === 0) {
            const testHash = await bcrypt.hash('password123', 10);
            await sequelize.query(`INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)`,
                { replacements: ['Test User', 'test_user', 'user@enterprise.com', testHash, 'User', 'General'] });
        }

        // Upsert workflow users
        const workflowUsers = [
            { full_name: 'Plant Head',    username: 'plant_head',         email: 'plant.head@masterportal.com',         password: 'Plant@123',    role: 'Plant Head',      department: 'Management' },
            { full_name: 'Deepak Sir',    username: 'deepak_mechanical',  email: 'deepak.mechanical@masterportal.com',  password: 'Deepak@123',   role: 'Mechanical Team', department: 'Mechanical' },
            { full_name: 'Pradeep Sir',   username: 'pradeep_electrical', email: 'pradeep.electrical@masterportal.com', password: 'Pradeep@123',  role: 'Electrical Team', department: 'Electrical' },
            { full_name: 'Purchase Team', username: 'purchase_team',      email: 'purchase.team@masterportal.com',      password: 'Purchase@123', role: 'Purchase Team',   department: 'Purchase'   },
            { full_name: 'GST Team',      username: 'gst_team',           email: 'gst.team@masterportal.com',           password: 'GST@123',      role: 'GST Team',        department: 'Finance'    },
            { full_name: 'Store Head',    username: 'store_head',         email: 'store.head@masterportal.com',         password: 'Store@123',    role: 'Store Head',      department: 'Stores'     },
            { full_name: 'IT Team',       username: 'it_team',            email: 'it.team@masterportal.com',            password: 'IT@123',       role: 'IT Team',         department: 'IT'         },
        ];

        for (const wu of workflowUsers) {
            const exists = await sequelize.query(`SELECT id FROM users WHERE email = ?`, { replacements: [wu.email], type: sequelize.constructor.QueryTypes.SELECT });
            const hash = await bcrypt.hash(wu.password, 10);
            if (exists.length === 0) {
                await sequelize.query(`INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)`, { replacements: [wu.full_name, wu.username, wu.email, hash, wu.role, wu.department] });
                console.log(`✅ Created: ${wu.full_name} (${wu.role})`);
            } else {
                await sequelize.query(`UPDATE users SET full_name=?, password_hash=?, role=?, department=?, is_active=TRUE WHERE email=?`, { replacements: [wu.full_name, hash, wu.role, wu.department, wu.email] });
                console.log(`🔄 Updated: ${wu.full_name} (${wu.role})`);
            }
        }

        console.log(`✅ Database initialized (${isPostgres ? 'PostgreSQL' : 'SQLite'})`);

        // Auto-seed master data if tables are empty
        await autoSeedMasterData();

    } catch (err) {
        console.error('❌ DB Init failed:', err.message);
        throw err;
    }
};

module.exports = initDB;

// ── Auto-seed master data from Excel on startup (only if tables are empty) ──
const autoSeedMasterData = async () => {
    try {
        const XLSX = require('xlsx');
        const path = require('path');
        const DATA_DIR = path.join(__dirname, '../../../data');

        // Check if master_material_groups already seeded
        const [mgCheck] = await sequelize.query(
            `SELECT COUNT(*) as cnt FROM master_material_groups`,
            { type: sequelize.constructor.QueryTypes.SELECT }
        );
        const mgCount = parseInt(mgCheck?.cnt || mgCheck?.count || 0);

        // Check if material_descriptions already seeded (separate check)
        const [descCheck] = await sequelize.query(
            `SELECT COUNT(*) as cnt FROM material_descriptions`,
            { type: sequelize.constructor.QueryTypes.SELECT }
        );
        const descCount = parseInt(descCheck?.cnt || descCheck?.count || 0);

        if (mgCount > 0 && descCount > 0) {
            console.log(`✅ Master data already seeded (${mgCount} material groups, ${descCount} descriptions)`);
            return;
        }

        if (mgCount > 0) {
            console.log(`✅ Material groups already seeded (${mgCount}). Checking descriptions...`);
        }

        console.log('🌱 Seeding master data from Excel files...');
        let mgIns = 0, uomIns = 0, plantIns = 0;

        // Material Groups
        try {
            const wb = XLSX.readFile(path.join(DATA_DIR, 'Plant Details.xlsx'));
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { defval: '' });
            for (const r of rows) {
                const code = String(r['Material Group'] || '').trim();
                const short = String(r['Short Description'] || '').trim();
                const long = String(r['Long Description'] || '').trim();
                if (!code) continue;
                try {
                    if (isPostgres) {
                        await sequelize.query(
                            `INSERT INTO master_material_groups (mg_code, short_description, long_description) VALUES ($1, $2, $3) ON CONFLICT (mg_code) DO NOTHING`,
                            { bind: [code, short, long] }
                        );
                    } else {
                        await sequelize.query(
                            `INSERT OR IGNORE INTO master_material_groups (mg_code, short_description, long_description) VALUES (?, ?, ?)`,
                            { replacements: [code, short, long] }
                        );
                    }
                    mgIns++;
                } catch (_) {}
            }
        } catch (e) { console.warn('MG seed skip:', e.message); }

        // UOM
        try {
            const wb = XLSX.readFile(path.join(DATA_DIR, 'Plant Details.xlsx'));
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet2'], { defval: '' });
            for (const r of rows) {
                const code = String(r['Bace UOM'] || '').trim();
                const desc = String(r['UOM Description'] || '').trim();
                if (!code || code.includes('\t') || code.length > 10) continue;
                try {
                    if (isPostgres) {
                        await sequelize.query(
                            `INSERT INTO master_uom (uom_code, uom_description) VALUES ($1, $2) ON CONFLICT (uom_code) DO NOTHING`,
                            { bind: [code, desc] }
                        );
                    } else {
                        await sequelize.query(
                            `INSERT OR IGNORE INTO master_uom (uom_code, uom_description) VALUES (?, ?)`,
                            { replacements: [code, desc] }
                        );
                    }
                    uomIns++;
                } catch (_) {}
            }
        } catch (e) { console.warn('UOM seed skip:', e.message); }

        // Plants
        try {
            const wb = XLSX.readFile(path.join(DATA_DIR, 'All Plants.xlsx'));
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            for (const r of rows) {
                const plant = String(r['Plant '] || r['Plant'] || '').trim();
                const sloc  = String(r['Storage Location'] || '').trim();
                const desc  = String(r['Storage Location description'] || '').trim();
                if (!plant || !sloc) continue;
                try {
                    if (isPostgres) {
                        await sequelize.query(
                            `INSERT INTO master_plants (plant, storage_location, storage_location_desc) VALUES ($1, $2, $3) ON CONFLICT (plant, storage_location) DO NOTHING`,
                            { bind: [plant, sloc, desc] }
                        );
                    } else {
                        await sequelize.query(
                            `INSERT OR IGNORE INTO master_plants (plant, storage_location, storage_location_desc) VALUES (?, ?, ?)`,
                            { replacements: [plant, sloc, desc] }
                        );
                    }
                    plantIns++;
                } catch (_) {}
            }
        } catch (e) { console.warn('Plants seed skip:', e.message); }

        // Material Descriptions for duplicate detection (86k records)
        try {
            const wb2 = XLSX.readFile(path.join(DATA_DIR, 'All Material Types.XLSX'));
            const descRows = XLSX.utils.sheet_to_json(wb2.Sheets['Sheet1'], { defval: '' });
            const { normalizeDescription } = require('../utils/searchHelper');
            let descIns = 0;
            for (const r of descRows) {
                const orig = String(r['Material description'] || '').trim();
                const mtype = String(r['MTyp'] || '').trim();
                const mcode = String(r['Material'] || '').trim();
                if (!orig || orig.length < 3) continue;
                const normKey = normalizeDescription(orig);
                try {
                    if (isPostgres) {
                        await sequelize.query(
                            `INSERT INTO material_descriptions (original_description, normalized_key, source, material_type, material_code) VALUES ($1, $2, 'excel', $3, $4) ON CONFLICT DO NOTHING`,
                            { bind: [orig, normKey, mtype, mcode] }
                        );
                    } else {
                        await sequelize.query(
                            `INSERT OR IGNORE INTO material_descriptions (original_description, normalized_key, source, material_type, material_code) VALUES (?, ?, 'excel', ?, ?)`,
                            { replacements: [orig, normKey, mtype, mcode] }
                        );
                    }
                    descIns++;
                } catch (_) {}
            }
            if (descIns > 0) console.log(`✅ Material descriptions seeded: ${descIns} records`);
        } catch (e) { console.warn('Descriptions seed skip:', e.message); }

        console.log(`✅ Master data seeded — MG:${mgIns} UOM:${uomIns} Plants:${plantIns}`);
    } catch (err) {
        console.warn('⚠️ Master data auto-seed failed (non-critical):', err.message);
    }
};

