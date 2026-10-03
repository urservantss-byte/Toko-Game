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
  },
  template: `
  <div class="max-w-6xl mx-auto px-4 py-4 space-y-5">
    <!-- Banner promo -->
    <section v-if="banners.length" class="relative overflow-hidden rounded-2xl">
      <div class="flex transition-transform duration-500" :style="{ transform: 'translateX(-' + bannerIdx * 100 + '%)' }">
        <a v-for="b in banners" :key="b.id" :href="b.link_url || undefined" @click="!b.link_url && $event.preventDefault()"
           class="w-full shrink-0 block">
          <img :src="b.image_url" class="w-full aspect-[16/6] object-cover" alt="Promo">
        </a>
      </div>
      <div v-if="banners.length > 1" class="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        <button v-for="(b, i) in banners" :key="b.id" @click="bannerIdx = i"
                class="w-2 h-2 rounded-full transition" :class="i === bannerIdx ? 'bg-white' : 'bg-white/50'"></button>
      </div>
    </section>
    <!-- Promo lacak pesanan -->
    <section class="g-panel p-4 flex items-center justify-between mb-1">
      <div>
        <div class="font-bold text-sm dark:text-slate-100">📦 Sudah pesan? Lacak di sini!</div>
        <div class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Pantau status pesananmu secara real-time</div>
      </div>
      <button @click="go('track')" class="btn-buy text-xs px-4 py-2.5 shrink-0">Lacak 🔍</button>
    </section>
    <!-- Flash sale -->
    <section v-if="flash.length">
      <div class="sec-head">
        <span class="bar"></span>
        <h2>⚡ Flash Sale</h2>
        <span class="text-[10px] bg-red-500/15 text-red-400 font-bold px-2 py-0.5 rounded-full">Diskon!</span>
        <span v-if="countdown" class="ml-auto text-xs font-mono font-bold bg-surface border border-line text-slate-200 px-2.5 py-1 rounded-lg">⏰ {{ countdown }}</span>
      </div>
      <div class="flex gap-3 overflow-x-auto styled-scroll pb-2 -mx-4 px-4">
        <div v-for="p in flash" :key="p.id" @click="openProduct(p.id)"
             class="g-card flex-shrink-0 w-32 sm:w-36 overflow-hidden cursor-pointer flex flex-col">
          <blur-img :src="imgOf(p)" cls="aspect-square" :alt="p.name"></blur-img>
          <div class="p-2 flex flex-col flex-1">
            <div class="text-xs font-medium clamp2 dark:text-slate-200" style="min-height:2.4em">{{ p.name }}</div>
            <div class="mt-1"><span class="price text-sm">{{ rp(finalPrice(p)) }}</span>
              <span v-if="p.discount > 0" class="text-[10px] text-slate-500 line-through ml-1">{{ rp(p.price) }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter chips -->
    <div class="flex gap-2 overflow-x-auto styled-scroll pb-1 -mx-4 px-4">
      <button @click="setCat('all')" :class="['chip text-xs px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap', !f.cat || f.cat==='all' ? 'on' : '']">Semua</button>
      <button v-for="c in store.cats" :key="c.id" @click="setCat(c.id)"
              :class="['chip text-xs px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap', f.cat===c.id ? 'on' : '']">{{ c.icon }} {{ c.label }}</button>
      <button v-for="t in tags" :key="t" @click="setTag(t)"
              :class="['text-xs px-3 py-1.5 rounded-full whitespace-nowrap border', f.tag===t ? 'bg-primary text-white border-primary' : 'chip']">#{{ t }}</button>
    </div>

    <!-- Sort + count -->
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ list.length }} produk</span>
      <select v-model="f.sort" class="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-900 outline-none">
        <option value="pop">Populer</option>
        <option value="murah">Termurah</option>
        <option value="mahal">Termahal</option>
        <option value="rating">Rating</option>
      </select>
    </div>

    <!-- Grid produk -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div v-for="p in list" :key="p.id" @click="openProduct(p.id)"
           class="g-card overflow-hidden cursor-pointer flex flex-col">
        <div class="relative aspect-square">
          <blur-img :src="imgOf(p)" cls="w-full h-full" :alt="p.name"></blur-img>
          <span class="absolute top-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide" :style="{ background: catColor(p.category) }">{{ catLabel(p.category) }}</span>
          <button @click.stop="toggleWish(p.id)" :class="['absolute top-2 right-2 w-7 h-7 rounded-full shadow text-sm flex items-center justify-center', isWished(p.id) ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-surface2/90 text-gray-400']" :title="isWished(p.id) ? 'Hapus dari wishlist' : 'Tambah ke wishlist'">{{ isWished(p.id) ? '❤️' : '🤍' }}</button>
          <span v-if="(p.images||[]).length > 1" class="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">📷 {{ p.images.length }}</span>
        </div>
        <div class="p-2.5 flex flex-col flex-1">
          <div class="text-[13px] font-medium leading-snug clamp2 dark:text-slate-100">{{ p.name }}</div>
          <div class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{{ catLabel(p.category) || '' }}</div>
          <div class="flex items-center justify-between mt-auto pt-1.5">
            <div><span class="price text-sm">{{ rp(finalPrice(p)) }}</span>
              <span v-if="p.discount > 0" class="text-[10px] text-slate-500 line-through ml-1">{{ rp(p.price) }}</span></div>
            <span v-if="p.discount > 0" class="text-[10px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">-{{ Math.round(p.discount) }}%</span>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            <div class="text-[10px] text-gray-400 dark:text-slate-500">{{ p.sold_count ? p.sold_count + ' Terjual' : 'Baru' }}</div>
            <div class="text-[10px] text-gray-500 dark:text-slate-400">⭐ <b class="text-gray-700 dark:text-slate-200">{{ Number(p.avg_rating || 0).toFixed(1) }}</b></div>
          </div>
          <button @click.stop="buyNow(p.id)" :disabled="p.stock < 1"
                  class="btn-buy mt-2 w-full text-[11px] py-1.5 disabled:opacity-40">🛒 Beli</button>
        </div>
      </div>
      <div v-if="!list.length" class="col-span-full text-center py-14">
        <div class="text-5xl mb-3">🔍</div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Produk tidak ditemukan 😢</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Coba kata kunci lain atau lihat semua produk</p>
        <button @click="f.q=''; f.cat='all'; f.tag=''" class="bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Lihat Semua Produk</button>
      </div>
    </div>
    <!-- Testimoni pembeli -->
    <section v-if="testimonials.length" class="mt-8">
      <div class="sec-head">
        <span class="bar"></span>
        <h2>⭐ Kata Mereka</h2>
        <span class="text-[10px] bg-amber-500/15 text-amber-400 font-bold px-2 py-0.5 rounded-full">Testimoni asli</span>
      </div>
      <div class="flex gap-3 overflow-x-auto styled-scroll pb-2 -mx-4 px-4">
        <div v-for="(t, i) in testimonials" :key="i" class="g-card flex-shrink-0 w-64 p-4">
          <div class="text-amber-400 text-sm mb-1.5">{{ '★'.repeat(t.rating) }}<span class="text-slate-600">{{ '★'.repeat(5 - t.rating) }}</span></div>
          <p class="text-xs text-gray-600 dark:text-slate-300 leading-relaxed clamp2" style="min-height:2.6em">"{{ t.comment }}"</p>
          <div class="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-line">
            <div class="text-xs font-bold dark:text-slate-100">{{ t.user_name }}</div>
            <div class="text-[10px] text-gray-400 dark:text-slate-500">beli {{ t.product_name }}</div>
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
