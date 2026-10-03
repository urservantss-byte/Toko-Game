/* ===== Global reactive store ===== */
const { reactive, computed } = Vue;

const store = reactive({
  page: 'home',            // home | login | register | forgot | reset | cart | checkout | orders | settings | admin
  user: null,
  token: localStorage.getItem('tg_token') || '',
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  products: [],
  f: { q: '', cat: 'all', tag: '', sort: 'pop' },
  // product modal
  product: null,           // produk yg dibuka di modal detail
  galIdx: 0,
  reviews: [],
  // review modal
  reviewFor: null,         // { productId, orderId? }
  reviewRating: 5,
  reviewComment: '',
  // checkout
  payMethod: 'qris',
  proofFile: null,
  // admin
  adminTab: 'dash',        // dash | orders | products | users
  adminDash: null,
  adminOrders: [],
  aof: { q: '', status: '' },
  adminProducts: [],
  adminUsers: [],
  deliverOrder: null,      // order yg sedang di-input delivery-nya (admin)
  productForm: null,       // produk yg sedang diedit (admin), null = tambah baru
  myOrders: [],
  resetToken: '',
  verifyMsg: '',
  pendingCount: 0,
});

const cartCount = computed(() => store.cart.reduce((a, c) => a + c.qty, 0));
const cartTotal = computed(() => store.cart.reduce((a, c) => a + c.qty * c.price, 0));

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(store.cart));
}

function setToken(t) {
  store.token = t || '';
  if (t) localStorage.setItem('tg_token', t);
  else localStorage.removeItem('tg_token');
}

const VALID_PAGES = ['home', 'login', 'register', 'forgot', 'reset', 'cart', 'checkout', 'orders', 'tickets', 'settings', 'admin', 'track'];
const ADMIN_TABS = ['dash', 'orders', 'products', 'vouchers', 'banners', 'tickets', 'users'];

// Hash routing: halaman tersimpan di URL (#/orders, #/admin/products, ...)
// sehingga refresh / tombol back-forward browser tetap di halaman yg sama.
function hashFor(page) {
  if (page === 'home') return '#/';
  if (page === 'admin') return '#/admin/' + (store.adminTab || 'dash');
  return '#/' + page;
}

function parseHash() {
  const h = location.hash || '';
  let m = h.match(/^#resetpw\/(.+)$/);
  if (m) return { reset: m[1] };
  m = h.match(/^#\/([a-z]+)(?:\/([a-z]+))?/);
  if (m && VALID_PAGES.includes(m[1])) return { page: m[1], arg: m[2] };
  return { page: 'home' };
}

function go(page) {
  if ((page === 'cart' || page === 'checkout' || page === 'orders' || page === 'tickets' || page === 'settings') && !store.user) { toast('Masuk dulu ya 👤', false); page = 'login'; }
  if (page === 'admin' && (!store.user || store.user.role !== 'admin')) { toast('Khusus admin', false); page = 'home'; }
  if (page === 'checkout' && !store.cart.length) { toast('Keranjang kosong', false); page = 'cart'; }
  store.page = page;
  window.scrollTo({ top: 0 });
  const h = hashFor(page);
  if (location.hash !== h) location.hash = h;
  if (page === 'home') loadHome();
  if (page === 'orders') loadMyOrders();
  if (page === 'admin') loadAdmin();
}

async function loadHome() {
  try {
    const d = await api('/api/products?limit=100');
    store.products = d.products || [];
  } catch (e) { /* biarkan kosong */ }
}

async function loadMyOrders() {
  if (!store.user) return;
  try {
    store.myOrders = (await api('/api/orders')).orders || [];
  } catch (e) { toast(e.message, false); }
}

async function refreshMe() {
  try {
    const d = await api('/api/auth/me');
    store.user = d.user;
  } catch (e) { setToken(''); store.user = null; }
}

function logout() {
  setToken(''); store.user = null; store.cart = []; saveCart();
  go('home');
  toast('Sudah keluar 👋');
}
