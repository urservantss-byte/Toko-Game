/* Admin: laporan penjualan + export CSV */
const AdminReports = {
  data() {
    const t = new Date(), f = new Date(Date.now() - 29 * 864e5);
    return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10), r: null, loading: false };
  },
  mounted() { this.load(); },
  methods: {
    rp,
    async load() {
      this.loading = true;
      try {
        const d = await api(`/api/admin/reports/sales?from=${this.from}&to=${this.to}`);
        this.r = d;
      } catch (e) { toast(e.message, false); }
      this.loading = false;
    },
    csvUrl() {
      return `/api/admin/reports/sales.csv?from=${this.from}&to=${this.to}&token=${store.token}`;
    },
    async downloadCsv() {
      try {
        const r = await fetch(`/api/admin/reports/sales.csv?from=${this.from}&to=${this.to}`, {
          headers: { 'Authorization': 'Bearer ' + store.token }
        });
        if (!r.ok) throw new Error('Gagal mengunduh');
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `laporan-${this.from}_${this.to}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) { toast(e.message, false); }
    },
    preset(days) {
      const t = new Date(), f = new Date(Date.now() - (days - 1) * 864e5);
      this.to = t.toISOString().slice(0, 10);
      this.from = f.toISOString().slice(0, 10);
      this.load();
    },
  },
  template: `
  <div>
    <div class="grid grid-cols-3 gap-2 mb-3">
      <button @click="preset(7)" class="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-nova-surface2 hover:bg-gray-200 dark:hover:bg-gray-700">7 hari</button>
      <button @click="preset(30)" class="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-nova-surface2 hover:bg-gray-200 dark:hover:bg-gray-700">30 hari</button>
      <button @click="preset(90)" class="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-nova-surface2 hover:bg-gray-200 dark:hover:bg-gray-700">90 hari</button>
    </div>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <input v-model="from" type="date" class="flex-1 min-w-[130px] text-xs border border-gray-200 dark:border-nova-line rounded-xl px-3 py-2 bg-white dark:bg-nova-surface">
      <span class="text-xs text-gray-400">s/d</span>
      <input v-model="to" type="date" class="flex-1 min-w-[130px] text-xs border border-gray-200 dark:border-nova-line rounded-xl px-3 py-2 bg-white dark:bg-nova-surface">
      <button @click="load" class="text-xs font-bold px-4 py-2 rounded-xl bg-primary text-white hover:bg-indigo-700">Tampilkan</button>
      <button @click="downloadCsv" class="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">📥 Export CSV</button>
    </div>
    <div v-if="loading" class="text-center text-gray-400 py-10 text-sm">Memuat laporan...</div>
    <div v-else-if="r">
      <div class="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-3 md:p-4 text-center min-w-0">
          <div class="text-lg md:text-2xl font-extrabold text-primary truncate">{{ r.summary.orders }}</div>
          <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Pesanan</div>
        </div>
        <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-3 md:p-4 text-center min-w-0">
          <div class="text-base md:text-2xl font-extrabold text-emerald-600 break-words leading-tight">{{ rp(r.summary.revenue) }}</div>
          <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Total Omzet</div>
        </div>
        <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-3 md:p-4 text-center min-w-0">
          <div class="text-base md:text-2xl font-extrabold text-accent break-words leading-tight">{{ rp(Math.round(r.summary.avg_order)) }}</div>
          <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Rata-rata/Pesanan</div>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4">
          <h4 class="font-bold text-sm mb-3">🏆 Produk Terlaris</h4>
          <div v-if="!r.topProducts.length" class="text-xs text-gray-400">Belum ada penjualan di periode ini.</div>
          <div v-for="(p, i) in r.topProducts" :key="i" class="flex justify-between items-center text-sm py-2 border-b border-gray-50 dark:border-nova-line last:border-0">
            <span class="truncate mr-2">{{ i + 1 }}. {{ p.name }}</span>
            <span class="shrink-0 text-xs text-gray-500">{{ p.qty }} terjual · <b class="text-emerald-600">{{ rp(p.revenue) }}</b></span>
          </div>
        </div>
        <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4">
          <h4 class="font-bold text-sm mb-3">💳 Per Metode Bayar</h4>
          <div v-if="!r.byPayment.length" class="text-xs text-gray-400">Belum ada data.</div>
          <div v-for="m in r.byPayment" :key="m.m" class="flex justify-between items-center text-sm py-2 border-b border-gray-50 dark:border-nova-line last:border-0">
            <span class="truncate mr-2">{{ m.m }}</span>
            <span class="shrink-0 text-xs text-gray-500">{{ m.orders }} pesanan · <b class="text-emerald-600">{{ rp(m.revenue) }}</b></span>
          </div>
          <h4 class="font-bold text-sm mt-4 mb-3">📅 7 Hari Terakhir</h4>
          <div v-for="d in r.byDay.slice(-7)" :key="d.d" class="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-nova-line last:border-0">
            <span class="text-gray-500">{{ d.d }}</span>
            <span>{{ d.orders }} pesanan · <b>{{ rp(d.revenue) }}</b></span>
          </div>
        </div>
      </div>
    </div>
  </div>`
};
