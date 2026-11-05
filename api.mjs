// Visit Sendang Duwur · seluruh API dalam satu Netlify Function (MySQL via mysql2)
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import BIZ from './seed-data.mjs';

export const config = { path: '/api/*' };

const env = k => (typeof Netlify !== 'undefined' && Netlify.env ? Netlify.env.get(k) : process.env[k]);
const ADMIN_EMAIL = () => (env('ADMIN_EMAIL') || '').toLowerCase();
const DEMO = () => env('DEMO_STAMPS') !== '0';
const GID = () => env('GOOGLE_CLIENT_ID'), GSEC = () => env('GOOGLE_CLIENT_SECRET');
const DAY = 864e5;

class HttpError extends Error { constructor(s, m, f) { super(m); this.status = s; this.fields = f; } }

/* ---------- database ---------- */
let pool = null, ready = null;
function getPool() {
  if (pool) return pool;
  const raw = env('DATABASE_URL');
  if (!raw) throw new HttpError(500, 'DATABASE_URL belum diisi di pengaturan Netlify.');
  const u = new URL(raw);
  pool = mysql.createPool({
    host: u.hostname, port: +u.port || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)), charset: 'utf8mb4', dateStrings: true, connectionLimit: 3, waitForConnections: true,
    ssl: u.searchParams.get('ssl') === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });
  return pool;
}
const q = async (sql, p = []) => { const [r] = await getPool().query(sql, p); return r; };
const one = async (sql, p) => (await q(sql, p))[0] || null;

