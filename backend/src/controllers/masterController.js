const db = require('../config/db');

// Helper: build search query with LIKE
const searchQuery = async (table, codeCol, descCol, q, limit = 50) => {
  if (!q || q.trim() === '') {
    return db.query(`SELECT ${codeCol} as code, ${descCol} as description FROM ${table} ORDER BY ${codeCol} LIMIT ?`, [limit]);
  }
  const term = `%${q.trim()}%`;
  return db.query(
    `SELECT ${codeCol} as code, ${descCol} as description FROM ${table}
     WHERE ${codeCol} LIKE ? OR ${descCol} LIKE ?
     ORDER BY CASE WHEN ${codeCol} LIKE ? THEN 0 ELSE 1 END, ${codeCol}
     LIMIT ?`,
    [term, term, `${q.trim()}%`, limit]
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

// GET /api/master/uom/:code — get description for a specific UOM code
exports.getUOMByCode = async (req, res) => {
  try {
    const rows = await db.query('SELECT uom_code as code, uom_description as description FROM master_uom WHERE uom_code = ? LIMIT 1', [req.params.code]);
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
    const rows = await db.query('SELECT pg_code as code, pg_description as description FROM master_purchase_groups WHERE pg_code = ? LIMIT 1', [req.params.code]);
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/plants?q= — returns unique plant codes
exports.getPlants = async (req, res) => {
  try {
    const q = req.query.q || '';
    const term = `%${q}%`;
    const rows = q
      ? await db.query(`SELECT DISTINCT plant as code FROM master_plants WHERE plant LIKE ? ORDER BY plant LIMIT 50`, [term])
      : await db.query(`SELECT DISTINCT plant as code FROM master_plants ORDER BY plant LIMIT 50`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/storage-locations?plant=&q= — filtered by plant
exports.getStorageLocations = async (req, res) => {
  try {
    const { plant, q } = req.query;
    const term = `%${q || ''}%`;
    let rows;
    if (plant) {
      rows = q
        ? await db.query(
            `SELECT storage_location as code, storage_location_desc as description FROM master_plants
             WHERE plant = ? AND (storage_location LIKE ? OR storage_location_desc LIKE ?)
             ORDER BY storage_location LIMIT 100`,
            [plant, term, term]
          )
        : await db.query(
            `SELECT storage_location as code, storage_location_desc as description FROM master_plants
             WHERE plant = ? ORDER BY storage_location LIMIT 100`,
            [plant]
          );
    } else {
      rows = await db.query(
        `SELECT storage_location as code, storage_location_desc as description FROM master_plants
         WHERE storage_location LIKE ? OR storage_location_desc LIKE ?
         ORDER BY storage_location LIMIT 100`,
        [term, term]
      );
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/storage-locations/:plant/:sloc — get description
exports.getStorageLocationByCode = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT storage_location as code, storage_location_desc as description FROM master_plants
       WHERE plant = ? AND storage_location = ? LIMIT 1`,
      [req.params.plant, req.params.sloc]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/master/stats — counts for all master tables
exports.getStats = async (req, res) => {
  try {
    const [mg] = await db.query('SELECT COUNT(*) as c FROM master_material_groups');
    const [uom] = await db.query('SELECT COUNT(*) as c FROM master_uom');
    const [pg] = await db.query('SELECT COUNT(*) as c FROM master_purchase_groups');
    const [pl] = await db.query('SELECT COUNT(*) as c FROM master_plants');
    const [plants] = await db.query('SELECT COUNT(DISTINCT plant) as c FROM master_plants');
    res.json({
      material_groups: mg?.c || 0,
      uom: uom?.c || 0,
      purchase_groups: pg?.c || 0,
      plant_sloc_rows: pl?.c || 0,
      unique_plants: plants?.c || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
