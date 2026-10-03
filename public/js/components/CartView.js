/* Keranjang belanja */
const CartView = {
  components: { BlurImg },
  computed: {
    cart: () => store.cart,
    total: () => cartTotal.value,
  },
  methods: {
    rp,
    chQty(i, d) {
      const c = store.cart[i];
      c.qty += d;
      if (c.qty < 1) store.cart.splice(i, 1);
      saveCart();
    },
    rm(i) { store.cart.splice(i, 1); saveCart(); },
    checkout() {
      if (!store.cart.length) return;
      if (!store.user) { go('login'); return toast('Masuk dulu untuk checkout', false); }
      go('checkout');
    },
  },
  template: `
  <div class="max-w-3xl mx-auto px-4 py-4">
    <h2 class="text-xl font-bold mb-4">🛒 Keranjang</h2>
    <div v-if="!cart.length" class="text-center py-16 text-gray-400">
      <div class="text-5xl mb-3">🛒</div>
      <p class="text-sm">Keranjang masih kosong</p>
      <button @click="go('home')" class="mt-4 bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Belanja Sekarang</button>
    </div>
    <div v-else class="space-y-3">
      <div v-for="(c, i) in cart" :key="c.id" class="bg-white dark:bg-gray-900 border rounded-2xl p-3 flex gap-3 items-center">
        <blur-img :src="c.image_url" cls="w-16 h-16 rounded-xl shrink-0" :alt="c.name"></blur-img>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ c.name }}</div>
          <div class="text-accent font-extrabold text-sm mt-0.5">{{ rp(c.price) }}</div>
          <div class="flex items-center gap-2 mt-1.5">
            <button @click="chQty(i, -1)" class="w-7 h-7 rounded-lg border text-sm font-bold">−</button>
            <span class="text-sm font-semibold w-6 text-center">{{ c.qty }}</span>
            <button @click="chQty(i, 1)" class="w-7 h-7 rounded-lg border text-sm font-bold">+</button>
          </div>
        </div>
        <button @click="rm(i)" class="text-gray-400 hover:text-red-500 p-2">🗑️</button>
      </div>
      <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-center justify-between">
        <span class="font-semibold text-sm">Total</span>
        <span class="text-accent font-extrabold text-lg">{{ rp(total) }}</span>
      </div>
      <button @click="checkout" class="w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700">Checkout →</button>
    </div>
  </div>`
};

