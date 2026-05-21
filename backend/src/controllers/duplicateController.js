 const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const db = require('../config/db');
const { normalizeDescription, similarityScore, DUPLICATE_THRESHOLD } = require('../utils/searchHelper');

// ─────────────────────────────────────────────
// GET /api/duplicate/suggest?q=...
// Substring search — returns existing descriptions containing the query.
// Used for the live suggestion list while user types (view-only, no selection).
// ─────────────────────────────────────────────
exports.suggestDescriptions = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ suggestions: [], total: 0 });

  try {
    const term = `%${q.trim()}%`;


    // Search material_descriptions (Excel master)
    const fromMaster = await db.query(
      `SELECT original_description, source, material_type, material_code
       FROM material_descriptions
       WHERE LOWER(original_description) LIKE LOWER(?)
       ORDER BY length(original_description) ASC
       LIMIT 20`,

      [term]
    );

    // Search material_requests (submitted requests)
    const fromRequests = await db.query(
      `SELECT description as original_description, 'request' as source, material_type, req_number as material_code
       FROM material_requests
       WHERE LOWER(description) LIKE LOWER(?) AND description IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 10`,

      [term]
    );

    // Count total matches
    const [masterCount] = await db.query(
      `SELECT COUNT(*) as cnt FROM material_descriptions WHERE LOWER(original_description) LIKE LOWER(?)`,
      [term]
    );

    const [reqCount] = await db.query(
      `SELECT COUNT(*) as cnt FROM material_requests WHERE LOWER(description) LIKE LOWER(?) AND description IS NOT NULL`,
      [term]
    );


    const suggestions = [
      ...fromMaster.map(r => ({
        description: r.original_description,
        source: r.source || 'excel',
        material_type: r.material_type || '',
        material_code: r.material_code || '',
      })),
      ...fromRequests.map(r => ({
        description: r.original_description,
        source: 'request',
        material_type: r.material_type || '',
        material_code: r.material_code || '',
      })),
    ].slice(0, 20);


    res.json({
      suggestions,
      total: (masterCount?.cnt || 0) + (reqCount?.cnt || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/duplicate/check?description=...
// Returns top matches with similarity % from both
// material_descriptions (Excel) and material_requests (DB)
// ─────────────────────────────────────────────
exports.checkDuplicate = async (req, res) => {
  const { description } = req.query;
  if (!description || description.trim().length < 2) {
    return res.status(400).json({ error: 'Description too short' });
  }

  try {
    const inputNorm = normalizeDescription(description);

    // ── Step 1: Exact hash match (O(1) via index) ──
    const exactMatches = await db.query(
      `SELECT original_description, normalized_key, source, material_type
       FROM material_descriptions
       WHERE normalized_key = ?
       LIMIT 10`,
      [inputNorm]
    );

    // Also check material_requests for exact normalized match
    const reqExact = await db.query(
      `SELECT req_number as source_id, req_number as material_code, description as original_description, 'request' as source
       FROM material_requests
       WHERE description IS NOT NULL`,
      []
    );
    const reqExactMatches = reqExact.filter(r =>
      normalizeDescription(r.original_description) === inputNorm
    );

    if (exactMatches.length > 0 || reqExactMatches.length > 0) {
      const results = [
        ...exactMatches.map(m => ({
          original_description: m.original_description,
          source: m.source,
          material_type: m.material_type || '',
          material_code: m.material_code || '',
          similarity: 100,
          match_type: 'exact',
        })),
        ...reqExactMatches.map(m => ({
          original_description: m.original_description,
          source: `request:${m.source_id}`,
          material_type: '',
          material_code: m.material_code || '',
          similarity: 100,
          match_type: 'exact',
        })),
      ];
      return res.json({ duplicates: results.slice(0, 10), input_normalized: inputNorm });
    }

    // ── Step 2: Fuzzy match — candidate pre-filter using shared words ──
    const inputWords = inputNorm.split(' ').filter(Boolean);
    if (inputWords.length === 0) return res.json({ duplicates: [], input_normalized: inputNorm });

    // Build LIKE conditions for at least one shared word (reduces scan from 80k to ~hundreds)
    const likeClauses = inputWords.map(() => 'normalized_key LIKE ?').join(' OR ');
    const likeParams = inputWords.map(w => `%${w}%`);

    const candidates = await db.query(
      `SELECT original_description, normalized_key, source, material_type
       FROM material_descriptions
       WHERE ${likeClauses}
       LIMIT 500`,
      likeParams
    );

    // Score each candidate
    const scored = candidates
      .map(c => ({
        original_description: c.original_description,
        source: c.source,
        material_type: c.material_type || '',
        material_code: c.material_code || '',
        similarity: similarityScore(inputNorm, c.normalized_key),
        match_type: 'fuzzy',
      }))
      .filter(c => c.similarity >= DUPLICATE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    // Also fuzzy-check material_requests
    const reqFuzzy = reqExact
      .map(r => ({
        original_description: r.original_description,
        source: `request:${r.source_id}`,
        material_type: '',
        material_code: r.material_code || '',
        similarity: similarityScore(inputNorm, normalizeDescription(r.original_description)),
        match_type: 'fuzzy',
      }))
      .filter(r => r.similarity >= DUPLICATE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const allResults = [...scored, ...reqFuzzy]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    res.json({ duplicates: allResults, input_normalized: inputNorm });
  } catch (err) {
    console.error('checkDuplicate error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/duplicate/import  (multipart/form-data, field: file)
// Accepts .xlsx or .csv, imports descriptions in batches
// ─────────────────────────────────────────────
exports.importDescriptions = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let rows = [];

    if (ext === '.xlsx' || ext === '.xls') {
      rows = parseExcel(filePath);
    } else if (ext === '.csv') {
      rows = await parseCsv(filePath);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Only .xlsx and .csv files are supported' });
    }

    fs.unlinkSync(filePath); // clean up temp file

    const stats = { total: rows.length, imported: 0, duplicates: 0, failed: 0 };

    // Process in batches of 500 for performance
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      for (const row of batch) {
        const desc = String(row.description || '').trim();
        if (!desc || desc.length < 2) { stats.failed++; continue; }

        const normKey = normalizeDescription(desc);
        if (!normKey) { stats.failed++; continue; }

        try {
          // Check exact duplicate by normalized_key
          const existing = await db.query(
            'SELECT id FROM material_descriptions WHERE normalized_key = ? LIMIT 1',
            [normKey]
          );
          if (existing.length > 0) { stats.duplicates++; continue; }

          await db.execute(
            `INSERT INTO material_descriptions (original_description, normalized_key, source, material_type, material_code)
             VALUES (?, ?, ?, ?, ?)`,
            [desc, normKey, 'excel', row.material_type || '', row.material_code || '']
          );
          stats.imported++;
        } catch (_) {
          stats.failed++;
        }
      }
    }

    res.json({
      message: 'Import complete',
      stats,
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('importDescriptions error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/duplicate/stats
// ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as cnt FROM material_descriptions');
    const [excel] = await db.query("SELECT COUNT(*) as cnt FROM material_descriptions WHERE source = 'excel'");
    const [manual] = await db.query("SELECT COUNT(*) as cnt FROM material_descriptions WHERE source = 'manual'");
    const [lastImport] = await db.query(
      'SELECT MAX(imported_at) as last FROM material_descriptions'
    );
    res.json({
      total: total?.cnt || 0,
      excel: excel?.cnt || 0,
      manual: manual?.cnt || 0,
      last_import: lastImport?.last || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Auto-detect description column (case-insensitive)
  if (raw.length === 0) return [];
  const keys = Object.keys(raw[0]);
  // First column is always the material code (SAP number)
  const codeKey = keys[0];
  const descKey = keys.find(k =>
    /desc/i.test(k) || /material.?name/i.test(k) || /short.?desc/i.test(k) || /name/i.test(k)
  ) || keys[1] || keys[0];
  const typeKey = keys.find(k => /mtyp/i.test(k) || /mat.?type/i.test(k) || /^type$/i.test(k));

  return raw.map(r => ({
    material_code: String(r[codeKey] || '').trim(),
    description: String(r[descKey] || '').trim(),
    material_type: typeKey ? String(r[typeKey] || '').trim() : '',
  }));
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const keys = Object.keys(row);
        const codeKey = keys[0];
        const descKey = keys.find(k =>
          /desc/i.test(k) || /material.?name/i.test(k) || /name/i.test(k)
        ) || keys[1] || keys[0];
        const typeKey = keys.find(k => /type/i.test(k));
        rows.push({
          material_code: String(row[codeKey] || '').trim(),
          description: String(row[descKey] || '').trim(),
          material_type: typeKey ? String(row[typeKey] || '').trim() : '',
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}
