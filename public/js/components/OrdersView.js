/* Halaman pesanan user: timeline, data delivery, ulasan, selesaikan */
const OrdersView = {
  components: { StatusBadge },
  data: () => ({ eligible: [], qris: null, payKinds: {}, payLabels: {}, pg: 1 }),
  computed: {
    orders: () => store.myOrders,
    store: () => store,
    totalPages() { return Math.max(1, Math.ceil(this.orders.length / 5)); },
    pagedOrders() {
      const p = Math.min(this.pg, this.totalPages);
      return this.orders.slice((p - 1) * 5, p * 5);
    },
  },
  mounted() {
    this.load();
    this._esc = e => { if (e.key === 'Escape' && this.qris) this.qris = null; };
    document.addEventListener('keydown', this._esc);
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      const m = {}, l = {};
      for (const x of (d.pay_methods || [])) { m[x.id] = x.kind; l[x.id] = x.label; }
      this.payKinds = m; this.payLabels = l;
    }).catch(() => {});
  },
  unmounted() { document.removeEventListener('keydown', this._esc); },
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
    async buyAgain(o) {
      const items = Array.isArray(o.items) ? o.items : [];
      if (!items.length) return toast('Tidak ada item di pesanan ini', false);
      let added = 0;
      for (const it of items) {
        try {
          const d = await api('/api/products/' + it.product_id);
          const p = d.product;
          if (!p) continue;
          const key = it.variant_id ? p.id + '_v' + it.variant_id : String(p.id);
          const c = store.cart.find(x => x.key === key);
          const img = (p.images && p.images[0] && p.images[0].url) || p.image_url;
          if (c) c.qty += it.qty;
          else store.cart.push({ key, id: p.id, variant_id: it.variant_id || null, name: it.name || p.name, price: it.price || p.price, image_url: img, qty: it.qty });
          added++;
        } catch {}
      }
      saveCart();
      if (added) { toast(added + ' produk dimasukkan keranjang'); go('cart'); }
      else toast('Produk sudah tidak tersedia', false);
    },
    uploadProof(id) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
        const cf = await compressImage(f);
        const fd = new FormData(); fd.append('bukti', cf);
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
    <div v-if="store.ordersLoading" class="space-y-3">
      <div v-for="i in 3" :key="'osk'+i" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 space-y-2.5">
        <div class="flex justify-between"><div class="skel h-4 w-24"></div><div class="skel h-5 w-20" style="border-radius:999px"></div></div>
        <div class="skel h-4 w-2/3"></div>
        <div class="skel h-4 w-1/3"></div>
      </div>
    </div>
    <div v-else-if="!orders.length" class="text-center py-14">
      <div class="text-5xl mb-3">📦</div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Belum ada pesanan</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Yuk mulai belanja, prosesnya cepat!</p>
      <button @click="go('home')" class="bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Mulai Belanja</button>
    </div>
    <div class="space-y-4">
      <div v-for="o in pagedOrders" :key="o.id" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 shadow-sm">
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
                  <img :src="dl.proof_path" class="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-nova-line mt-1.5 hover:scale-105 transition">
                </a>
                <div v-if="dl.proof_path" class="text-[10px] text-gray-400 mt-0.5">Bukti sukses topup</div>
              </template>
              <template v-else>
                <div class="font-semibold mb-1">{{ dl.name }}</div>
                <div class="bg-white dark:bg-nova-surface border border-gray-200 dark:border-nova-line rounded-xl p-2.5 font-mono text-[11px] whitespace-pre-wrap break-all">{{ dl.data }}</div>
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
             class="text-xs font-bold px-3 py-2.5 rounded-xl text-center bg-gray-100 dark:bg-nova-surface2 text-gray-700 dark:text-nova-text hover:bg-gray-200 dark:hover:bg-gray-700">📎 Bukti Bayar</a>
          <button v-if="o.status === 'pending'" @click="cancelOrder(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">❌ Batalkan</button>
          <button v-if="o.status === 'selesai'" @click="buyAgain(o)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">🔁 Beli Lagi</button>
          <button @click="complain(o.id)"
                  class="text-xs font-bold px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-nova-surface2 text-gray-700 dark:text-nova-text hover:bg-gray-200 dark:hover:bg-gray-700">💬 Komplain</button>
          <button v-for="e in eligFor(o.id)" :key="e.product_id" @click="openReview(e)"
                  class="col-span-2 text-xs font-bold px-3 py-2.5 rounded-xl bg-primary text-white hover:brightness-110">⭐ Tulis Ulasan: {{ e.product_name.slice(0, 24) }}</button>
        </div>
      </div>
    </div>
    <!-- Modal QRIS -->
    <div v-if="qris" class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" @click.self="qris = null">
      <div class="bg-white dark:bg-nova-surface rounded-3xl p-6 max-w-sm w-full text-center relative">
        <button @click="qris = null" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 dark:bg-nova-surface2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-lg leading-none" title="Tutup">✕</button>
        <div class="text-lg font-extrabold mb-1">⚡ Scan untuk Bayar</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">Pesanan #{{ qris.orderId }} • {{ qris.merchant }}</div>
        <img :src="qris.qr" class="w-64 h-64 mx-auto rounded-2xl border border-gray-200 dark:border-nova-line" alt="QRIS">
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">Nominal</div>
        <div class="text-2xl font-extrabold text-accent">{{ rp(qris.amount) }}</div>
        <button @click="qris = null" class="mt-4 w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700">Tutup</button>
      </div>
    </div>
    <!-- Pagination -->
    <div v-if="totalPages > 1 && orders.length" class="flex items-center justify-center gap-1.5 mt-5">
      <button @click="pg = Math.max(1, pg - 1)" :disabled="pg <= 1"
              class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">‹</button>
      <button v-for="n in totalPages" :key="n" @click="pg = n"
              :class="['w-9 h-9 rounded-full text-sm font-bold transition', pg === n ? 'text-white' : 'nv-btn-ghost !p-0']"
              :style="pg === n ? 'background:linear-gradient(135deg,#7a88ff,#5a68e8);box-shadow:0 4px 12px rgba(108,124,255,.4)' : ''">{{ n }}</button>
      <button @click="pg = Math.min(totalPages, pg + 1)" :disabled="pg >= totalPages"
              class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">›</button>
    </div>
  </div>`
};
