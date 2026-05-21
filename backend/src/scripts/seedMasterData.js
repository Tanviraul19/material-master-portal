/**
 * seedMasterData.js — Import Plant Details.xlsx + All Plants.xlsx into master tables
 * Run: node src/scripts/seedMasterData.js
 */
const path = require('path');
const XLSX = require('xlsx');
const { sequelize } = require('../config/db');

const DATA_DIR = path.join(__dirname, '../../../data');

async function run() {
  // Ensure all master tables exist first
  await sequelize.query(`CREATE TABLE IF NOT EXISTS master_material_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT, mg_code TEXT UNIQUE NOT NULL,
    short_description TEXT, long_description TEXT)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_mg_code ON master_material_groups(mg_code)`);
  await sequelize.query(`CREATE TABLE IF NOT EXISTS master_uom (
    id INTEGER PRIMARY KEY AUTOINCREMENT, uom_code TEXT UNIQUE NOT NULL, uom_description TEXT)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_uom_code ON master_uom(uom_code)`);
  await sequelize.query(`CREATE TABLE IF NOT EXISTS master_purchase_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT, pg_code TEXT UNIQUE NOT NULL, pg_description TEXT)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_pg_code ON master_purchase_groups(pg_code)`);
  await sequelize.query(`CREATE TABLE IF NOT EXISTS master_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT, plant TEXT NOT NULL,
    storage_location TEXT NOT NULL, storage_location_desc TEXT, UNIQUE(plant, storage_location))`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_plants_plant ON master_plants(plant)`);
  console.log('Tables ready.');

  // ── 1. Material Groups (Plant Details Sheet1) ──────────────────────────────
  console.log('\n📂 Importing Material Groups...');
  const wbPD = XLSX.readFile(path.join(DATA_DIR, 'Plant Details.xlsx'));
  const mgRows = XLSX.utils.sheet_to_json(wbPD.Sheets['Sheet1'], { defval: '' });
  let mgInserted = 0, mgSkipped = 0;
  for (const r of mgRows) {
    const code = String(r['Material Group'] || '').trim();
    const shortDesc = String(r['Short Description'] || '').trim();
    const longDesc = String(r['Long Description'] || '').trim();
    if (!code) { mgSkipped++; continue; }
    try {
      await sequelize.query(
        `INSERT OR IGNORE INTO master_material_groups (mg_code, short_description, long_description) VALUES (?,?,?)`,
        { replacements: [code, shortDesc, longDesc] }
      );
      mgInserted++;
    } catch (_) { mgSkipped++; }
  }
  console.log(`  Material Groups: ${mgInserted} inserted, ${mgSkipped} skipped`);

  // ── 2. UOM (Plant Details Sheet2) ─────────────────────────────────────────
  console.log('📂 Importing UOM...');
  const uomRows = XLSX.utils.sheet_to_json(wbPD.Sheets['Sheet2'], { defval: '' });
  let uomInserted = 0, uomSkipped = 0;
  for (const r of uomRows) {
    const code = String(r['Bace UOM'] || '').trim();
    const desc = String(r['UOM Description'] || '').trim();
    if (!code || code.includes('\t') || code.length > 10) { uomSkipped++; continue; }
    try {
      await sequelize.query(
        `INSERT OR IGNORE INTO master_uom (uom_code, uom_description) VALUES (?,?)`,
        { replacements: [code, desc] }
      );
      uomInserted++;
    } catch (_) { uomSkipped++; }
  }
  console.log(`  UOM: ${uomInserted} inserted, ${uomSkipped} skipped`);

  // ── 3. Purchasing Groups (Plant Details Sheet3) ────────────────────────────
  console.log('📂 Importing Purchasing Groups...');
  const pgRows = XLSX.utils.sheet_to_json(wbPD.Sheets['Sheet3'], { defval: '' });
  let pgInserted = 0, pgSkipped = 0;
  for (const r of pgRows) {
    const code = String(r['Purchasing Gro'] || '').trim();
    const desc = String(r['Desctiption'] || '').trim();
    if (!code) { pgSkipped++; continue; }
    try {
      await sequelize.query(
        `INSERT OR IGNORE INTO master_purchase_groups (pg_code, pg_description) VALUES (?,?)`,
        { replacements: [code, desc] }
      );
      pgInserted++;
    } catch (_) { pgSkipped++; }
  }
  console.log(`  Purchasing Groups: ${pgInserted} inserted, ${pgSkipped} skipped`);

  // ── 4. Plants + Storage Locations (All Plants.xlsx) ───────────────────────
  console.log('📂 Importing Plants & Storage Locations...');
  const wbAP = XLSX.readFile(path.join(DATA_DIR, 'All Plants.xlsx'));
  const plantRows = XLSX.utils.sheet_to_json(wbAP.Sheets['Plant List'], { defval: '' });
  let plantInserted = 0, plantSkipped = 0;
  for (const r of plantRows) {
    const plant = String(r['Plant '] || '').trim();
    const sloc = String(r['Storage Location'] || '').trim();
    const slocDesc = String(r['Storage Location description'] || '').trim();
    if (!plant || !sloc) { plantSkipped++; continue; }
    try {
      await sequelize.query(
        `INSERT OR IGNORE INTO master_plants (plant, storage_location, storage_location_desc) VALUES (?,?,?)`,
        { replacements: [plant, sloc, slocDesc] }
      );
      plantInserted++;
    } catch (_) { plantSkipped++; }
  }
  console.log(`  Plants/SLoc: ${plantInserted} inserted, ${plantSkipped} skipped`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    sequelize.query('SELECT COUNT(*) as c FROM master_material_groups', { type: sequelize.constructor.QueryTypes.SELECT }),
    sequelize.query('SELECT COUNT(*) as c FROM master_uom', { type: sequelize.constructor.QueryTypes.SELECT }),
    sequelize.query('SELECT COUNT(*) as c FROM master_purchase_groups', { type: sequelize.constructor.QueryTypes.SELECT }),
    sequelize.query('SELECT COUNT(*) as c FROM master_plants', { type: sequelize.constructor.QueryTypes.SELECT }),
  ]);
  console.log('\n✅ Master data import complete!');
  console.log(`  Material Groups : ${counts[0][0].c}`);
  console.log(`  UOM             : ${counts[1][0].c}`);
  console.log(`  Purchase Groups : ${counts[2][0].c}`);
  console.log(`  Plants/SLoc     : ${counts[3][0].c}`);
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
