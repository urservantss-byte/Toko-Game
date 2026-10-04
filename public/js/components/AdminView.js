/* Admin panel: tab navigasi */
const AdminView = {
  components: { AdminDash, AdminOrders, AdminProducts, AdminUsers, AdminBanners, AdminTickets, AdminVouchers, AdminReports, AdminSettings },
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
      const base = 'px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ';
      return base + (this.tab === t ? 'text-white' : 'nv-chip')
        + (this.tab === t ? '' : '');
    },
    tabStyle(t) {
      return this.tab === t
        ? 'background:linear-gradient(135deg,#7a88ff,#5a68e8);box-shadow:0 4px 14px rgba(108,124,255,.35)'
        : '';
    },
  },
  template: `
  <div class="max-w-6xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-xl font-extrabold dark:text-nova-text tracking-tight">🛠️ Admin Panel</h2>
        <p class="text-xs text-gray-500 dark:text-nova-muted mt-0.5">Kelola toko dalam satu tempat</p>
      </div>
      <span v-if="pendingCount" class="nv-badge nv-badge-red">{{ pendingCount }} perlu diproses</span>
    </div>
    <div class="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
      <button @click="nav('dash')" :class="tabCls('dash')" :style="tabStyle('dash')">📊 Dashboard</button>
      <button @click="nav('orders')" :class="tabCls('orders')" :style="tabStyle('orders')">🧾 Pesanan</button>
      <button @click="nav('products')" :class="tabCls('products')" :style="tabStyle('products')">📦 Produk</button>
      <button @click="nav('vouchers')" :class="tabCls('vouchers')" :style="tabStyle('vouchers')">🎟️ Voucher</button>
      <button @click="nav('reports')" :class="tabCls('reports')" :style="tabStyle('reports')">📈 Laporan</button>
      <button @click="nav('banners')" :class="tabCls('banners')" :style="tabStyle('banners')">🎨 Banner</button>
      <button @click="nav('tickets')" :class="tabCls('tickets')" :style="tabStyle('tickets')">🎫 Tiket</button>
      <button @click="nav('users')" :class="tabCls('users')" :style="tabStyle('users')">👥 User</button>
      <button @click="nav('settings')" :class="tabCls('settings')" :style="tabStyle('settings')">⚙️ Pengaturan</button>
    </div>
    <admin-dash v-if="tab === 'dash'" :key="'d' + tab"></admin-dash>
    <admin-orders v-if="tab === 'orders'" :key="'o' + tab"></admin-orders>
    <admin-products v-if="tab === 'products'" :key="'p' + tab"></admin-products>
    <admin-vouchers v-if="tab === 'vouchers'" :key="'v' + tab"></admin-vouchers>
    <admin-reports v-if="tab === 'reports'" :key="'r' + tab"></admin-reports>
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
