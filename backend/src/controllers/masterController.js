'use strict';
const db = require('../config/db');
const { sequelize } = require('../config/db');

const isPostgres = !!process.env.DATABASE_URL;

// Helper: build search query — handles PostgreSQL (ILIKE, $n params) and SQLite (LIKE, ?)
const searchQuery = async (table, codeCol, descCol, q, limit = 50) => {
  const lim = parseInt(limit) || 50;

  if (!q || q.trim() === '') {
    if (isPostgres) {
      const [rows] = await sequelize.query(
        `SELECT ${codeCol} as code, ${descCol} as description FROM ${table} ORDER BY ${codeCol} LIMIT ${lim}`
      );
      return rows;
    }
    return db.query(
      `SELECT ${codeCol} as code, ${descCol} as description FROM ${table} ORDER BY ${codeCol} LIMIT ?`,
      [lim]
    );
  }

  const term = `%${q.trim()}%`;
  if (isPostgres) {
    const [rows] = await sequelize.query(
      `SELECT ${codeCol} as code, ${descCol} as description FROM ${table}
       WHERE ${codeCol} ILIKE $1 OR ${descCol} ILIKE $1
       ORDER BY CASE WHEN ${codeCol} ILIKE $2 THEN 0 ELSE 1 END, ${codeCol}
       LIMIT ${lim}`,
      { bind: [term, `${q.trim()}%`] }
    );
    return rows;
  }

  return db.query(
    `SELECT ${codeCol} as code, ${descCol} as description FROM ${table}
     WHERE ${codeCol} LIKE ? OR ${descCol} LIKE ?
     ORDER BY CASE WHEN ${codeCol} LIKE ? THEN 0 ELSE 1 END, ${codeCol}
     LIMIT ?`,
    [term, term, `${q.trim()}%`, lim]
  );
};