const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
const DDL = [
  `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(60) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL, google_id VARCHAR(64) NULL UNIQUE, role ENUM('user','admin') NOT NULL DEFAULT 'user', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ${T}`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at BIGINT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sessions_user (user_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS spots (id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(40) NOT NULL UNIQUE, position INT NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, tagline VARCHAR(100) NOT NULL, qr_token VARCHAR(40) NOT NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS stamps (user_id INT NOT NULL, spot_id INT NOT NULL, stamped_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, spot_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS certificates (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, serial VARCHAR(40) NOT NULL UNIQUE, holder_name VARCHAR(60) NOT NULL, issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS reports (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, facility_type VARCHAR(60) NOT NULL, location VARCHAR(200) NOT NULL, description VARCHAR(1000) NOT NULL, reporter_name VARCHAR(60) NULL, status ENUM('baru','diproses','selesai') NOT NULL DEFAULT 'baru', admin_note VARCHAR(500) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_reports_status (status), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS announcements (id INT AUTO_INCREMENT PRIMARY KEY, category VARCHAR(30) NOT NULL DEFAULT 'Pengumuman', title VARCHAR(120) NOT NULL, body VARCHAR(1000) NOT NULL, published TINYINT NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ${T}`,
  `CREATE TABLE IF NOT EXISTS businesses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, owner VARCHAR(100) NOT NULL, category VARCHAR(40) NOT NULL, address VARCHAR(200) NULL, phone VARCHAR(20) NULL, info VARCHAR(300) NULL, active TINYINT NOT NULL DEFAULT 1, INDEX idx_biz_cat (category)) ${T}`,
  `CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, business_id INT NULL, user_id INT NULL, customer_name VARCHAR(60) NOT NULL, item VARCHAR(300) NOT NULL, qty INT NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL) ${T}`,
];
const SPOTS = [
  ['gapura', 'Gapura Bersayap', 'Ikon kompleks makam'], ['masjid', 'Masjid Sendang Duwur', 'Prasasti kayu 1561 M'],
  ['makam', 'Makam Sunan Sendang', 'Cagar budaya nasional'], ['sumur-giling', 'Sumur Giling', 'Sumur lima abad'],
  ['bukit-amitunon', 'Bukit Amitunon', 'Pemandangan desa'], ['batik-tulis', 'Sentra Batik Tulis', 'Kunjungi pengrajin'],
  ['pasar-latar-cendhani', 'Pasar Latar Cendhani', 'Jajanan & kerajinan'],
];
const ANN = [
  ['Kalender', 'Pasar Latar Cendhani buka lagi', 'Buka tiap Minggu Legi. Kuliner, jajanan, dan kerajinan lokal.'],
  ['Kalender', 'Ruwahan dan Haul Sunan Sendang', 'Digelar menjelang Ramadan: pawai budaya, sedekah kuliner, bazar UMKM. Tanggal perlu konfirmasi ke kantor desa.'],
  ['Kalender', 'Mangan Sego Langgi', 'Malam 15 Sya’ban, tradisi makan bersama Sego Langgi.'],
];
async function init() {            // buat tabel + isi data awal (aman dijalankan berulang)
  for (const s of DDL) await q(s);
  const first = !(await one('SELECT 1 x FROM spots LIMIT 1'));
  for (let i = 0; i < SPOTS.length; i++)
    await q('INSERT IGNORE INTO spots (slug,position,name,tagline,qr_token) VALUES (?,?,?,?,?)', [SPOTS[i][0], i + 1, SPOTS[i][1], SPOTS[i][2], crypto.randomBytes(9).toString('base64url')]);
  if (first) {
    for (const a of ANN) await q('INSERT INTO announcements (category,title,body) VALUES (?,?,?)', a);
    for (const b of BIZ) await q('INSERT INTO businesses (name,owner,category,address,phone,info) VALUES (?,?,?,?,?,?)', [b.name, b.owner, b.category, b.address, b.phone, b.info]);
  }
}
const ensure = () => (ready ||= init().catch(e => { ready = null; throw e; }));

/* ---------- util ---------- */
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function hashPw(pw) { const salt = crypto.randomBytes(16); return 'scrypt$' + salt.toString('base64') + '$' + crypto.scryptSync(pw, salt, 64).toString('base64'); }
function checkPw(pw, stored) {
  const [, s, h] = (stored || '').split('$');
  const got = crypto.scryptSync(pw, Buffer.from(s || 'AAAAAAAAAAAAAAAAAAAAAA==', 'base64'), 64), want = Buffer.from(h || '', 'base64');
  return !!stored && want.length === got.length && crypto.timingSafeEqual(got, want);
}
const DUMMY = hashPw('dummy-password');
const hits = new Map();   // pembatas laju sederhana (per instance function)
function limit(key, max, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < ms); a.push(now); hits.set(key, a);
  if (a.length > max) throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi sebentar.');
}
function cookies(req) {
  const o = {}; (req.headers.get('cookie') || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}
const setCookie = (name, val, o = {}) => `${name}=${encodeURIComponent(val)}; Path=/; HttpOnly; Secure; SameSite=Lax${o.maxAge != null ? '; Max-Age=' + o.maxAge : ''}`;
const roleFor = email => (ADMIN_EMAIL() && email.toLowerCase() === ADMIN_EMAIL() ? 'admin' : 'user');
const pub = u => u && { id: u.id, name: u.name, email: u.email, role: u.role };
const safeNext = n => (n && /^\/(?![/\\])/.test(n) ? n : '/');
const redirect = (to, headers = {}) => ({ __redirect: to, headers });

async function startSession(userId, remember) {
  const token = crypto.randomBytes(32).toString('base64url'), ttl = remember ? 30 * DAY : DAY;
  await q('DELETE FROM sessions WHERE expires_at<?', [Date.now()]);
  await q('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', [sha(token), userId, Date.now() + ttl]);
  return setCookie('sd_session', token, remember ? { maxAge: ttl / 1000 } : {});
}
async function userFrom(req) {
  const t = cookies(req).sd_session; if (!t) return null;
  return one('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', [sha(t), Date.now()]);
}

/* ---------- router ---------- */
const routes = [];
const R = (m, p, h, auth) => routes.push({ m, re: new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), h, auth });

/* ===== AUTH ===== */
R('POST', '/api/auth/register', async c => {
  limit('reg:' + c.ip, 8, 6e5);
  const name = clean(c.body.name, 60), email = clean(c.body.email, 254).toLowerCase(), pw = String(c.body.password || '');
  const f = {};
  if (name.length < 2) f.name = 'Nama minimal 2 karakter.';
  if (!EMAIL_RE.test(email)) f.email = 'Masukkan alamat email yang valid.';
  if (pw.length < 8 || pw.length > 128) f.password = 'Kata sandi minimal 8 karakter.';
  if (Object.keys(f).length) throw new HttpError(400, 'Data tidak valid.', f);
  if (await one('SELECT 1 x FROM users WHERE email=?', [email])) throw new HttpError(409, 'Email ini sudah terdaftar.', { email: 'Email ini sudah terdaftar. Silakan masuk.' });
  const r = await q('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name, email, hashPw(pw), roleFor(email)]);
  const u = await one('SELECT id,name,email,role FROM users WHERE id=?', [r.insertId]);
  return [201, { user: pub(u) }, { 'Set-Cookie': await startSession(u.id, true) }];
});
R('POST', '/api/auth/login', async c => {
  limit('login:' + c.ip, 10, 6e5);
  const email = clean(c.body.email, 254).toLowerCase(), pw = String(c.body.password || '').slice(0, 128);
  const u = await one('SELECT * FROM users WHERE email=?', [email]);
  const ok = checkPw(pw, u ? u.password_hash : DUMMY) && u && u.password_hash;
  if (!ok) throw new HttpError(401, 'Email atau kata sandi salah.');
  if (roleFor(email) === 'admin' && u.role !== 'admin') { await q("UPDATE users SET role='admin' WHERE id=?", [u.id]); u.role = 'admin'; }
  return [200, { user: pub(u) }, { 'Set-Cookie': await startSession(u.id, !!c.body.remember) }];
});
R('POST', '/api/auth/logout', async c => {
  const t = cookies(c.req).sd_session; if (t) await q('DELETE FROM sessions WHERE token_hash=?', [sha(t)]);
  return [200, { ok: true }, { 'Set-Cookie': setCookie('sd_session', '', { maxAge: 0 }) }];
});
R('GET', '/api/auth/me', async c => ({ user: pub(c.user) }));

R('GET', '/api/auth/google', async c => {
  if (!GID() || !GSEC()) return redirect('/login?error=google_off');
  const state = crypto.randomBytes(16).toString('base64url'), next = safeNext(c.query.next);
  return redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: GID(), redirect_uri: c.origin + '/api/auth/google/callback', response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }),
    { 'Set-Cookie': setCookie('sd_oauth', state + '|' + next, { maxAge: 600 }) });
});
R('GET', '/api/auth/google/callback', async c => {
  const [state, next] = (cookies(c.req).sd_oauth || '|/').split('|'), clear = setCookie('sd_oauth', '', { maxAge: 0 });
  if (c.query.error) return redirect('/login?error=google_denied', { 'Set-Cookie': clear });
  try {
    if (!c.query.code || !state || c.query.state !== state) throw new Error('state');
    const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: c.query.code, client_id: GID(), client_secret: GSEC(), redirect_uri: c.origin + '/api/auth/google/callback', grant_type: 'authorization_code' }) })).json();
    if (!tok.access_token) throw new Error('token');
    const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } })).json();
    if (!info.sub || !info.email || !info.email_verified) throw new Error('profile');
    const email = info.email.toLowerCase();
    let u = await one('SELECT * FROM users WHERE google_id=? OR email=?', [info.sub, email]);
    if (!u) { const r = await q('INSERT INTO users (name,email,google_id,role) VALUES (?,?,?,?)', [clean(info.name || email.split('@')[0], 60), email, info.sub, roleFor(email)]); u = { id: r.insertId }; }
    else if (!u.google_id) await q('UPDATE users SET google_id=? WHERE id=?', [info.sub, u.id]);
    return redirect(safeNext(next), { 'Set-Cookie': [await startSession(u.id, true), clear] });
  } catch (e) { return redirect('/login?error=google_failed', { 'Set-Cookie': clear }); }
});

/* ===== HERITAGE PASSPORT ===== */
const spotList = () => q('SELECT slug,position,name,tagline FROM spots ORDER BY position');
async function stampState(uid) {
  const stamps = (await q('SELECT s.slug FROM stamps st JOIN spots s ON s.id=st.spot_id WHERE st.user_id=? ORDER BY s.position', [uid])).map(r => r.slug);
  const total = (await spotList()).length, cert = await one('SELECT serial,holder_name,issued_at FROM certificates WHERE user_id=?', [uid]);
  return { stamps, count: stamps.length, total, complete: stamps.length === total, certificate: cert };
}
R('GET', '/api/spots', async () => ({ spots: await spotList() }));
R('GET', '/api/stamps', c => stampState(c.user.id), 'user');
R('POST', '/api/stamps', async c => {
  limit('stamp:' + c.user.id, 30, 6e4);
  const spot = await one('SELECT * FROM spots WHERE slug=?', [clean(c.body.spot, 40)]);
  if (!spot) throw new HttpError(404, 'Titik tidak ditemukan.');
  if (!DEMO()) {
    const a = Buffer.from(String(c.body.code || '')), b = Buffer.from(spot.qr_token);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'Pindai kode QR di lokasi untuk mendapat stempel ini.');
  }
  const r = await q('INSERT IGNORE INTO stamps (user_id,spot_id) VALUES (?,?)', [c.user.id, spot.id]);
  return [r.affectedRows ? 201 : 200, await stampState(c.user.id)];
}, 'user');
R('POST', '/api/stamps/import', async c => {
  if (DEMO() && Array.isArray(c.body.spots))
    for (const s of c.body.spots.slice(0, 20)) await q('INSERT IGNORE INTO stamps (user_id,spot_id) SELECT ?, id FROM spots WHERE slug=?', [c.user.id, clean(s, 40)]);
  return stampState(c.user.id);
}, 'user');
R('DELETE', '/api/stamps', async c => { await q('DELETE FROM stamps WHERE user_id=?', [c.user.id]); return stampState(c.user.id); }, 'user');

R('POST', '/api/certificate', async c => {
  const name = clean(c.body.name, 60);
  if (name.length < 2) throw new HttpError(400, 'Nama minimal 2 karakter.');
  const st = await stampState(c.user.id);
  if (!st.complete) throw new HttpError(409, `Baru ${st.count} dari ${st.total} stempel terkumpul.`);
  const cert = await one('SELECT * FROM certificates WHERE user_id=?', [c.user.id]);
  if (cert) await q('UPDATE certificates SET holder_name=? WHERE id=?', [name, cert.id]);
  else {
    const r = await q('INSERT INTO certificates (user_id,serial,holder_name) VALUES (?,?,?)', [c.user.id, 'tmp-' + crypto.randomBytes(8).toString('hex'), name]);
    await q('UPDATE certificates SET serial=? WHERE id=?', [`HP-${new Date().getFullYear()}-${String(r.insertId).padStart(5, '0')}`, r.insertId]);
  }
  return { certificate: await one('SELECT serial,holder_name,issued_at FROM certificates WHERE user_id=?', [c.user.id]) };
}, 'user');
R('GET', '/api/certificate/verify/:serial', async c => {
  const x = await one('SELECT serial,holder_name,issued_at FROM certificates WHERE serial=?', [clean(c.params.serial, 20).toUpperCase()]);
  return x ? { valid: true, certificate: x } : [404, { valid: false }];
});

/* ===== LAPORAN, PENGUMUMAN, UMKM ===== */
const FACILITY = ['Jalan / akses', 'Toilet / air bersih', 'Penerangan', 'Papan petunjuk', 'Gapura / bangunan cagar budaya', 'Tempat sampah / kebersihan', 'Lainnya'];
R('POST', '/api/reports', async c => {
  limit('rep:' + c.ip, 10, 36e5);
  const type = clean(c.body.type, 60), location = clean(c.body.location, 200), description = clean(c.body.description, 1000), name = clean(c.body.name, 60) || null;
  if (!FACILITY.includes(type)) throw new HttpError(400, 'Jenis fasilitas tidak dikenal.');
  if (location.length < 3) throw new HttpError(400, 'Lokasi wajib diisi.');
  if (description.length < 5) throw new HttpError(400, 'Keterangan wajib diisi.');
  const r = await q('INSERT INTO reports (user_id,facility_type,location,description,reporter_name) VALUES (?,?,?,?,?)', [c.user ? c.user.id : null, type, location, description, name]);
  return [201, { report: { id: r.insertId, status: 'baru' } }];
});
R('GET', '/api/reports/mine', async c => ({ reports: await q('SELECT id,facility_type,location,description,status,created_at FROM reports WHERE user_id=? ORDER BY id DESC LIMIT 50', [c.user.id]) }), 'user');
R('GET', '/api/announcements', async () => ({ announcements: await q('SELECT id,category,title,body,created_at FROM announcements WHERE published=1 ORDER BY id DESC LIMIT 30') }));
R('GET', '/api/businesses', async c => {
  const like = '%' + clean(c.query.q, 60).replace(/[%_]/g, '') + '%', cat = clean(c.query.category, 40);
  let rows = await q("SELECT id,name,owner,category,address,phone,info FROM businesses WHERE active=1 AND CONCAT(name,' ',owner,' ',category) LIKE ? ORDER BY name", [like]);
  if (cat && cat !== 'Semua') rows = rows.filter(r => r.category === cat);
  if (c.query.contact === '1') rows = rows.filter(r => r.phone);
  return { businesses: rows };
});
R('POST', '/api/orders', async c => {
  limit('ord:' + c.ip, 15, 36e5);
  const cust = clean(c.body.customer_name, 60), item = clean(c.body.item, 300), qty = Math.max(1, Math.min(999, parseInt(c.body.qty) || 1));
  if (!cust || !item) throw new HttpError(400, 'Nama dan pesanan wajib diisi.');
  const biz = c.body.business ? await one('SELECT id FROM businesses WHERE id=?', [+c.body.business]) : null;
  const r = await q('INSERT INTO orders (business_id,user_id,customer_name,item,qty) VALUES (?,?,?,?,?)', [biz ? biz.id : null, c.user ? c.user.id : null, cust, item, qty]);
  return [201, { order: { id: r.insertId } }];
});

/* ===== ADMIN ===== */
const A = 'admin';
R('GET', '/api/admin/stats', async () => {
  const n = async s => +(await one(s)).n;
  return { users: await n('SELECT COUNT(*) n FROM users'), stamps: await n('SELECT COUNT(*) n FROM stamps'), certificates: await n('SELECT COUNT(*) n FROM certificates'), orders: await n('SELECT COUNT(*) n FROM orders'),
    reports: await q('SELECT status,COUNT(*) n FROM reports GROUP BY status'),
    perSpot: await q('SELECT s.name,COUNT(st.user_id) visitors FROM spots s LEFT JOIN stamps st ON st.spot_id=s.id GROUP BY s.id,s.name ORDER BY s.position') };
}, A);
R('GET', '/api/admin/qr', async c => ({ note: 'Jadikan tiap url sebuah kode QR dan tempel di lokasinya. Rahasiakan.', spots: (await q('SELECT position,name,slug,qr_token FROM spots ORDER BY position')).map(s => ({ position: s.position, name: s.name, url: `${c.origin}/?spot=${s.slug}&code=${s.qr_token}#paspor` })) }), A);
R('GET', '/api/admin/reports', async c => { const s = clean(c.query.status, 10); return { reports: await q("SELECT * FROM reports WHERE (?='' OR status=?) ORDER BY id DESC LIMIT 200", [s, s]) }; }, A);
R('PATCH', '/api/admin/reports/:id', async c => {
  const st = clean(c.body.status, 10); if (!['baru', 'diproses', 'selesai'].includes(st)) throw new HttpError(400, 'Status tidak valid.');
  const r = await q('UPDATE reports SET status=?,admin_note=COALESCE(?,admin_note),updated_at=NOW() WHERE id=?', [st, c.body.admin_note == null ? null : clean(c.body.admin_note, 500), +c.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Laporan tidak ada.');
  return one('SELECT * FROM reports WHERE id=?', [+c.params.id]);
}, A);
R('GET', '/api/admin/orders', async () => ({ orders: await q('SELECT o.*,b.name business FROM orders o LEFT JOIN businesses b ON b.id=o.business_id ORDER BY o.id DESC LIMIT 200') }), A);

R('POST', '/api/admin/announcements', async c => {
  const title = clean(c.body.title, 120), body = clean(c.body.body, 1000), cat = clean(c.body.category, 30) || 'Pengumuman';
  if (!title || !body) throw new HttpError(400, 'Judul dan isi wajib diisi.');
  const r = await q('INSERT INTO announcements (category,title,body,published) VALUES (?,?,?,?)', [cat, title, body, c.body.published === false ? 0 : 1]);
  return [201, { id: r.insertId }];
}, A);
R('PATCH', '/api/admin/announcements/:id', async c => {
  const o = await one('SELECT * FROM announcements WHERE id=?', [+c.params.id]); if (!o) throw new HttpError(404, 'Tidak ada.');
  await q('UPDATE announcements SET category=?,title=?,body=?,published=? WHERE id=?', [clean(c.body.category ?? o.category, 30), clean(c.body.title ?? o.title, 120), clean(c.body.body ?? o.body, 1000), c.body.published == null ? o.published : (c.body.published ? 1 : 0), o.id]);
  return { ok: true };
}, A);
R('DELETE', '/api/admin/announcements/:id', async c => { await q('DELETE FROM announcements WHERE id=?', [+c.params.id]); return { ok: true }; }, A);

const bizFields = (b, o = {}) => ({ name: clean(b.name ?? o.name, 100), owner: clean(b.owner ?? o.owner, 100), category: clean(b.category ?? o.category, 40),
  address: clean(b.address ?? o.address, 200) || null, phone: clean(b.phone ?? o.phone, 20).replace(/\D/g, '') || null, info: clean(b.info ?? o.info, 300) || null, active: b.active == null ? (o.active ?? 1) : (b.active ? 1 : 0) });
R('POST', '/api/admin/businesses', async c => {
  const f = bizFields(c.body); if (!f.name || !f.owner || !f.category) throw new HttpError(400, 'Nama, pemilik, dan kategori wajib diisi.');
  const r = await q('INSERT INTO businesses (name,owner,category,address,phone,info,active) VALUES (?,?,?,?,?,?,?)', [f.name, f.owner, f.category, f.address, f.phone, f.info, f.active]);
  return [201, { id: r.insertId }];
}, A);
R('PATCH', '/api/admin/businesses/:id', async c => {
  const o = await one('SELECT * FROM businesses WHERE id=?', [+c.params.id]); if (!o) throw new HttpError(404, 'Tidak ada.');
  const f = bizFields(c.body, o);
  await q('UPDATE businesses SET name=?,owner=?,category=?,address=?,phone=?,info=?,active=? WHERE id=?', [f.name, f.owner, f.category, f.address, f.phone, f.info, f.active, o.id]);
  return { ok: true };
}, A);
R('DELETE', '/api/admin/businesses/:id', async c => { await q('DELETE FROM businesses WHERE id=?', [+c.params.id]); return { ok: true }; }, A);

R('GET', '/api/health', async () => ({ ok: true, demoStamps: DEMO(), google: !!(GID() && GSEC()) }));

/* ---------- entry point ---------- */
const BASE_H = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
function respond(status, body, extra = {}) {
  const h = new Headers(BASE_H);
  for (const [k, v] of Object.entries(extra)) (Array.isArray(v) ? v : [v]).forEach(x => h.append(k, x));
  if (body !== '' && typeof body === 'object') { h.set('Content-Type', 'application/json; charset=utf-8'); h.set('Cache-Control', 'no-store'); body = JSON.stringify(body); }
  return new Response(status === 302 ? null : body, { status, headers: h });
}

export default async (req, context) => {
  try {
    const url = new URL(req.url), pathname = url.pathname.replace(/\/+$/, '') || '/', origin = url.origin;
    const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || '?';
    const mut = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (mut) {
      const o = req.headers.get('origin'); if (o && new URL(o).host !== url.host) throw new HttpError(403, 'Origin tidak diizinkan.');
      if (req.method !== 'DELETE' && !/application\/json/.test(req.headers.get('content-type') || '')) throw new HttpError(415, 'Gunakan Content-Type: application/json.');
    }
    let matched = false;
    for (const r of routes) {
      const m = r.re.exec(pathname); if (!m) continue;
      matched = true; if (r.m !== req.method) continue;
      await ensure();
      const user = await userFrom(req);
      if (r.auth && !user) throw new HttpError(401, 'Silakan masuk dulu.');
      if (r.auth === 'admin' && user.role !== 'admin') throw new HttpError(403, 'Khusus admin.');
      let body = {};
      if (mut && req.method !== 'DELETE') {
        const txt = await req.text(); if (txt.length > 1e5) throw new HttpError(413, 'Permintaan terlalu besar.');
        try { body = txt ? JSON.parse(txt) : {}; } catch (e) { throw new HttpError(400, 'JSON tidak valid.'); }
      }
      const out = await r.h({ req, ip, user, origin, params: m.groups || {}, query: Object.fromEntries(url.searchParams), body });
      if (out && out.__redirect) return respond(302, '', { Location: out.__redirect, ...out.headers });
      return Array.isArray(out) ? respond(out[0], out[1], out[2]) : respond(200, out);
    }
    throw new HttpError(matched ? 405 : 404, matched ? 'Metode tidak didukung.' : 'Endpoint tidak ada.');
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    return respond(e.status || 500, e instanceof HttpError ? { error: e.message, ...(e.fields ? { fields: e.fields } : {}) } : { error: 'Terjadi kesalahan di server.' });
  }
};
