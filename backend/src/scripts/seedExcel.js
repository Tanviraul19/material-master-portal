/**
 * seedExcel.js — Fast bulk import of All Material Types.xlsx
 * Uses SQLite transactions: inserts ~86k rows in seconds.
 * Run: node src/scripts/seedExcel.js
 */
const path = require('path');
const XLSX = require('xlsx');
const { sequelize } = require('../config/db');
const { normalizeDescription } = require('../utils/searchHelper');

const EXCEL_PATH = path.join(__dirname, '../../../data/All Material Types.xlsx');
const BATCH_SIZE = 1000;

async function run() {
  console.log('Reading Excel file...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Total rows in Excel:', raw.length.toLocaleString());

  if (raw.length === 0) { console.error('No rows found'); process.exit(1); }

  const keys = Object.keys(raw[0]);
  const codeKey = keys[0];
  const descKey = keys.find(k => /desc/i.test(k) || /material.?name/i.test(k)) || keys[0];
  const typeKey = keys.find(k => /mtyp/i.test(k) || /mat.?type/i.test(k) || /^type$/i.test(k));
  console.log('Code column:', codeKey);
  console.log('Description column:', descKey);
  console.log('Type column:', typeKey || 'none');

  // Ensure table + index exist
  await sequelize.query(`CREATE TABLE IF NOT EXISTS material_descriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_description TEXT NOT NULL,
    normalized_key TEXT NOT NULL,
    source TEXT DEFAULT 'excel',
    material_type TEXT,
    material_code TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_mat_desc_norm_key ON material_descriptions(normalized_key)'
  );

  // Load all existing keys into memory for O(1) dedup
  const existingRows = await sequelize.query(
    'SELECT normalized_key FROM material_descriptions',
    { type: sequelize.constructor.QueryTypes.SELECT }
  );
  const keySet = new Set(existingRows.map(r => r.normalized_key));
  console.log('Existing keys in DB:', keySet.size.toLocaleString());

  // Build new rows only
  const newRows = [];
  for (const r of raw) {
    const desc = String(r[descKey] || '').trim();
    if (!desc || desc.length < 2) continue;
    const normKey = normalizeDescription(desc);
    if (!normKey || keySet.has(normKey)) continue;
    keySet.add(normKey); // prevent in-batch duplicates too
    const code = String(r[codeKey] || '').trim();
    newRows.push({ desc, normKey, mtype: typeKey ? String(r[typeKey] || '').trim() : '', code });
  }
  console.log('New rows to insert:', newRows.length.toLocaleString());

  if (newRows.length === 0) {
    const [c] = await sequelize.query('SELECT COUNT(*) as cnt FROM material_descriptions',
      { type: sequelize.constructor.QueryTypes.SELECT });
    console.log('Nothing new. Total in DB:', c.cnt.toLocaleString());
    process.exit(0);
  }

  // Insert in batches with transactions
  let inserted = 0;
  let failed = 0;
  const totalBatches = Math.ceil(newRows.length / BATCH_SIZE);
  console.log('Inserting in', totalBatches, 'batches...');

  for (let b = 0; b < totalBatches; b++) {
    const batch = newRows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const t = await sequelize.transaction();
    try {
      for (const row of batch) {
        await sequelize.query(
          `INSERT INTO material_descriptions (original_description, normalized_key, source, material_type, material_code)
           VALUES (?, ?, 'excel', ?, ?)`,
          { replacements: [row.desc, row.normKey, row.mtype, row.code], transaction: t }
        );
        inserted++;
      }
      await t.commit();
      const pct = Math.round(((b + 1) / totalBatches) * 100);
      process.stdout.write('\r  Progress: ' + pct + '% (' + inserted.toLocaleString() + ' inserted)');
    } catch (err) {
      await t.rollback();
      failed += batch.length;
      console.error('\nBatch', b + 1, 'failed:', err.message);
    }
  }

  const [final] = await sequelize.query('SELECT COUNT(*) as cnt FROM material_descriptions',
    { type: sequelize.constructor.QueryTypes.SELECT });
  console.log('\n\nImport complete!');
  console.log('  Inserted :', inserted.toLocaleString());
  console.log('  Failed   :', failed);
  console.log('  Total DB :', final.cnt.toLocaleString());
  process.exit(0);
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
