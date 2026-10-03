/* ===== Vue app: registrasi komponen + mount ===== */
const app = Vue.createApp({
  data: () => ({ waCs: '' }),
  computed: {
    page: () => store.page,
    store: () => store,
    isAuthPage() { return ['login', 'register', 'forgot', 'reset'].includes(this.page); },
  },
  mounted() {
    fetch('/api/settings/public').then(r => r.json()).then(d => { this.waCs = d.wa_cs || ''; }).catch(() => {});
  },
  methods: {
    waLink() { return 'https://wa.me/' + this.waCs + '?text=' + encodeURIComponent('Halo TokoGame, saya mau tanya-tanya dulu 🙏'); },
    goTrack() { go('track'); },
  },
  template: `
  <div>
    <header-view></header-view>
    <main class="min-h-[70vh]">
      <home-view v-if="page === 'home'"></home-view>
      <auth-view v-if="isAuthPage"></auth-view>
      <cart-view v-if="page === 'cart'"></cart-view>
      <checkout-view v-if="page === 'checkout'"></checkout-view>
      <orders-view v-if="page === 'orders'"></orders-view>
      <tickets-view v-if="page === 'tickets'"></tickets-view>
      <settings-view v-if="page === 'settings'"></settings-view>
      <admin-view v-if="page === 'admin'"></admin-view>
      <track-view v-if="page === 'track'"></track-view>
    </main>
    <footer class="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
      <div class="border-t pt-6">🎮 TokoGame — Akun, Voucher & Topup Digital · Pembayaran aman · Proses kilat</div>
      <div class="mt-2"><a @click="goTrack" class="cursor-pointer text-primary font-semibold hover:underline">🔍 Lacak Pesanan</a></div>
    </footer>
    <a v-if="waCs" :href="waLink()" target="_blank"
       class="fixed bottom-20 md:bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-green-500 shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition"
       title="Chat CS via WhatsApp">💬</a>
    <product-modal v-if="store.product"></product-modal>
    <review-modal></review-modal>
  </div>`,
});

// Komponen global
app.component('blur-img', BlurImg);
app.component('stars', Stars);
app.component('status-badge', StatusBadge);
app.component('header-view', HeaderView);
app.component('home-view', HomeView);
app.component('product-modal', ProductModal);
app.component('review-modal', ReviewModal);
app.component('cart-view', CartView);
app.component('checkout-view', CheckoutView);
app.component('orders-view', OrdersView);
app.component('track-view', TrackView);
app.component('tickets-view', TicketsView);
app.component('settings-view', SettingsView);
app.component('auth-view', AuthView);
app.component('admin-view', AdminView);
app.component('admin-dash', AdminDash);
app.component('admin-orders', AdminOrders);
app.component('deliver-modal', DeliverModal);
app.component('admin-products', AdminProducts);
app.component('product-form-modal', ProductFormModal);
app.component('admin-vouchers', AdminVouchers);
app.component('admin-banners', AdminBanners);
app.component('admin-tickets', AdminTickets);
app.component('admin-users', AdminUsers);

// Tampilkan error Vue sebagai toast agar mudah di-debug
app.config.errorHandler = (err, instance, info) => {
  console.error(err);
  const comp = instance && (instance.type.name || instance.type.__name || '?');
  const stack = String(err.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 300);
  toast(`Error [${comp}/${info}]: ${err.message || err} :: ${stack}`, false);
};
app.config.warnHandler = (msg) => { console.warn(msg); };

// Global yg dipakai langsung di template (go(), store, rp(), dll)
Object.assign(app.config.globalProperties, {
  go, logout, store, rp, fmtDate, toast, copyText,
  CATLABEL, CATCOLOR, STLBL, STCOLOR, PAYMETHODS,
  loadHome, loadMyOrders, refreshMe, openProduct,
});

app.mount('#app');

// Init: cek token tersimpan, pulihkan halaman dari URL hash
window.addEventListener('hashchange', () => {
  const r = parseHash();
  if (r.reset) { store.resetToken = r.reset; go('reset'); return; }
  const tab = (r.page === 'admin' && r.arg && ADMIN_TABS.includes(r.arg)) ? r.arg : null;
  if (r.page === store.page && (!tab || tab === store.adminTab)) return;
  if (tab) store.adminTab = tab;
  go(r.page);
});

(async () => {
  // Kembali dari Google OAuth: token JWT ada di hash
  const gm = location.hash.match(/^#\/google\/(.+)$/);
  if (gm) {
    setToken(gm[1]);
    location.hash = '#/';
    try { await refreshMe(); } catch (e) {}
    if (store.user) { toast('Halo, ' + store.user.name + '! 👋'); go('home'); return; }
  }
  if (store.token) {
    try { await refreshMe(); } catch (e) { /* token invalid -> dibersihkan di refreshMe */ }
  }
  const r = parseHash();
  if (r.reset) { store.resetToken = r.reset; go('reset'); }
  else {
    if (r.page === 'admin' && r.arg && ADMIN_TABS.includes(r.arg)) store.adminTab = r.arg;
    go(r.page);
  }
})();
