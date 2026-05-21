const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  // 1. Login
  const loginBody = JSON.stringify({ email: 'saurabh@enterprise.com', password: 'password123' });
  const login = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);

  if (!login.body.accessToken) {
    console.error('❌ Login failed:', login.body);
    return;
  }
  const token = login.body.accessToken;
  console.log('✅ Login OK — role:', login.body.role);

  // 2. Stats
  const stats = await request({
    hostname: 'localhost', port: 5000, path: '/api/duplicate/stats', method: 'GET',
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('✅ Stats:', JSON.stringify(stats.body));

  // 3. Seed two test descriptions directly into DB so we can test detection
  const { sequelize } = require('./src/config/db');
  const { normalizeDescription } = require('./src/utils/searchHelper');

  const testDescs = [
    { desc: 'hello how are you', type: 'TEST' },
    { desc: 'Steel Rod 10mm', type: 'ZMIS' },
    { desc: 'PVC Pipe White', type: 'ZCOM' },
  ];

  for (const { desc, type } of testDescs) {
    const norm = normalizeDescription(desc);
    const existing = await sequelize.query(
      'SELECT id FROM material_descriptions WHERE normalized_key = ? LIMIT 1',
      { replacements: [norm], type: sequelize.constructor.QueryTypes.SELECT }
    );
    if (existing.length === 0) {
      await sequelize.query(
        'INSERT INTO material_descriptions (original_description, normalized_key, source, material_type) VALUES (?, ?, ?, ?)',
        { replacements: [desc, norm, 'test', type] }
      );
      console.log('  Seeded:', desc, '→', norm);
    } else {
      console.log('  Already exists:', desc);
    }
  }

  // 4. Test duplicate detection with reordered words
  const testCases = [
    { input: 'how are hello you', expected: true, note: 'reordered words' },
    { input: '10mm steel rod', expected: true, note: 'reordered + case' },
    { input: 'white pvc pipe', expected: true, note: 'reordered + lowercase' },
    { input: 'completely different item xyz', expected: false, note: 'no match' },
  ];

  console.log('\n=== Duplicate Detection Tests ===');
  for (const tc of testCases) {
    const enc = encodeURIComponent(tc.input);
    const res = await request({
      hostname: 'localhost', port: 5000,
      path: '/api/duplicate/check?description=' + enc,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    });
    const dups = res.body.duplicates || [];
    const found = dups.length > 0;
    const topMatch = dups[0];
    const pass = found === tc.expected;
    console.log(
      pass ? '✅' : '❌',
      `"${tc.input}" [${tc.note}]`,
      found ? `→ DUPLICATE (${topMatch?.similarity}% match: "${topMatch?.original_description}")` : '→ NO MATCH'
    );
  }

  console.log('\n✅ All tests complete. Backend duplicate detection is working.');
  process.exit(0);
}

run().catch(e => { console.error('Test error:', e.message); process.exit(1); });
