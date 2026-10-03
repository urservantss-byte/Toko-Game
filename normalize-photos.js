// Normalisasi sekali pakai: hapus & upload ulang foto produk agar ke-resize 800x800
const https = require('https');
const fs = require('fs');
const path = require('path');
const HOST = 'toko-game-production.up.railway.app';
// mapping: railway product id -> file lokal
const JOBS = {
  10: [
    'uploads/products/1/1790973159062_41917dd0eb5e.png',
    'uploads/products/1/1790973159064_250090d483e3.png',
    'uploads/products/1/1790974132396_00442bdfb638.jpg',
    'uploads/products/1/1790974132401_c3a40c5a72fd.jpg',
  ],
  19: ['uploads/products/10/1791008960201_c83fef872a50.jpg'],
};
function api(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({ host: HOST, path: p, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, raw: d.slice(0, 200) }); } }); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}
function uploadPhotos(productId, files, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----norm' + Date.now();
    const parts = [];
    for (const f of files) {
      const buf = fs.readFileSync(f);
      const ext = path.extname(f).slice(1) || 'jpg';
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${path.basename(f)}"\r\nContent-Type: image/${ext === 'png' ? 'png' : 'jpeg'}\r\n\r\n`));
      parts.push(buf); parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);
    const req = https.request({ host: HOST, path: `/api/products/${productId}/images`, method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, raw: d.slice(0, 200) }); } }); });
    req.on('error', reject); req.write(body); req.end();
  });
}
(async () => {
  let r = await api('POST', '/api/auth/login', { email: 'admin@toko.id', password: 'admin123' });
  const H = { 'Authorization': 'Bearer ' + r.json.token };
  for (const [pid, files] of Object.entries(JOBS)) {
    // hapus foto lama
    r = await api('GET', `/api/products/${pid}`, null, H);
    const imgs = (r.json.product && r.json.product.images) || [];
    for (const im of imgs) {
      await api('DELETE', `/api/products/${pid}/images/${im.id}`, null, H);
    }
    console.log(`Produk ${pid}: hapus ${imgs.length} foto lama`);
    // upload ulang (server auto-resize 800x800)
    const local = files.map(f => path.join(__dirname, f)).filter(f => fs.existsSync(f));
    r = await uploadPhotos(pid, local, H.Authorization.slice(7));
    console.log(`Produk ${pid}: upload ulang ->`, r.status, r.json && r.json.images ? r.json.images.length + ' foto' : r.raw);
  }
  console.log('SELESAI');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
