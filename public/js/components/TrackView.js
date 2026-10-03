/* Lacak pesanan publik (tanpa login): ID + email */
const TrackView = {
  components: { StatusBadge },
  data: () => ({ orderId: '', email: '', result: null, err: '', loading: false, payLabels: {} }),
  methods: {
    rp, fmtDate,
    payLabel(id) { return this.payLabels[id] || id; },
    async track() {
      this.err = ''; this.result = null;
      if (!this.orderId || !this.email) return this.err = 'Isi ID pesanan dan email';
      this.loading = true;
      try {
        const d = await api(`/api/track?order_id=${encodeURIComponent(this.orderId)}&email=${encodeURIComponent(this.email)}`);
        this.result = d.order;
      } catch (e) { this.err = e.message; }
      finally { this.loading = false; }
    },
  },
  mounted() {
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      const l = {};
      for (const x of (d.pay_methods || [])) l[x.id] = x.label;
      this.payLabels = l;
    }).catch(() => {});
  },
  template: `
  <div class="max-w-lg mx-auto px-4 py-8">
    <h2 class="text-xl font-extrabold mb-1">🔍 Lacak Pesanan</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Masukkan ID pesanan dan email yang dipakai saat checkout.</p>
    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4 space-y-3">
      <input v-model="orderId" type="number" placeholder="ID Pesanan (mis. 25)" class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
      <input v-model="email" type="email" placeholder="Email" class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
      <button @click="track" :disabled="loading" class="w-full bg-primary text-white font-bold rounded-xl py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Mencari...' : 'Lacak' }}</button>
      <p v-if="err" class="text-xs text-red-500">{{ err }}</p>
    </div>
    <div v-if="result" class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <b class="text-primary">#{{ result.id }}</b>
        <status-badge :status="result.status"></status-badge>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Total: <b class="text-gray-800 dark:text-gray-100">{{ rp(result.total) }}</b><span v-if="result.discount > 0" class="text-green-600"> (diskon {{ rp(result.discount) }})</span></div>
        <div>Bayar via: {{ payLabel(result.payment_method) }} • {{ fmtDate(result.created_at) }}</div>
      </div>
      <div class="mt-3 space-y-1.5">
        <div v-for="it in result.items" :key="it.name" class="flex justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
          <span>{{ it.qty }}× {{ it.name }}</span><b>{{ rp(it.price * it.qty) }}</b>
        </div>
      </div>
    </div>
  </div>`
};
