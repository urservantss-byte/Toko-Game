/* Keranjang belanja */
const CartView = {
  components: { BlurImg },
  computed: {
    cart: () => store.cart,
    total: () => cartTotal.value,
  },
  methods: {
    rp,
    itemPrice(c) {
      const p = store.products.find(x => x.id === c.id);
      return p ? finalPrice({ price: c.price, discount: p.discount }) : c.price;
    },
    chQty(i, d) {
      const c = store.cart[i];
      if (d > 0) {
        const max = this.maxQty(c);
        if (c.qty + d > max) return toast(`Stok tidak cukup (sisa ${max})`, false);
      }
      c.qty += d;
      if (c.qty < 1) store.cart.splice(i, 1);
      saveCart();
    },
    maxQty(c) {
      // stok tersedia untuk item keranjang (varian pakai snapshot saat ditambah, produk pakai data terbaru)
      if (c.variant_id) return c.stock != null ? c.stock : 0;
      const p = store.products.find(x => x.id === c.id);
      return p ? (p.stock || 0) : (c.stock != null ? c.stock : 0);
    },
    rm(i) { store.cart.splice(i, 1); saveCart(); },
    async checkout() {
      if (!store.cart.length) return;
      if (!store.user) { go('login'); return toast('Masuk dulu untuk checkout', false); }
      if (!await this.pruneCart()) return;
      go('checkout');
    },
    async pruneCart() {
      // Refresh stok dari server lalu bersihkan item yang habis / sesuaikan qty melebihi stok
      try {
        const ids = [...new Set(store.cart.map(c => c.id))];
        const fresh = {};
        await Promise.all(ids.map(async id => {
          try {
            const d = await api('/api/products/' + id);
            if (d.product) fresh[id] = d.product;
          } catch {}
        }));
        // update data produk lokal agar maxQty pakai angka terbaru
        for (const id of ids) {
          if (fresh[id]) {
            const i = store.products.findIndex(x => x.id === id);
            if (i >= 0) store.products[i] = { ...store.products[i], ...fresh[id] };
          }
        }
        // update snapshot stok varian di cart
        for (const c of store.cart) {
          const fp = fresh[c.id];
          if (fp && c.variant_id && fp.variants) {
            const v = fp.variants.find(v => v.id === c.variant_id);
            if (v) c.stock = v.stock || 0;
          } else if (fp && !c.variant_id) {
            c.stock = fp.stock || 0;
          }
        }
      } catch {}
      let removed = [], adjusted = [];
      store.cart = store.cart.filter(c => {
        const max = this.maxQty(c);
        if (max < 1) { removed.push(c.name); return false; }
        if (c.qty > max) { adjusted.push(`${c.name} (jadi ${max})`); c.qty = max; }
        return true;
      });
      saveCart();
      if (removed.length) toast(`Stok habis, dihapus dari keranjang: ${removed.join(', ')}`, false);
      else if (adjusted.length) toast(`Qty disesuaikan dengan stok: ${adjusted.join(', ')}`, false);
      if (!store.cart.length) { toast('Keranjang kosong', false); return false; }
      return true;
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
      <div v-for="(c, i) in cart" :key="c.key" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-3 flex gap-3 items-center">
        <blur-img :src="c.image_url" cls="w-16 h-16 rounded-xl shrink-0" :alt="c.name"></blur-img>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ c.name }}</div>
          <div class="text-accent font-extrabold text-sm mt-0.5">{{ rp(itemPrice(c)) }}</div>
          <div class="flex items-center gap-2 mt-1.5">
            <button @click="chQty(i, -1)" class="w-7 h-7 rounded-lg border border-gray-200 dark:border-nova-line text-sm font-bold">−</button>
            <span class="text-sm font-semibold w-6 text-center">{{ c.qty }}</span>
            <button @click="chQty(i, 1)" :disabled="c.qty >= maxQty(c)" class="w-7 h-7 rounded-lg border border-gray-200 dark:border-nova-line text-sm font-bold disabled:opacity-30">+</button>
          </div>
        </div>
        <button @click="rm(i)" class="text-gray-400 hover:text-red-500 p-2">🗑️</button>
      </div>
      <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 flex items-center justify-between">
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
    voucherCode: '', voucherDiscount: 0, voucherErr: '', voucherOk: '', payList: null }),
  mounted() {
    this._esc = e => { if (e.key === 'Escape' && this.qris) this.closeQris(); };
    document.addEventListener('keydown', this._esc);
    // Sinkron harga cart dengan harga terkini (mentah; diskon dihitung server saat checkout)
    for (const c of store.cart) {
      const p = store.products.find(x => x.id === c.id);
      if (!p) continue;
      if (!c.variant_id) c.price = p.price;
    }
    saveCart();
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      if (d.pay_methods && d.pay_methods.length) {
        this.payList = d.pay_methods;
        if (!this.payList.some(m => m.id === store.payMethod)) this.setMethod(this.payList[0].id);
      }
    }).catch(() => {});
  },
  unmounted() { document.removeEventListener('keydown', this._esc); },
  computed: {
    cart: () => store.cart,
    subtotal() {
      return store.cart.reduce((a, c) => {
        const p = store.products.find(x => x.id === c.id);
        const fp = p ? finalPrice({ price: c.price, discount: p.discount }) : c.price;
        return a + c.qty * fp;
      }, 0);
    },
    total() { return Math.max(0, this.subtotal - this.voucherDiscount); },
    method() { return this.payOpts.find(m => m.id === store.payMethod); },
    payOpts() { return this.payList || PAYMETHODS.map(m => ({ ...m, kind: m.id === 'qris' ? 'qris' : 'transfer' })); },
    needProof() { const m = this.method; return m ? m.kind === 'transfer' : String(store.payMethod).startsWith('transfer'); },
    isQris() { const m = this.method; return m ? m.kind === 'qris' : store.payMethod === 'qris'; },
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
    async onProof(e) {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
      const cf = await compressImage(f);
      store.proofFile = cf;
      this.proofPreview = URL.createObjectURL(cf);
    },
    async submit() {
      if (!store.cart.length) return;
      if (!await this.pruneCart()) return;
      if (this.needProof && !store.proofFile) return toast('Upload bukti pembayaran dulu', false);
      this.loading = true;
      try {
        const d = await api('/api/orders', { method: 'POST', body: JSON.stringify({
          items: store.cart.map(c => ({ product_id: c.id, variant_id: c.variant_id || null, qty: c.qty })),
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
        if (this.isQris) {
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
    async onQrisProof(e) {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast('Maksimal 5MB', false);
      const cf = await compressImage(f);
      this.qrisProof = cf;
      this.qrisProofPreview = URL.createObjectURL(cf);
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
    <h2 class="text-xl font-bold mb-3">💳 Checkout</h2>
    <!-- Progress indicator -->
    <div class="flex items-center justify-center mb-5 text-[11px] font-semibold">
      <div class="flex items-center gap-1.5 text-primary"><span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">1</span>Keranjang</div>
      <div class="w-8 sm:w-14 h-0.5 bg-primary mx-2 rounded"></div>
      <div class="flex items-center gap-1.5 text-primary"><span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">2</span>Bayar</div>
      <div class="w-8 sm:w-14 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2 rounded"></div>
      <div class="flex items-center gap-1.5 text-gray-400 dark:text-gray-500"><span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center text-[11px] font-bold">3</span>Selesai</div>
    </div>
    <div class="space-y-2 mb-4">
      <div v-for="m in payOpts" :key="m.id" @click="setMethod(m.id)"
           :class="['cursor-pointer border-2 rounded-2xl p-4 bg-white dark:bg-nova-surface', store.payMethod === m.id ? 'border-primary bg-indigo-50/50' : 'border-gray-100 dark:border-nova-line']">
        <div class="font-bold text-sm">{{ m.label }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ m.desc }}</div>
      </div>
    </div>
    <div v-if="isQris" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4 text-sm">
      <div class="font-semibold mb-1">⚡ Bayar via QRIS</div>
      <div class="text-gray-500 dark:text-gray-400 text-xs">Klik "Buat Pesanan", lalu scan QR yang muncul. Nominal sudah otomatis sesuai total — tidak perlu ketik jumlah.</div>
    </div>
    <div v-else class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4">
      <div class="text-sm font-semibold mb-2">📤 Upload Bukti Pembayaran <span class="text-red-500">*</span></div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">Transfer ke: <b>{{ method ? method.desc : '' }}</b> sebesar <b class="text-accent">{{ rp(total) }}</b></div>
      <input type="file" ref="proofInput" accept="image/*" class="hidden" @change="onProof">
      <button @click="$refs.proofInput.click()" class="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 text-sm text-gray-500 dark:text-gray-400 hover:border-primary">📁 Klik untuk pilih gambar (maks 5MB)</button>
      <img v-if="proofPreview" :src="proofPreview" class="mt-2 rounded-xl max-h-40">
    </div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4">
      <div class="text-sm font-semibold mb-2">🎟️ Kode Voucher</div>
      <div class="flex gap-2">
        <input v-model="voucherCode" placeholder="Punya kode promo?" class="flex-1 min-w-0 border border-gray-200 dark:border-nova-line rounded-xl px-3 py-2 text-sm uppercase outline-none focus:border-primary">
        <button @click="applyVoucher" class="bg-gray-900 text-white text-sm font-bold px-4 rounded-xl hover:bg-gray-700">Pakai</button>
      </div>
      <p v-if="voucherOk" class="text-xs text-green-600 mt-1.5">{{ voucherOk }}</p>
      <p v-if="voucherErr" class="text-xs text-red-500 mt-1.5">{{ voucherErr }}</p>
    </div>
    <div class="sticky bottom-20 md:static z-30 bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4 shadow-lg md:shadow-none">
      <div class="flex items-center justify-between text-sm mb-1"><span class="text-gray-500 dark:text-gray-400">Subtotal</span><span>{{ rp(subtotal) }}</span></div>
      <div v-if="voucherDiscount > 0" class="flex items-center justify-between text-sm mb-1"><span class="text-green-600">Diskon voucher</span><span class="text-green-600 font-bold">-{{ rp(voucherDiscount) }}</span></div>
      <div class="flex items-center justify-between"><span class="font-semibold text-sm">Total bayar</span><span class="text-accent font-extrabold text-lg">{{ rp(total) }}</span></div>
      <button @click="submit" :disabled="loading || !cart.length" class="mt-3 w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700 disabled:opacity-50">
        {{ loading ? 'Memproses...' : 'Buat Pesanan' }}
      </button>
    </div>
    <div class="flex items-center justify-center gap-2 mt-4 mb-2 text-[11px] text-gray-400 dark:text-gray-500">
      <span>🔒 Pembayaran aman & terenkripsi</span><span>·</span><span>⚡ Proses kilat</span><span>·</span><span>💬 CS siap membantu</span>
    </div>
    <div v-if="qris" class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" @click.self="closeQris">
      <div class="bg-white dark:bg-nova-surface rounded-3xl p-6 max-w-sm w-full text-center relative">
        <button @click="closeQris" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 dark:bg-nova-surface2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-lg leading-none" title="Tutup">✕</button>
        <div class="text-lg font-extrabold mb-1">⚡ Scan untuk Bayar</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">Pesanan #{{ qris.orderId }} • {{ qris.merchant }}</div>
        <img :src="qris.qr" class="w-64 h-64 mx-auto rounded-2xl border border-gray-200 dark:border-nova-line" alt="QRIS">
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">Nominal</div>
        <div class="text-2xl font-extrabold text-accent">{{ rp(qris.amount) }}</div>
        <div class="text-xs text-gray-400 mt-2 mb-3">Buka e-wallet / m-banking apa saja → scan → bayar pas sesuai nominal</div>
        <div class="text-left mb-3">
          <div class="text-xs font-semibold mb-1.5">📎 Bukti Pembayaran <span class="text-red-500">*</span></div>
          <input type="file" ref="qrisProofInput" accept="image/*" class="hidden" @change="onQrisProof">
          <button @click="$refs.qrisProofInput.click()" class="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 text-xs text-gray-500 dark:text-gray-400 hover:border-primary">📁 Upload screenshot bukti bayar (maks 5MB)</button>
          <img v-if="qrisProofPreview" :src="qrisProofPreview" class="mt-2 rounded-xl max-h-40 mx-auto">
        </div>
        <button @click="confirmQrisPaid" :disabled="loading" class="w-full bg-primary text-white font-bold rounded-2xl py-3 hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Mengirim...' : 'Saya Sudah Bayar ✓' }}</button>
        <button @click="closeQris" class="mt-2 w-full text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2">Tutup</button>
        <div class="text-[11px] text-gray-400 mt-2">Admin akan verifikasi pembayaranmu</div>
      </div>
    </div>
  </div>`
};
