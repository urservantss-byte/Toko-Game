/* Modal detail produk: galeri + ulasan */
const ProductModal = {
  components: { BlurImg, Stars },
  data: () => ({ zoom: false, selVariant: null }),
  mounted() { this._bo = document.body.style.overflow; document.body.style.overflow = 'hidden'; this.selVariant = null; },
  beforeUnmount() { document.body.style.overflow = this._bo || ''; },
  computed: {
    p: () => store.product,
    imgs() { return (this.p && this.p.images) || []; },
    idx: {
      get: () => store.galIdx,
      set: v => { store.galIdx = v; }
    },
    reviews: () => store.reviews,
    variants() { return (this.p && this.p.variants) || []; },
    hasVariants() { return this.variants.length > 0; },
    curPrice() {
      const base = this.selVariant ? this.selVariant.price : (this.p ? this.p.price : 0);
      return finalPrice({ price: base, discount: this.p ? this.p.discount : 0 });
    },
    curStock() { return this.selVariant ? this.selVariant.stock : (this.p ? this.p.stock : 0); },
    wished() { return store.wishlist.includes(this.p && this.p.id); },
  },
  methods: {
    rp, finalPrice, CATLABEL, CATCOLOR,
    close() { this.zoom = false; store.product = null; },
    gal(i) {
      const n = this.imgs.length;
      if (!n) return;
      store.galIdx = (i + n) % n;
    },
    pickVariant(v) { this.selVariant = (this.selVariant && this.selVariant.id === v.id) ? null : v; },
    addCart(goCheckout) {
      const p = this.p;
      if (!p) return;
      if (this.hasVariants && !this.selVariant) return toast('Pilih varian dulu', false);
      if (this.curStock < 1) return;
      const key = this.selVariant ? p.id + '_v' + this.selVariant.id : String(p.id);
      const c = store.cart.find(x => x.key === key);
      const img = (p.images && p.images[0] && p.images[0].url) || p.image_url;
      const label = this.selVariant ? `${p.name} (${this.selVariant.label})` : p.name;
      const rawPrice = this.selVariant ? this.selVariant.price : p.price;
      if (c) c.qty++;
      else store.cart.push({ key, id: p.id, variant_id: this.selVariant ? this.selVariant.id : null, name: label, price: rawPrice, image_url: img, qty: 1 });
      saveCart();
      this.close();
      go(goCheckout ? 'checkout' : 'cart');
    },
    async toggleWish() {
      const p = this.p;
      if (!p) return;
      if (!store.user) { this.close(); go('login'); return toast('Masuk dulu untuk wishlist', false); }
      try {
        if (this.wished) {
          await api('/api/wishlist/' + p.id, { method: 'DELETE' });
          store.wishlist = store.wishlist.filter(id => id !== p.id);
        } else {
          await api('/api/wishlist/' + p.id, { method: 'POST' });
          store.wishlist.push(p.id);
        }
      } catch (e) { toast(e.message, false); }
    },
    openReview() {
      if (!store.user) { this.close(); go('login'); return toast('Masuk dulu untuk memberi ulasan', false); }
      store.reviewFor = { productId: this.p.id, orderId: null };
      store.reviewRating = 5; store.reviewComment = '';
    },
    tags() { return String(this.p.tags || '').split(',').map(t => t.trim()).filter(Boolean); },
  },
  template: `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
    <div class="absolute inset-0 bg-black/50" @click="close"></div>
    <div class="relative bg-white dark:bg-surface w-full max-w-md sm:max-w-lg rounded-3xl border dark:border-line max-h-[86vh] overflow-y-auto overscroll-contain">
      <div class="p-5">
        <div class="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div @click="zoom = true" class="cursor-zoom-in">
            <blur-img :src="imgs[idx] && imgs[idx].url" cls="w-full aspect-[4/3]" fit="contain" :alt="p.name" :eager="true" :key="idx"></blur-img>
          </div>
          <span class="absolute bottom-3 right-3 text-[11px] bg-black/60 text-white px-2.5 py-1 rounded-full font-medium">{{ idx + 1 }}/{{ imgs.length }}</span>
          <span class="absolute bottom-3 left-3 text-[11px] bg-black/60 text-white px-2.5 py-1 rounded-full font-medium pointer-events-none">🔍 ketuk untuk perbesar</span>
          <template v-if="imgs.length > 1">
            <button @click="gal(idx - 1)" class="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-gray-900/90 rounded-full shadow font-bold">‹</button>
            <button @click="gal(idx + 1)" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-gray-900/90 rounded-full shadow font-bold">›</button>
          </template>
          <button @click="close" class="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-gray-700/90 hover:dark:bg-gray-600 rounded-full shadow text-gray-600 dark:text-white">✕</button>
          <button @click="toggleWish" :class="['absolute top-2 left-2 w-8 h-8 rounded-full shadow text-lg', wished ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-gray-700/90 text-gray-400']" :title="wished ? 'Hapus dari wishlist' : 'Tambah ke wishlist'">{{ wished ? '❤️' : '🤍' }}</button>
        </div>
        <div v-if="imgs.length > 1" class="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          <img v-for="(im, j) in imgs" :key="j" :src="im.url" loading="lazy" @click="idx = j"
               :class="['w-16 h-16 object-cover rounded-xl cursor-pointer bg-gray-100 dark:bg-gray-800 shrink-0', j === idx ? 'ring-2 ring-primary' : '']">
        </div>
        <div class="mt-4">
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide" :style="{ background: catColor(p.category) }">{{ catLabel(p.category) }}</span>
          <h3 class="text-lg font-bold mt-2 leading-snug">{{ p.name }}</h3>
          <div class="text-[12px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <stars :value="Number(p.avg_rating) || 0"></stars>
            <b class="text-gray-700 dark:text-gray-300">{{ Number(p.avg_rating || 0).toFixed(1) }}</b> | {{ p.review_count || 0 }} ulasan | Terjual {{ p.sold_count || 0 }}
          </div>
          <div class="mt-2"><span class="text-accent font-extrabold text-2xl">{{ rp(curPrice) }}</span>
            <span v-if="p.discount > 0" class="text-sm text-gray-400 line-through ml-2">{{ rp(selVariant ? selVariant.price : p.price) }}</span>
            <span v-if="p.discount > 0" class="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full ml-2">-{{ Math.round(p.discount) }}%</span>
          </div>
          <div v-if="p.process_time" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">⚡ Rata-rata diproses dalam {{ p.process_time }}</div>
          <!-- Varian produk -->
          <div v-if="hasVariants" class="mt-3">
            <div class="text-xs font-bold mb-2 text-gray-600 dark:text-gray-300">Pilih varian:</div>
            <div class="flex flex-wrap gap-2">
              <button v-for="v in variants" :key="v.id" @click="pickVariant(v)" :disabled="v.stock < 1"
                :class="['px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition disabled:opacity-40',
                  selVariant && selVariant.id === v.id ? 'border-primary bg-indigo-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300']">
                {{ v.label }}<span class="block font-normal text-[10px] mt-0.5">{{ rp(finalPrice({ price: v.price, discount: p.discount })) }}</span>
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed whitespace-pre-line">{{ p.description }}</p>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span v-for="t in tags()" :key="t" class="text-xs bg-indigo-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-300 rounded-full px-3 py-1 font-medium">#{{ t }}</span>
          </div>
          <div :class="['text-xs mt-3 font-medium', curStock > 0 ? 'text-emerald-600' : 'text-red-500']">
            {{ curStock > 0 ? 'Stok tersedia: ' + curStock : 'Stok habis' }}
          </div>
          <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-bold text-sm">💬 Ulasan Pembeli</h4>
              <button @click="openReview" class="text-xs font-semibold text-primary">+ Tulis ulasan</button>
            </div>
            <div class="space-y-3 text-sm">
              <div v-for="r in reviews" :key="r.id" class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-xs">{{ r.user_name }}</span>
                  <span class="text-[10px] text-gray-400">{{ (r.created_at || '').slice(0, 10) }}</span>
                </div>
                <div class="mt-1"><stars :value="r.rating"></stars></div>
                <p v-if="r.comment" class="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{{ r.comment }}</p>
              </div>
              <div v-if="!reviews.length" class="text-gray-400 text-xs bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">Belum ada ulasan untuk produk ini.</div>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="addCart(false)" :disabled="curStock < 1" class="flex-1 border-2 border-primary text-primary font-bold rounded-xl py-2.5 text-sm disabled:opacity-40">+ Keranjang</button>
            <button @click="addCart(true)" :disabled="curStock < 1" class="flex-1 bg-primary text-white font-bold rounded-xl py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-40">Beli Sekarang</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="zoom" class="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center" @click.self="zoom = false">
      <img :src="imgs[idx] && imgs[idx].url" :alt="p.name" class="max-w-full max-h-[92vh] object-contain select-none" draggable="false">
      <button @click="zoom = false" class="absolute top-3 right-3 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full text-xl leading-none">✕</button>
      <span class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">{{ idx + 1 }}/{{ imgs.length }}</span>
      <template v-if="imgs.length > 1">
        <button @click.stop="gal(idx - 1)" class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/20 hover:bg-white/30 text-white rounded-full text-2xl font-bold">‹</button>
        <button @click.stop="gal(idx + 1)" class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/20 hover:bg-white/30 text-white rounded-full text-2xl font-bold">›</button>
      </template>
    </div>
  </div>`
};

