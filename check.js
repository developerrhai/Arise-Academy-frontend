const db = require('./backend/src/config/db');

async function test() {
  const [students] = await db.query('SELECT id, name FROM students WHERE biometric_code="5001"');
  if (students.length === 0) { console.log('not found'); return; }
  const uid = students[0].id;
  const [att] = await db.query('SELECT * FROM attendance WHERE user_id = ?', [uid]);
  console.log(att);
  process.exit(0);
}

test().catch(console.error);
