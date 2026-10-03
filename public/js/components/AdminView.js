/* Admin panel: tab navigasi */
const AdminView = {
  components: { AdminDash, AdminOrders, AdminProducts, AdminUsers, AdminBanners, AdminTickets, AdminVouchers, AdminSettings },
  computed: {
    tab: () => store.adminTab,
    pendingCount: () => store.pendingCount || 0,
  },
  mounted() { this.load(); },
  methods: {
    nav(t) { store.adminTab = t; const h = '#/admin/' + t; if (location.hash !== h) location.hash = h; },
    async load() {
      if (!store.user) { go('login'); return; }
      try {
        const d = await api('/api/admin/stats');
        store.pendingCount = d.pending_orders || 0;
      } catch (e) { /* bukan admin -> biarkan */ }
    },
    tabCls(t) {
      const base = 'px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ';
      return base + (this.tab === t ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700');
    },
  },
  template: `
  <div class="max-w-6xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">🛠️ Admin Panel</h2>
      <span v-if="pendingCount" class="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-full">{{ pendingCount }} perlu diproses</span>
    </div>
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button @click="nav('dash')" :class="tabCls('dash')">📊 Dashboard</button>
      <button @click="nav('orders')" :class="tabCls('orders')">🧾 Pesanan</button>
      <button @click="nav('products')" :class="tabCls('products')">📦 Produk</button>
      <button @click="nav('vouchers')" :class="tabCls('vouchers')">🎟️ Voucher</button>
      <button @click="nav('banners')" :class="tabCls('banners')">🎨 Banner</button>
      <button @click="nav('tickets')" :class="tabCls('tickets')">🎫 Tiket</button>
      <button @click="nav('users')" :class="tabCls('users')">👥 User</button>
      <button @click="nav('settings')" :class="tabCls('settings')">⚙️ Pengaturan</button>
    </div>
    <admin-dash v-if="tab === 'dash'" :key="'d' + tab"></admin-dash>
    <admin-orders v-if="tab === 'orders'" :key="'o' + tab"></admin-orders>
    <admin-products v-if="tab === 'products'" :key="'p' + tab"></admin-products>
    <admin-vouchers v-if="tab === 'vouchers'" :key="'v' + tab"></admin-vouchers>
    <admin-banners v-if="tab === 'banners'" :key="'b' + tab"></admin-banners>
    <admin-tickets v-if="tab === 'tickets'" :key="'t' + tab"></admin-tickets>
    <admin-users v-if="tab === 'users'" :key="'u' + tab"></admin-users>
    <admin-settings v-if="tab === 'settings'" :key="'s' + tab"></admin-settings>
  </div>`
};

async function loadAdmin() {
  if (!store.user || store.user.role !== 'admin') {
    toast('Akses admin saja', false);
    go('home');
    return;
  }
}