// GET /api/master/material-groups?q=&limit=
exports.getMaterialGroups = async (req, res) => {
  try {
    const rows = await searchQuery('master_material_groups', 'mg_code', 'long_description', req.query.q, req.query.limit || 50);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/uom?q=
exports.getUOM = async (req, res) => {
  try {
    const rows = await searchQuery('master_uom', 'uom_code', 'uom_description', req.query.q, req.query.limit || 50);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/uom/:code
exports.getUOMByCode = async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT uom_code as code, uom_description as description FROM master_uom WHERE uom_code = ? LIMIT 1',
      [req.params.code]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/purchase-groups?q=
exports.getPurchaseGroups = async (req, res) => {
  try {
    const rows = await searchQuery('master_purchase_groups', 'pg_code', 'pg_description', req.query.q, req.query.limit || 50);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/purchase-groups/:code
exports.getPurchaseGroupByCode = async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT pg_code as code, pg_description as description FROM master_purchase_groups WHERE pg_code = ? LIMIT 1',
      [req.params.code]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/plants?q=
exports.getPlants = async (req, res) => {
  try {
    const q = req.query.q || '';
    let rows;
    if (isPostgres) {
      if (q) {
        const [r] = await sequelize.query(
          `SELECT DISTINCT plant as code FROM master_plants WHERE plant ILIKE $1 ORDER BY plant LIMIT 50`,
          { bind: [`%${q}%`] }
        );
        rows = r;
      } else {
        const [r] = await sequelize.query(
          `SELECT DISTINCT plant as code FROM master_plants ORDER BY plant LIMIT 50`
        );
        rows = r;
      }
    } else {
      const term = `%${q}%`;
      rows = q
        ? await db.query(`SELECT DISTINCT plant as code FROM master_plants WHERE plant LIKE ? ORDER BY plant LIMIT 50`, [term])
        : await db.query(`SELECT DISTINCT plant as code FROM master_plants ORDER BY plant LIMIT 50`);
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/storage-locations?plant=&q=
exports.getStorageLocations = async (req, res) => {
  try {
    const { plant, q } = req.query;
    const term = `%${q || ''}%`;
    let rows;

    if (isPostgres) {
      if (plant) {
        if (q) {
          const [r] = await sequelize.query(
            `SELECT storage_location as code, storage_location_desc as description
             FROM master_plants WHERE plant = $1
             AND (storage_location ILIKE $2 OR storage_location_desc ILIKE $2)
             ORDER BY storage_location LIMIT 100`,
            { bind: [plant, term] }
          );
          rows = r;
        } else {
          const [r] = await sequelize.query(
            `SELECT storage_location as code, storage_location_desc as description
             FROM master_plants WHERE plant = $1 ORDER BY storage_location LIMIT 100`,
            { bind: [plant] }
          );
          rows = r;
        }
      } else {
        if (q) {
          const [r] = await sequelize.query(
            `SELECT storage_location as code, storage_location_desc as description
             FROM master_plants WHERE storage_location ILIKE $1 OR storage_location_desc ILIKE $1
             ORDER BY storage_location LIMIT 100`,
            { bind: [term] }
          );
          rows = r;
        } else {
          const [r] = await sequelize.query(
            `SELECT storage_location as code, storage_location_desc as description
             FROM master_plants ORDER BY storage_location LIMIT 100`
          );
          rows = r;
        }
      }
    } else {
      if (plant) {
        rows = q
          ? await db.query(
              `SELECT storage_location as code, storage_location_desc as description
               FROM master_plants WHERE plant = ? AND (storage_location LIKE ? OR storage_location_desc LIKE ?)
               ORDER BY storage_location LIMIT 100`,
              [plant, term, term]
            )
          : await db.query(
              `SELECT storage_location as code, storage_location_desc as description
               FROM master_plants WHERE plant = ? ORDER BY storage_location LIMIT 100`,
              [plant]
            );
      } else {
        rows = q
          ? await db.query(
              `SELECT storage_location as code, storage_location_desc as description
               FROM master_plants WHERE storage_location LIKE ? OR storage_location_desc LIKE ?
               ORDER BY storage_location LIMIT 100`,
              [term, term]
            )
          : await db.query(
              `SELECT storage_location as code, storage_location_desc as description
               FROM master_plants ORDER BY storage_location LIMIT 100`
            );
      }
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/storage-locations/:plant/:sloc
exports.getStorageLocationByCode = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT storage_location as code, storage_location_desc as description
       FROM master_plants WHERE plant = ? AND storage_location = ? LIMIT 1`,
      [req.params.plant, req.params.sloc]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/stats
exports.getStats = async (req, res) => {
  try {
    let stats;
    if (isPostgres) {
      const [[mg]] = await sequelize.query(`SELECT COUNT(*) as cnt FROM master_material_groups`);
      const [[uom]] = await sequelize.query(`SELECT COUNT(*) as cnt FROM master_uom`);
      const [[pg]] = await sequelize.query(`SELECT COUNT(*) as cnt FROM master_purchase_groups`);
      const [[pl]] = await sequelize.query(`SELECT COUNT(DISTINCT plant) as cnt FROM master_plants`);
      const [[sl]] = await sequelize.query(`SELECT COUNT(*) as cnt FROM master_plants`);
      stats = {
        material_groups: parseInt(mg?.cnt || 0),
        uom: parseInt(uom?.cnt || 0),
        purchase_groups: parseInt(pg?.cnt || 0),
        plants: parseInt(pl?.cnt || 0),
        storage_locations: parseInt(sl?.cnt || 0),
      };
    } else {
      const [mg] = await db.query(`SELECT COUNT(*) as cnt FROM master_material_groups`);
      const [uom] = await db.query(`SELECT COUNT(*) as cnt FROM master_uom`);
      const [pg] = await db.query(`SELECT COUNT(*) as cnt FROM master_purchase_groups`);
      const [pl] = await db.query(`SELECT COUNT(DISTINCT plant) as cnt FROM master_plants`);
      const [sl] = await db.query(`SELECT COUNT(*) as cnt FROM master_plants`);
      stats = {
        material_groups: mg?.cnt || 0,
        uom: uom?.cnt || 0,
        purchase_groups: pg?.cnt || 0,
        plants: pl?.cnt || 0,
        storage_locations: sl?.cnt || 0,
      };
    }
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/control-codes?q= — search HSN/control codes
exports.getControlCodes = async (req, res) => {
  try {
    const q = req.query.q || '';
    let rows;
    if (isPostgres) {
      if (q) {
        const [r] = await sequelize.query(
          `SELECT control_code as code, description FROM master_control_codes
           WHERE control_code ILIKE $1 OR description ILIKE $1
           ORDER BY control_code LIMIT 50`,
          { bind: [`%${q}%`] }
        );
        rows = r;
      } else {
        const [r] = await sequelize.query(
          `SELECT control_code as code, description FROM master_control_codes ORDER BY control_code LIMIT 50`
        );
        rows = r;
      }
    } else {
      const term = `%${q}%`;
      rows = q
        ? await db.query(`SELECT control_code as code, description FROM master_control_codes WHERE control_code LIKE ? OR description LIKE ? ORDER BY control_code LIMIT 50`, [term, term])
        : await db.query(`SELECT control_code as code, description FROM master_control_codes ORDER BY control_code LIMIT 50`);
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/control-codes/validate/:code — check if code exists
exports.validateControlCode = async (req, res) => {
  try {
    const code = req.params.code;
    let rows;
    if (isPostgres) {
      const [r] = await sequelize.query(
        `SELECT control_code as code, description FROM master_control_codes WHERE control_code = $1 LIMIT 1`,
        { bind: [code] }
      );
      rows = r;
    } else {
      rows = await db.query(`SELECT control_code as code, description FROM master_control_codes WHERE control_code = ? LIMIT 1`, [code]);
    }
    if (rows.length > 0) {
      res.json({ valid: true, code: rows[0].code, description: rows[0].description });
    } else {
      res.json({ valid: false, message: `Control code "${code}" not found in HSN Master database.` });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
};
