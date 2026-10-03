/* ===== API helper, toast, format, konstanta ===== */
const CATLABEL = { topup: 'Top Up Game', voucher: 'Voucher', akun: 'Akun' };
const CATCOLOR = { topup: '#8b5cf6', voucher: '#f59e0b', akun: '#3b82f6' };
const CATPALETTE = ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
// Label & warna kategori: pakai data dinamis dari server (store.cats), fallback ke konstanta lama
function catLabel(id) {
  const c = (store.cats || []).find(x => x.id === id);
  if (c) return (c.icon ? c.icon + ' ' : '') + c.label;
  return CATLABEL[id] || id;
}
function catColor(id) {
  if (CATCOLOR[id]) return CATCOLOR[id];
  const idx = (store.cats || []).findIndex(x => x.id === id);
  let h = 0; const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CATPALETTE[(idx >= 0 ? idx : h) % CATPALETTE.length];
}
function setCats(cats) { store.cats = cats || []; }
const STLBL = { pending: 'Menunggu', proses: 'Diproses', delivery: 'Dikirim', selesai: 'Selesai', batal: 'Dibatalkan' };
const STCOLOR = { pending: 'bg-amber-100 text-amber-700', proses: 'bg-blue-100 text-blue-700', delivery: 'bg-purple-100 text-purple-700', selesai: 'bg-green-100 text-green-700', batal: 'bg-red-100 text-red-700' };
const PAYMETHODS = [
  { id: 'qris', label: '⚡ QRIS', desc: 'Scan QR — nominal otomatis sesuai total' },
  { id: 'transfer_bca', label: '🏦 Transfer BCA', desc: 'BCA 8210 4567 89 a.n. TokoGame' },
  { id: 'transfer_mandiri', label: '🏦 Transfer Mandiri', desc: 'Mandiri 8900 1234 5678 90 a.n. TokoGame' },
  { id: 'transfer_dana', label: '📱 DANA', desc: 'DANA 0812 3456 7890 a.n. TokoGame' },
];

function rp(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }
/* Harga final setelah diskon flash sale (%) */
function finalPrice(p) {
  const d = Math.max(0, Math.min(100, Number(p.discount) || 0));
  return Math.round(Number(p.price || 0) * (1 - d / 100));
}
function fmtDate(s) { if (!s) return '-'; return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

async function api(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (store.token) opts.headers['Authorization'] = 'Bearer ' + store.token;
  if (opts.body && typeof opts.body === 'string') opts.headers['Content-Type'] = 'application/json';
  const r = await fetch(path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const err = new Error(data.error || ('HTTP ' + r.status)); err.data = data; throw err; }
  return data;
}

function toast(msg, ok = true) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all ' + (ok ? 'bg-gray-900' : 'bg-red-600');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

function copyText(t, msg) {
  const done = () => toast(msg || 'Disalin!');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
  } else fallbackCopy(t, done);
}
function fallbackCopy(t, done) {
  const ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove(); done();
}
