/* Menu utama: katalog produk + flash sale + filter */
const HomeView = {
  components: { BlurImg, Stars },
  data: () => ({ banners: [], bannerIdx: 0, bannerTimer: null, flashEnds: '', now: Date.now(), cdTimer: null, testimonials: [] }),
  mounted() {
    fetch('/api/banners').then(r => r.json()).then(d => {
      this.banners = d.banners || [];
      if (this.banners.length > 1) {
        this.bannerTimer = setInterval(() => { this.bannerIdx = (this.bannerIdx + 1) % this.banners.length; }, 5000);
      }
    }).catch(() => {});
    fetch('/api/reviews/recent').then(r => r.json()).then(d => { this.testimonials = d.reviews || []; }).catch(() => {});
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      this.flashEnds = d.flash_sale_ends || '';
      if (this.flashEnds) this.cdTimer = setInterval(() => { this.now = Date.now(); }, 1000);
    }).catch(() => {});
  },
  beforeUnmount() { if (this.bannerTimer) clearInterval(this.bannerTimer); if (this.cdTimer) clearInterval(this.cdTimer); },
  computed: {
    f: () => store.f,
    countdown() {
      if (!this.flashEnds) return '';
      const diff = new Date(this.flashEnds).getTime() - this.now;
      if (diff <= 0) return 'Berakhir';
      const h = Math.floor(diff / 36e5), m = Math.floor(diff % 36e5 / 6e4), s = Math.floor(diff % 6e4 / 1e3);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },
    flash() { return store.products.filter(p => (p.discount || 0) > 0); },
    tags() {
      return [...new Set(store.products.flatMap(p => String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean)))].slice(0, 12);
    },
    list() {
      const q = store.f.q.toLowerCase();
      let arr = store.products.filter(p =>
        (store.f.cat === 'all' || p.category === store.f.cat) &&
        (!store.f.tag || String(p.tags || '').toLowerCase().includes(store.f.tag.toLowerCase())) &&
        (!q || (p.name + ' ' + (p.description || '') + ' ' + (p.tags || '')).toLowerCase().includes(q)));
      const sorters = {
        pop: (a, b) => (b.sold_count || 0) - (a.sold_count || 0),
        murah: (a, b) => a.price - b.price,
        mahal: (a, b) => b.price - a.price,
        rating: (a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0)
      };
      return arr.sort(sorters[store.f.sort] || sorters.pop);
    },
  },
  methods: {
    rp, finalPrice, CATLABEL, CATCOLOR,
    imgOf(p) { return (p.images && p.images[0] && p.images[0].url) || p.image_url; },
    openProduct(id) { openProduct(id); },
    addCart(id) {
      const p = store.products.find(x => x.id === id);
      if (!p || p.stock < 1) return toast('Stok habis', false);
      const c = store.cart.find(x => x.key === String(id));
      if (c) c.qty++;
      else store.cart.push({ key: String(id), id: p.id, variant_id: null, name: p.name, price: p.price, image_url: this.imgOf(p), qty: 1 });
      saveCart();
      toast('Ditambahkan ke keranjang 🛒');
    },
    isWished(id) { return store.wishlist.includes(id); },
    async toggleWish(id) {
      if (!store.user) { go('login'); return toast('Masuk dulu untuk wishlist', false); }
      try {
        if (this.isWished(id)) {
          await api('/api/wishlist/' + id, { method: 'DELETE' });
          store.wishlist = store.wishlist.filter(x => x !== id);
        } else {
          await api('/api/wishlist/' + id, { method: 'POST' });
          store.wishlist.push(id);
          toast('Ditambah ke wishlist ❤️');
        }
      } catch (e) { toast(e.message, false); }
    },
    buyNow(id) { this.addCart(id); go('checkout'); },
    setCat(c) { store.f.cat = c; store.f.tag = ''; },
    setTag(t) { store.f.tag = store.f.tag === t ? '' : t; },
    scrollToProducts() {
      const el = document.getElementById('home-products');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    seeAll() { store.f.cat = 'all'; store.f.tag = ''; store.f.q = ''; this.scrollToProducts(); },
    denomOf(p) {
      if (p.variants && p.variants.length) return p.variants.length + ' pilihan';
      if (p.category === 'voucher') return 'Kode voucher';
      return this.catLabel(p.category) || 'Top up';
    },
    catIcon(cat) {
      const c = (store.cats || []).find(x => x.id === cat || String(x.id) === String(cat));
      return (c && c.icon) || '🎮';
    },
    quickAdd(p) {
      if ((p.variants && p.variants.length) || p.stock < 1) { openProduct(p.id); return; }
      this.addCart(p.id);
    },
  },
  template: `
  <div class="max-w-6xl mx-auto px-5 py-5 space-y-7">
    <!-- Hero ala referensi -->
    <section class="relative overflow-hidden rounded-2xl border border-rline"
             style="background: linear-gradient(120deg, #23232f 0%, #1b1b28 60%, #1b1b28 100%);">
      <div class="absolute inset-0 opacity-40" style="background: radial-gradient(ellipse at 85% 30%, rgba(139,124,246,.25) 0%, transparent 55%);"></div>
      <div class="relative p-6 sm:p-8 min-h-[190px] flex flex-col justify-center max-w-[70%]">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Top Up Your Game</h1>
        <p class="text-sm text-rmuted mt-1.5">Instant • Secure • 24/7 Support</p>
        <button @click="scrollToProducts" class="mt-4 self-start bg-rlav/90 hover:bg-rlav text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition">Browse Offers</button>
      </div>
      <div class="absolute right-0 top-0 bottom-0 w-[45%] opacity-60 hidden sm:block" style="background: radial-gradient(ellipse at 70% 50%, rgba(139,124,246,.18) 0%, transparent 65%);"></div>
    </section>

    <!-- Categories ala referensi -->
    <section id="home-categories">
      <h2 class="text-lg font-bold text-white mb-3">Categories</h2>
      <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
        <button @click="setCat('all')"
                :class="['shrink-0 text-[13px] font-medium px-4 py-2 rounded-xl transition',
                  !f.cat || f.cat==='all' ? 'bg-transparent border-[1.5px] border-rlav text-rlav' : 'bg-rpill text-gray-800 border-[1.5px] border-transparent']">Semua</button>
        <button v-for="c in store.cats" :key="c.id" @click="setCat(c.id)"
                :class="['shrink-0 text-[13px] font-medium px-4 py-2 rounded-xl transition',
                  f.cat===c.id ? 'bg-transparent border-[1.5px] border-rlav text-rlav' : 'bg-rpill text-gray-800 border-[1.5px] border-transparent']">{{ c.label }}</button>
      </div>
    </section>

    <!-- Popular Top-ups ala referensi -->
    <section id="home-products">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-white">Popular Top-ups</h2>
        <button @click="seeAll" class="text-rlav text-sm font-medium">See all <span class="ml-0.5">›</span></button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        <div v-for="p in list" :key="p.id"
             class="bg-rcard border border-rline rounded-2xl p-4 flex flex-col cursor-pointer hover:border-[#4a4a68] transition"
             @click="openProduct(p.id)">
          <div class="w-11 h-11 rounded-xl bg-[#303044] border border-rline flex items-center justify-center overflow-hidden mb-3">
            <img v-if="imgOf(p)" :src="imgOf(p)" class="w-full h-full object-cover" :alt="p.name">
            <span v-else class="text-lg">{{ catIcon(p.category) }}</span>
          </div>
          <div class="text-[14px] font-bold text-white leading-snug clamp2" style="min-height:2.5em">{{ p.name }}</div>
          <div class="text-xs text-rmuted mt-1">{{ denomOf(p) }}</div>
          <div class="border-t border-rline mt-3 pt-3 flex items-center justify-between mt-auto">
            <span class="text-[15px] font-extrabold text-white">{{ rp(finalPrice(p)) }}</span>
            <button @click.stop="quickAdd(p)" :disabled="p.stock < 1"
                    class="w-9 h-9 rounded-xl bg-rlav/90 hover:bg-rlav text-white text-xl font-medium flex items-center justify-center disabled:opacity-30 transition"
                    title="Tambah ke keranjang">+</button>
          </div>
        </div>
        <div v-if="!list.length" class="col-span-full text-center py-14">
          <div class="text-5xl mb-3">🔍</div>
          <p class="text-sm text-rmuted mb-1">Produk tidak ditemukan 😢</p>
          <p class="text-xs text-rmuted/70 mb-4">Coba kata kunci lain atau lihat semua produk</p>
          <button @click="f.q=''; f.cat='all'; f.tag=''" class="bg-rlav text-white text-sm font-semibold rounded-xl px-6 py-2.5">Lihat Semua Produk</button>
        </div>
      </div>
    </section>

    <!-- Flash sale (dipertahankan, restyle) -->
    <section v-if="flash.length">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-white">⚡ Flash Sale</h2>
        <span v-if="countdown" class="text-xs font-mono font-bold bg-rcard border border-rline text-white px-2.5 py-1 rounded-lg">⏰ {{ countdown }}</span>
      </div>
      <div class="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
        <div v-for="p in flash" :key="p.id" @click="openProduct(p.id)"
             class="bg-rcard border border-rline rounded-2xl p-4 flex-shrink-0 w-40 cursor-pointer">
          <div class="text-[13px] font-bold text-white leading-snug clamp2" style="min-height:2.4em">{{ p.name }}</div>
          <div class="mt-2"><span class="text-[15px] font-extrabold text-white">{{ rp(finalPrice(p)) }}</span>
            <span class="text-[11px] text-rmuted line-through ml-1.5">{{ rp(p.price) }}</span></div>
          <div class="text-[10px] font-bold text-red-400 mt-1">-{{ Math.round(p.discount) }}%</div>
        </div>
      </div>
    </section>

    <!-- Testimoni (dipertahankan, restyle) -->
    <section v-if="testimonials.length">
      <h2 class="text-lg font-bold text-white mb-3">⭐ Kata Mereka</h2>
      <div class="flex gap-3.5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
        <div v-for="(t, i) in testimonials" :key="i" class="bg-rcard border border-rline rounded-2xl p-4 flex-shrink-0 w-64">
          <div class="text-amber-400 text-sm mb-1.5">{{ '★'.repeat(t.rating) }}<span class="text-[#4a4a68]">{{ '★'.repeat(5 - t.rating) }}</span></div>
          <p class="text-xs text-slate-300 leading-relaxed clamp2" style="min-height:2.6em">"{{ t.comment }}"</p>
          <div class="mt-2.5 pt-2.5 border-t border-rline">
            <div class="text-xs font-bold text-white">{{ t.user_name }}</div>
            <div class="text-[10px] text-rmuted">beli {{ t.product_name }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>`
};

async function openProduct(id) {
  try {
    const d = await api('/api/products/' + id);
    store.product = d.product;
    if (!store.product.images || !store.product.images.length) {
      store.product.images = store.product.image_url ? [{ id: 0, url: store.product.image_url }] : [];
    }
    store.galIdx = 0;
    store.reviews = (await api('/api/products/' + id + '/reviews')).reviews || [];
  } catch (e) { toast(e.message, false); }
}
