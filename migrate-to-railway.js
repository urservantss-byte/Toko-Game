// Migrasi sekali pakai: produk + foto + kode voucher + setting (QRIS/WA/SMTP)
// dari DB lokal ke deployment Railway.
const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const HOST = 'toko-game-production.up.railway.app';
const LOCAL_DB = path.join(__dirname, 'toko.db');

function api(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({ host: HOST, path: p, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: d.slice(0, 200) }); }
      }); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadPhotos(productId, files, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----migrate' + Date.now();
    const parts = [];
    for (const f of files) {
      const buf = fs.readFileSync(f);
      const ext = path.extname(f).slice(1) || 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${path.basename(f)}"\r\nContent-Type: ${mime}\r\n\r\n`));
      parts.push(buf);
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({ host: HOST, path: `/api/products/${productId}/images`, method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d.slice(0, 200) }); }
      }); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

(async () => {
  const db = new Database(LOCAL_DB, { readonly: true });
  // 1. login
  let r = await api('POST', '/api/auth/login', { email: 'admin@toko.id', password: 'admin123' });
  if (!r.json || !r.json.token) throw new Error('Login Railway gagal: ' + JSON.stringify(r.json || r.raw));
  const H = { 'Authorization': 'Bearer ' + r.json.token };
  console.log('Login OK');

  // 2. hapus produk seed di Railway
  r = await api('GET', '/api/products?limit=100', null, H);
  for (const p of (r.json.products || r.json || [])) {
    const del = await api('DELETE', `/api/products/${p.id}`, null, H);
    console.log('Hapus seed:', p.id, p.name, '->', del.status);
  }

  // 3. buat produk dari lokal
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  const idMap = {};
  for (const p of products) {
    r = await api('POST', '/api/products', {
      name: p.name, description: p.description, price: p.price,
      image_url: p.image_url.startsWith('/uploads/') ? '' : p.image_url,
      category: p.category, tags: p.tags, stock: p.stock,
    }, H);
    if (r.status !== 201) { console.log('GAGAL buat produk', p.name, r.status, JSON.stringify(r.json)); continue; }
    idMap[p.id] = r.json.product.id;
    console.log('Buat produk:', p.name, `[${p.category}]`, '-> id', r.json.product.id);
  }

  // 4. upload foto lokal
  const imgs = db.prepare('SELECT product_id, path FROM product_images WHERE path LIKE \'/uploads/%\' ORDER BY product_id, sort_order').all();
  const byProduct = {};
  for (const im of imgs) (byProduct[im.product_id] = byProduct[im.product_id] || []).push(im.path);
  for (const [localId, paths] of Object.entries(byProduct)) {
    const newId = idMap[localId];
    if (!newId) continue;
    const files = paths.map(x => path.join(__dirname, x.slice(1))).filter(f => fs.existsSync(f));
    if (!files.length) continue;
    r = await uploadPhotos(newId, files, r.json.token || H.Authorization.slice(7));
    console.log('Upload foto produk', localId, '->', newId, r.status, r.json && r.json.images ? r.json.images.length + ' foto' : (r.raw || ''));
    if (r.json && r.json.images && r.json.images.length) {
      await api('PUT', `/api/products/${newId}`, { image_url: r.json.images[0].path || r.json.images[0] }, H);
    }
  }

  // 5. migrasi kode voucher yang belum dipakai
  const codes = db.prepare('SELECT product_id, code FROM voucher_codes WHERE used = 0').all();
  for (const c of codes) {
    const newId = idMap[c.product_id];
    if (!newId) continue;
    r = await api('POST', `/api/admin/products/${newId}/codes`, { codes: [c.code] }, H);
    console.log('Kode voucher produk', newId, '->', r.status);
  }

  // 6. setting QRIS + WA CS
  const get = k => { try { return db.prepare('SELECT value FROM settings WHERE key = ?').get(k).value; } catch { return ''; } };
  r = await api('PUT', '/api/admin/settings', { qris_static: get('qris_static'), wa_cs: get('wa_cs') }, H);
  console.log('Setting QRIS/WA:', r.status, r.json && r.json.qris_merchant ? 'merchant=' + r.json.qris_merchant : '');

  // 7. setting SMTP
  r = await api('PUT', '/api/admin/email-settings', {
    smtp_host: get('smtp_host'), smtp_port: get('smtp_port'), smtp_user: get('smtp_user'),
    smtp_pass: get('smtp_pass'), smtp_from: get('smtp_from'), admin_email: get('admin_email'),
  }, H);
  console.log('Setting SMTP:', r.status);

  // 8. tes email
  r = await api('POST', '/api/admin/email-test', {}, H);
  console.log('Tes email:', r.status, r.json && (r.json.message || r.json.error));

  // 9. verifikasi akhir
  r = await api('GET', '/api/products?limit=100', null, H);
  const list = r.json.products || r.json || [];
  console.log('TOTAL produk di Railway:', list.length);
  db.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
