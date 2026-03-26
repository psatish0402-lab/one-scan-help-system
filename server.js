const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'one-scan-help-system-secret-key-2025';
const DB_PATH = path.join(__dirname, 'data.db');

// ===== EXPRESS SETUP =====
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== DATABASE =====
let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      detail TEXT DEFAULT '',
      link TEXT DEFAULT '',
      video TEXT DEFAULT '',
      status TEXT DEFAULT 'active'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT NOT NULL
    )
  `);

  seedDatabase();
  saveDb();
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ===== SEED DATA =====
function seedDatabase() {
  const adminCount = queryOne('SELECT COUNT(*) as count FROM admin_users');
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO admin_users (username, password) VALUES (?, ?)', ['admin', hash]);
    console.log('✅ Default admin created (admin / admin123)');
  }

  const formCount = queryOne('SELECT COUNT(*) as count FROM forms');
  if (formCount.count === 0) {
    const seedForms = [
      ['PAN Card Application (Form 49A)', 'id', 'Apply for a new PAN card for Indian citizens', 'Form 49A is used by Indian citizens to apply for a Permanent Account Number (PAN). Required for filing income tax returns, opening bank accounts, and financial transactions above ₹50,000. Documents needed: Aadhaar card, passport-size photo, address proof.', 'https://www.incometax.gov.in/iec/foportal/', 'https://www.youtube.com/watch?v=ZXJcEI7L_mc'],
      ['Aadhaar Card Enrollment Form', 'id', 'Enroll for a new Aadhaar number at your nearest center', 'The Aadhaar Enrollment Form is used to register for a 12-digit Unique Identification Number issued by UIDAI. Visit any Aadhaar Enrollment Center with proof of identity (passport, voter ID) and proof of address. Biometric data (fingerprints, iris scan) is also collected.', 'https://uidai.gov.in/', 'https://www.youtube.com/watch?v=lhJWLl0R2BU'],
      ['Voter ID Registration (Form 6)', 'gov', 'Register as a voter or get your voter ID card', 'Form 6 is used for new voter registration in the Electoral Roll. Eligible for Indian citizens who have turned 18 years. Documents needed: Age proof (birth certificate or class 10 marksheet), address proof (Aadhaar card, utility bill), and a passport-size photo.', 'https://voters.eci.gov.in/', 'https://www.youtube.com/watch?v=WtPDMhm9sBc'],
      ['Bank Account Opening Form (SBI)', 'bank', 'Open a savings or current account with State Bank of India', 'To open a savings account at SBI, fill the Account Opening Form available at any SBI branch. Required documents: KYC documents (Aadhaar + PAN), 2 passport-size photos, initial deposit. You can also open an account online via the YONO SBI app.', 'https://sbi.co.in/', 'https://www.youtube.com/watch?v=ZXJcEI7L_mc'],
      ['Passport Application (Form SP-1)', 'gov', 'Apply for a fresh or reissue of Indian passport', 'Form SP-1 is used to apply for a fresh passport or re-issue an existing one. Apply online at Passport Seva Portal. Documents required: Aadhaar card, PAN card, address proof, birth certificate, 2 passport-size photos (white background). Appointment is mandatory.', 'https://passportindia.gov.in/', 'https://www.youtube.com/watch?v=KjCJf3Y7H3A'],
      ['PM Kisan Samman Nidhi Form', 'gov', 'Register for ₹6,000 per year direct benefit for farmers', 'The PM-KISAN scheme provides ₹6,000 per year to small and marginal farmers in three equal installments. Farmers must register via the PM-KISAN portal or Common Service Centre (CSC). Required: Aadhaar card, land records, bank account linked with Aadhaar.', 'https://pmkisan.gov.in/', 'https://www.youtube.com/watch?v=mU8K2mJWVsg'],
      ['Ayushman Bharat Health Card', 'health', 'Get free health insurance cover up to ₹5 lakh per year', 'Under the Pradhan Mantri Jan Arogya Yojana (PM-JAY), eligible families get health insurance of up to ₹5 lakh per year for secondary and tertiary hospitalization. Eligibility is based on SECC 2011 database. Apply at Ayushman Bharat centers or online with Aadhaar.', 'https://pmjay.gov.in/', ''],
      ['Jan Dhan Yojana Account Form', 'bank', 'Open a zero-balance account under PMJDY scheme', 'Under Pradhan Mantri Jan Dhan Yojana, eligible individuals can open a zero-balance savings account at any bank. Benefits include: RuPay debit card, accidental insurance of ₹2 lakh, overdraft facility up to ₹10,000. Documents: Aadhaar card or any valid KYC document.', 'https://pmjdy.gov.in/', 'https://www.youtube.com/watch?v=mU8K2mJWVsg']
    ];
    for (const f of seedForms) {
      db.run('INSERT INTO forms (name, category, description, detail, link, video) VALUES (?,?,?,?,?,?)', f);
    }
    console.log(`✅ Seeded ${seedForms.length} forms`);
  }

  const videoCount = queryOne('SELECT COUNT(*) as count FROM videos');
  if (videoCount.count === 0) {
    const seedVideos = [
      ['How to Apply for PAN Card Online', 'Step-by-step guide to applying for a new PAN card through the official Income Tax portal.', 'https://www.youtube.com/watch?v=ZXJcEI7L_mc'],
      ['Aadhaar Card Enrollment Process', 'Complete guide for visiting an Aadhaar Enrollment Center and getting your Aadhaar card.', 'https://www.youtube.com/watch?v=lhJWLl0R2BU'],
      ['How to Register as a Voter (Form 6)', 'Learn how to fill Form 6 and register yourself as a voter on the NVSP portal.', 'https://www.youtube.com/watch?v=WtPDMhm9sBc'],
      ['Applying for Indian Passport Online', 'Full walkthrough of the Passport Seva Portal and how to book an appointment.', 'https://www.youtube.com/watch?v=KjCJf3Y7H3A']
    ];
    for (const v of seedVideos) {
      db.run('INSERT INTO videos (title, description, url) VALUES (?,?,?)', v);
    }
    console.log(`✅ Seeded ${seedVideos.length} videos`);
  }
}

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  const user = queryOne('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username });
});

// ===== FORMS API =====
app.get('/api/forms', (req, res) => {
  let sql = 'SELECT * FROM forms WHERE 1=1';
  const params = [];
  if (req.query.category && req.query.category !== 'all') { sql += ' AND category = ?'; params.push(req.query.category); }
  if (req.query.search) { const s = `%${req.query.search}%`; sql += ' AND (name LIKE ? OR description LIKE ? OR detail LIKE ?)'; params.push(s, s, s); }
  sql += ' ORDER BY id ASC';
  res.json(queryAll(sql, params));
});

app.post('/api/forms', authMiddleware, (req, res) => {
  const { name, category, description, detail, link, video } = req.body;
  if (!name || !category || !description) return res.status(400).json({ error: 'Name, category, and description are required' });
  runSql('INSERT INTO forms (name, category, description, detail, link, video) VALUES (?,?,?,?,?,?)', [name, category, description, detail || '', link || '', video || '']);
  const id = queryOne('SELECT last_insert_rowid() as id').id;
  res.status(201).json(queryOne('SELECT * FROM forms WHERE id = ?', [id]));
});

app.put('/api/forms/:id', authMiddleware, (req, res) => {
  const { name, category, description, detail, link, video } = req.body;
  if (!name || !category || !description) return res.status(400).json({ error: 'Name, category, and description are required' });
  if (!queryOne('SELECT * FROM forms WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'Form not found' });
  runSql('UPDATE forms SET name=?, category=?, description=?, detail=?, link=?, video=? WHERE id=?', [name, category, description, detail || '', link || '', video || '', req.params.id]);
  res.json(queryOne('SELECT * FROM forms WHERE id = ?', [req.params.id]));
});

app.delete('/api/forms/:id', authMiddleware, (req, res) => {
  if (!queryOne('SELECT * FROM forms WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'Form not found' });
  runSql('DELETE FROM forms WHERE id = ?', [req.params.id]);
  res.json({ message: 'Form deleted successfully' });
});

// ===== VIDEOS API =====
app.get('/api/videos', (req, res) => { res.json(queryAll('SELECT * FROM videos ORDER BY id ASC')); });

app.post('/api/videos', authMiddleware, (req, res) => {
  const { title, description, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  runSql('INSERT INTO videos (title, description, url) VALUES (?,?,?)', [title, description || '', url]);
  const id = queryOne('SELECT last_insert_rowid() as id').id;
  res.status(201).json(queryOne('SELECT * FROM videos WHERE id = ?', [id]));
});

app.put('/api/videos/:id', authMiddleware, (req, res) => {
  const { title, description, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  if (!queryOne('SELECT * FROM videos WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'Video not found' });
  runSql('UPDATE videos SET title=?, description=?, url=? WHERE id=?', [title, description || '', url, req.params.id]);
  res.json(queryOne('SELECT * FROM videos WHERE id = ?', [req.params.id]));
});

app.delete('/api/videos/:id', authMiddleware, (req, res) => {
  if (!queryOne('SELECT * FROM videos WHERE id = ?', [req.params.id])) return res.status(404).json({ error: 'Video not found' });
  runSql('DELETE FROM videos WHERE id = ?', [req.params.id]);
  res.json({ message: 'Video deleted successfully' });
});

// ===== STATS API =====
app.get('/api/stats', authMiddleware, (req, res) => {
  res.json({
    totalForms: queryOne('SELECT COUNT(*) as count FROM forms').count,
    totalVideos: queryOne('SELECT COUNT(*) as count FROM videos').count,
    govForms: queryOne("SELECT COUNT(*) as count FROM forms WHERE category='gov'").count,
    bankForms: queryOne("SELECT COUNT(*) as count FROM forms WHERE category='bank'").count,
    healthForms: queryOne("SELECT COUNT(*) as count FROM forms WHERE category='health'").count,
    idForms: queryOne("SELECT COUNT(*) as count FROM forms WHERE category='id'").count
  });
});

// ===== ROUTES =====
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

// ===== CATCH-ALL =====
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// ===== START =====
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 One Scan Help System is running!`);
    console.log(`   → http://localhost:${PORT}\n`);
  });
});
