/* Halaman pesanan user: timeline, data delivery, ulasan, selesaikan */
const OrdersView = {
  components: { StatusBadge },
  data: () => ({ eligible: [], qris: null, payKinds: {}, payLabels: {} }),
  computed: {
    orders: () => store.myOrders,
  },
  mounted() {
    this.load();
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      const m = {}, l = {};
      for (const x of (d.pay_methods || [])) { m[x.id] = x.kind; l[x.id] = x.label; }
      this.payKinds = m; this.payLabels = l;
    }).catch(() => {});
  },
  methods: {
    rp, fmtDate,
    payKind(o) {
      if (this.payKinds[o.payment_method]) return this.payKinds[o.payment_method];
      if (o.payment_method === 'qris') return 'qris';
      return 'transfer';
    },
    payLabel(o) {
      return this.payLabels[o.payment_method] || o.payment_method;
    },
    async load() {
      await loadMyOrders();
      try { this.eligible = (await api('/api/reviews/eligible')).eligible || []; }
      catch (e) { this.eligible = []; }
    },
    eligFor(orderId) { return this.eligible.filter(e => e.order_id === orderId); },
    async complete(id) {
      try {
        const d = await api('/api/orders/' + id + '/complete', { method: 'POST' });
        toast(d.message || 'Pesanan selesai 🎉');
        this.load();
      } catch (e) { toast(e.message, false); }
    },
    openReview(e) {
      store.reviewFor = { productId: e.product_id, orderId: e.order_id };
      store.reviewRating = 5; store.reviewComment = '';
    },
    copyDelivery(text) { copyText(text, 'Data disalin 📋'); },
    async showQris(id) {
      try {
        const q = await api('/api/orders/' + id + '/qris');
        this.qris = { ...q, orderId: id };
      } catch (e) { toast(e.message, false); }
    },
    async cancelOrder(id) {
      if (!confirm('Batalkan pesanan #' + id + '?')) return;
      try {
        await api('/api/orders/' + id + '/cancel', { method: 'POST' });
        toast('Pesanan dibatalkan');
        this.load();
      } catch (e) { toast(e.message, false); }
    },
    complain(id) { store.ticketOrderId = id; go('tickets'); },
    uploadProof(id) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
        const fd = new FormData(); fd.append('bukti', f);
        try {
          const r = await fetch('/api/orders/' + id + '/proof', { method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Upload gagal');
          toast('Bukti bayar terupload');
          this.load();
        } catch (e) { toast(e.message, false); }
      };
      inp.click();
    },
    steps(status) {
      const all = [['pending', 'Pesanan dibuat'], ['proses', 'Diproses admin'], ['delivery', 'Pesanan dikirim'], ['selesai', 'Selesai']];
      const idx = all.findIndex(s => s[0] === status);
      return all.map(([s, t], i) => ({ s, t, done: idx >= 0 && i <= idx }));
    },
  },
  template: `
  <div class="max-w-3xl mx-auto px-4 py-4">
    <h2 class="text-xl font-bold mb-4">📦 Pesanan Saya</h2>
    <div v-if="!orders.length" class="text-gray-400 text-sm text-center py-8">Belum ada pesanan.</div>
    <div class="space-y-4">
      <div v-for="o in orders" :key="o.id" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div class="flex items-center justify-between text-sm">
          <b class="text-primary">#{{ o.id }}</b>
          <span class="text-gray-400 text-xs">{{ fmtDate(o.created_at) }}</span>
        </div>
        <div class="text-sm mt-2 space-y-1">
          <div v-for="it in (o.items || [])" :key="it.product_id" class="flex justify-between">
            <span class="truncate mr-2">{{ it.name }} × {{ it.qty }}</span>
            <span class="font-medium">{{ rp(it.price * it.qty) }}</span>
          </div>
        </div>
        <div class="flex justify-between text-sm font-extrabold border-t mt-2 pt-2">
          <span>Total</span><span class="text-accent">{{ rp(o.total) }}</span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Bayar via: <b>{{ payLabel(o) }}</b> · <status-badge :status="o.status"></status-badge></div>

        <div class="mt-3 space-y-1.5">
          <div v-for="st in steps(o.status)" :key="st.s" class="tl-step" :class="{ done: st.done }">
            <span class="dot">{{ st.done ? '✓' : '' }}</span><span>{{ st.t }}</span>
          </div>
        </div>

        <div v-if="o.delivery && o.delivery.length" class="mt-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 rounded-2xl p-3">
          <div class="text-xs font-bold text-primary dark:text-indigo-300 mb-2">📤 Data Pengiriman</div>
          <div class="space-y-2.5">
            <div v-for="dl in o.delivery" :key="dl.product_id" class="text-xs">
              <template v-if="dl.category === 'topup'">
                <div class="font-semibold">{{ dl.name }}</div>
                <div class="text-gray-500 dark:text-gray-400 mt-0.5">TRX ID: <b class="text-gray-700 dark:text-gray-300 font-mono">{{ dl.trx_id || '-' }}</b></div>
                <a v-if="dl.proof_path" :href="dl.proof_path" target="_blank">
                  <img :src="dl.proof_path" class="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700 mt-1.5 hover:scale-105 transition">
                </a>
                <div v-if="dl.proof_path" class="text-[10px] text-gray-400 mt-0.5">Bukti sukses topup</div>
              </template>
              <template v-else>
                <div class="font-semibold mb-1">{{ dl.name }}</div>
                <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 font-mono text-[11px] whitespace-pre-wrap break-all">{{ dl.data }}</div>
                <button @click="copyDelivery(dl.data)" class="mt-1.5 text-primary dark:text-indigo-300 font-bold hover:underline">📋 Salin</button>
              </template>
            </div>
          </div>
        </div>

        <div v-if="o.status === 'delivery'" class="mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-2xl p-3">
          <div class="text-xs font-bold mb-1 text-amber-800 dark:text-amber-200">⭐ Selesaikan Pesanan</div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Isi ulasan untuk semua produk ({{ Math.max(0, (o.items || []).length - eligFor(o.id).length) }}/{{ (o.items || []).length }}) agar pesanan bisa selesai. Tanpa ulasan 2 hari, pesanan otomatis selesai.</p>
          <button @click="complete(o.id)" class="w-full bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700">✅ Tandai Selesai</button>
        </div>
        <div v-if="o.status === 'proses'" class="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/25 rounded-2xl p-3 text-xs text-blue-700 dark:text-blue-300">⏳ Pesanan sedang diproses admin. Data pengiriman akan muncul di sini.</div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button v-if="payKind(o) === 'qris' && o.status === 'pending' && !o.proof_path"
                  @click="showQris(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-primary text-white hover:bg-indigo-700">⚡ Lihat QR Bayar</button>
          <button v-if="!o.proof_path && o.status !== 'dibatalkan' && o.status !== 'selesai'"
                  @click="uploadProof(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-primary text-white hover:bg-indigo-700">📤 Upload Bukti</button>
          <a v-if="o.proof_path" :href="o.proof_path" target="_blank"
             class="text-xs font-bold px-3 py-2.5 rounded-xl text-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">📎 Bukti Bayar</a>
          <button v-if="o.status === 'pending'" @click="cancelOrder(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">❌ Batalkan</button>
          <button @click="complain(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">💬 Komplain</button>
          <button v-for="e in eligFor(o.id)" :key="e.product_id" @click="openReview(e)"
                  class="col-span-2 text-xs font-bold px-3 py-2.5 rounded-xl bg-primary text-white hover:brightness-110">⭐ Tulis Ulasan: {{ e.product_name.slice(0, 24) }}</button>
        </div>
      </div>
    </div>
    <!-- Modal QRIS -->
    <div v-if="qris" class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" @click.self="qris = null">
      <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full text-center">
        <div class="text-lg font-extrabold mb-1">⚡ Scan untuk Bayar</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">Pesanan #{{ qris.orderId }} • {{ qris.merchant }}</div>
        <img :src="qris.qr" class="w-64 h-64 mx-auto rounded-2xl border border-gray-200 dark:border-gray-700" alt="QRIS">
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">Nominal</div>
        <div class="text-2xl font-extrabold text-accent">{{ rp(qris.amount) }}</div>
        <button @click="qris = null" class="mt-4 w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700">Tutup</button>
      </div>
    </div>
  </div>`
};