/* Modal tulis ulasan (dipakai dari detail produk & halaman pesanan) */
const ReviewModal = {
  components: { Stars },
  computed: {
    show: () => !!store.reviewFor,
  },
  methods: {
    close() { store.reviewFor = null; },
    setRating(n) { store.reviewRating = n; },
    async submit() {
      const rf = store.reviewFor;
      if (!rf) return;
      try {
        const d = await api('/api/products/' + rf.productId + '/reviews',
          { method: 'POST', body: JSON.stringify({ rating: store.reviewRating, comment: store.reviewComment, order_id: rf.orderId }) });
        toast(d.order_completed ? 'Ulasan terkirim, pesanan selesai! 🎉' : 'Terima kasih atas ulasanmu! ⭐');
        this.close();
        if (store.product) {
          store.reviews = (await api('/api/products/' + rf.productId + '/reviews')).reviews || [];
        }
        loadMyOrders();
      } catch (e) { toast(e.message, false); }
    },
  },
  template: `
  <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click.self="close">
    <div class="absolute inset-0 bg-black/50" @click="close"></div>
    <div class="relative bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm">
      <h3 class="font-extrabold text-lg mb-1">⭐ Tulis Ulasan</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Ceritakan pengalamanmu dengan produk ini</p>
      <div class="flex gap-1.5 justify-center text-3xl mb-4">
        <span v-for="n in 5" :key="n" @click="setRating(n)" class="cursor-pointer"
              :class="n <= store.reviewRating ? 'text-amber-400' : 'text-gray-300'">★</span>
      </div>
      <textarea v-model="store.reviewComment" rows="3" placeholder="Ulasanmu (opsional)..."
                class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-200 dark:ring-violet-800"></textarea>
      <div class="flex gap-2 mt-4">
        <button @click="close" class="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-sm font-semibold">Batal</button>
        <button @click="submit" class="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold">Kirim Ulasan</button>
      </div>
    </div>
  </div>`
};