/* Checkout: metode pembayaran + bukti transfer */
const CheckoutView = {
  data: () => ({ loading: false, proofPreview: '', qris: null, qrisProof: null, qrisProofPreview: '',
    voucherCode: '', voucherDiscount: 0, voucherErr: '', voucherOk: '' }),
  computed: {
    cart: () => store.cart,
    subtotal: () => cartTotal.value,
    total() { return Math.max(0, this.subtotal - this.voucherDiscount); },
    method() { return PAYMETHODS.find(m => m.id === store.payMethod); },
    needProof() { return store.payMethod.startsWith('transfer'); },
    PAYMETHODS: () => PAYMETHODS,
  },
  methods: {
    rp,
    setMethod(id) { store.payMethod = id; store.proofFile = null; this.proofPreview = ''; },
    async applyVoucher() {
      this.voucherErr = ''; this.voucherOk = ''; this.voucherDiscount = 0;
      const code = this.voucherCode.trim();
      if (!code) return;
      try {
        const d = await api('/api/vouchers/validate', { method: 'POST',
          body: JSON.stringify({ code, total: this.subtotal }) });
        this.voucherDiscount = d.discount;
        this.voucherOk = `Voucher ${code.toUpperCase()} aktif! Hemat ${rp(d.discount)} 🎉`;
      } catch (e) { this.voucherErr = e.message; }
    },
    onProof(e) {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
      store.proofFile = f;
      this.proofPreview = URL.createObjectURL(f);
    },
    async submit() {
      if (!store.cart.length) return;
      if (this.needProof && !store.proofFile) return toast('Upload bukti pembayaran dulu', false);
      this.loading = true;
      try {
        const d = await api('/api/orders', { method: 'POST', body: JSON.stringify({
          items: store.cart.map(c => ({ product_id: c.id, qty: c.qty })),
          payment_method: store.payMethod,
          voucher_code: this.voucherDiscount > 0 ? this.voucherCode.trim().toUpperCase() : undefined
        }) });
        if (this.needProof && store.proofFile) {
          const fd = new FormData();
          fd.append('bukti', store.proofFile);
          const r = await fetch('/api/orders/' + d.order.id + '/proof', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd
          });
          const pd = await r.json();
          if (!r.ok) throw new Error(pd.error || 'Upload gagal');
        }
        store.cart = []; store.proofFile = null; saveCart();
        if (store.payMethod === 'qris') {
          try {
            const q = await api('/api/orders/' + d.order.id + '/qris');
            this.qris = { ...q, orderId: d.order.id };
          } catch (e) { toast(e.message, false); go('orders'); }
        } else {
          toast('Pesanan #' + d.order.id + ' dibuat! 🎉');
          go('orders');
        }
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    onQrisProof(e) {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
      this.qrisProof = f;
      this.qrisProofPreview = URL.createObjectURL(f);
    },
    async confirmQrisPaid() {
      if (!this.qrisProof) return toast('Upload bukti pembayaran dulu 📎', false);
      this.loading = true;
      try {
        const fd = new FormData();
        fd.append('bukti', this.qrisProof);
        const r = await fetch('/api/orders/' + this.qris.orderId + '/proof', {
          method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd
        });
        const pd = await r.json();
        if (!r.ok) throw new Error(pd.error || 'Upload gagal');
        toast('Bukti terkirim, menunggu verifikasi admin ✓');
        this.closeQris();
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    closeQris() { this.qris = null; this.qrisProof = null; this.qrisProofPreview = ''; go('orders'); },
  },
  template: `
  <div class="max-w-3xl mx-auto px-4 py-4">
    <h2 class="text-xl font-bold mb-4">💳 Checkout</h2>
    <div class="space-y-2 mb-4">
      <div v-for="m in PAYMETHODS" :key="m.id" @click="setMethod(m.id)"
           :class="['cursor-pointer border-2 rounded-2xl p-4 bg-white dark:bg-gray-900', store.payMethod === m.id ? 'border-primary bg-indigo-50/50' : 'border-gray-100 dark:border-gray-800']">
        <div class="font-bold text-sm">{{ m.label }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ m.desc }}</div>
      </div>
    </div>
    <div v-if="store.payMethod === 'qris'" class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mb-4 text-sm">
      <div class="font-semibold mb-1">⚡ Bayar via QRIS</div>
      <div class="text-gray-500 dark:text-gray-400 text-xs">Klik "Buat Pesanan", lalu scan QR yang muncul. Nominal sudah otomatis sesuai total — tidak perlu ketik jumlah.</div>
    </div>
    <div v-else class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mb-4">
      <div class="text-sm font-semibold mb-2">📤 Upload Bukti Pembayaran <span class="text-red-500">*</span></div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">Transfer ke: <b>{{ method.desc }}</b> sebesar <b class="text-accent">{{ rp(total) }}</b></div>
      <input type="file" ref="proofInput" accept="image/*" class="hidden" @change="onProof">
      <button @click="$refs.proofInput.click()" class="w-full border-2 border-dashed rounded-2xl p-6 text-sm text-gray-500 dark:text-gray-400 hover:border-primary">📁 Klik untuk pilih gambar (maks 5MB)</button>
      <img v-if="proofPreview" :src="proofPreview" class="mt-2 rounded-xl max-h-40">
    </div>
    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mb-4">
      <div class="text-sm font-semibold mb-2">🎟️ Kode Voucher</div>
      <div class="flex gap-2">
        <input v-model="voucherCode" placeholder="Punya kode promo?" class="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm uppercase outline-none focus:border-primary">
        <button @click="applyVoucher" class="bg-gray-900 text-white text-sm font-bold px-4 rounded-xl hover:bg-gray-700">Pakai</button>
      </div>
      <p v-if="voucherOk" class="text-xs text-green-600 mt-1.5">{{ voucherOk }}</p>
      <p v-if="voucherErr" class="text-xs text-red-500 mt-1.5">{{ voucherErr }}</p>
    </div>
    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mb-4">
      <div class="flex items-center justify-between text-sm mb-1"><span class="text-gray-500 dark:text-gray-400">Subtotal</span><span>{{ rp(subtotal) }}</span></div>
      <div v-if="voucherDiscount > 0" class="flex items-center justify-between text-sm mb-1"><span class="text-green-600">Diskon voucher</span><span class="text-green-600 font-bold">-{{ rp(voucherDiscount) }}</span></div>
      <div class="flex items-center justify-between"><span class="font-semibold text-sm">Total bayar</span><span class="text-accent font-extrabold text-lg">{{ rp(total) }}</span></div>
    </div>
    <button @click="submit" :disabled="loading || !cart.length" class="w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700 disabled:opacity-50">
      {{ loading ? 'Memproses...' : 'Buat Pesanan' }}
    </button>
    <!-- Modal QRIS -->
    <div v-if="qris" class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" @click.self="closeQris">
      <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full text-center">
        <div class="text-lg font-extrabold mb-1">⚡ Scan untuk Bayar</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">Pesanan #{{ qris.orderId }} • {{ qris.merchant }}</div>
        <img :src="qris.qr" class="w-64 h-64 mx-auto rounded-2xl border" alt="QRIS">
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">Nominal</div>
        <div class="text-2xl font-extrabold text-accent">{{ rp(qris.amount) }}</div>
        <div class="text-xs text-gray-400 mt-2 mb-3">Buka e-wallet / m-banking apa saja → scan → bayar pas sesuai nominal</div>
        <div class="text-left mb-3">
          <div class="text-xs font-semibold mb-1.5">📎 Bukti Pembayaran <span class="text-red-500">*</span></div>
          <input type="file" ref="qrisProofInput" accept="image/*" class="hidden" @change="onQrisProof">
          <button @click="$refs.qrisProofInput.click()" class="w-full border-2 border-dashed rounded-2xl p-4 text-xs text-gray-500 dark:text-gray-400 hover:border-primary">📁 Upload screenshot bukti bayar (maks 5MB)</button>
          <img v-if="qrisProofPreview" :src="qrisProofPreview" class="mt-2 rounded-xl max-h-40 mx-auto">
        </div>
        <button @click="confirmQrisPaid" :disabled="loading" class="w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Mengirim...' : 'Saya Sudah Bayar ✓' }}</button>
        <div class="text-[11px] text-gray-400 mt-2">Admin akan verifikasi pembayaranmu</div>
      </div>
    </div>
  </div>`
};
