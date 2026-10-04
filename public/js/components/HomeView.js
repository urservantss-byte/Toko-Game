/* Menu utama: katalog produk + flash sale + filter */
const HomeView = {
  components: { BlurImg, Stars },
  data: () => ({ banners: [], bannersLoading: true, bannerIdx: 0, bannerTimer: null, flashEnds: '', now: Date.now(), cdTimer: null, testimonials: [], testimonialsLoading: true, pg: 1 }),
  mounted() {
    fetch('/api/banners').then(r => r.json()).then(d => {
      this.banners = d.banners || [];
      if (this.banners.length > 1) {
        this.bannerTimer = setInterval(() => { this.bannerIdx = (this.bannerIdx + 1) % this.banners.length; }, 5000);
      }
    }).catch(() => {}).finally(() => { this.bannersLoading = false; });
    fetch('/api/reviews/recent').then(r => r.json()).then(d => { this.testimonials = d.reviews || []; }).catch(() => {}).finally(() => { this.testimonialsLoading = false; });
    fetch('/api/settings/public').then(r => r.json()).then(d => {
      this.flashEnds = d.flash_sale_ends || '';
      if (this.flashEnds) this.cdTimer = setInterval(() => { this.now = Date.now(); }, 1000);
    }).catch(() => {});
  },
  beforeUnmount() { if (this.bannerTimer) clearInterval(this.bannerTimer); if (this.cdTimer) clearInterval(this.cdTimer); },
  computed: {
    f: () => store.f,
    store: () => store,
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
        (!store.f.sub || p.subcategory_id === store.f.sub) &&
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
    totalPages() { return Math.max(1, Math.ceil(this.list.length / 10)); },
    pagedList() {
      const p = Math.min(this.pg, this.totalPages);
      return this.list.slice((p - 1) * 10, p * 10);
    },
    activeCat() {
      const fc = store.f.cat;
      if (!fc || fc === 'all') return null;
      return (store.cats || []).find(c => c.id === fc) || null;
    },
    rootCats() { return (store.cats || []).filter(c => !c.parent_id); },
    activeSubcats() {
      const fc = store.f.cat;
      if (!fc || fc === 'all') return [];
      return (store.cats || []).filter(c => c.parent_id === fc);
    },
  },
  watch: {
    list() { this.pg = 1; },
  },
  methods: {
    rp, finalPrice, CATLABEL, CATCOLOR,
    goPage(n) {
      this.pg = Math.min(Math.max(1, n), this.totalPages);
      const el = document.getElementById('all-products');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
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
    setCat(c) { store.f.cat = c; store.f.sub = ''; store.f.tag = ''; },
    setSub(sc) { store.f.sub = store.f.sub === sc ? '' : sc; },
    setTag(t) { store.f.tag = store.f.tag === t ? '' : t; },
    catProducts(catId) {
      return store.products.filter(p => p.category === catId).slice(0, 12);
    },
    showCatSection(c) {
      if (store.productsLoading) return false;
      const fc = store.f.cat;
      // Slider kategori hanya di menu utama. Kalau lagi lihat kategori spesifik / search / tag → sembunyikan semua slider, tampil grid saja.
      if (fc && fc !== 'all') return false;
      if (store.f.q || store.f.tag) return false;
      return this.catProducts(c.id).length > 0;
    },
  },
  template: `
  <div class="max-w-6xl mx-auto px-4 py-4 space-y-5">
    <!-- Banner promo -->
    <section v-if="bannersLoading" class="relative overflow-hidden" style="border-radius:1.25rem">
      <div class="skel w-full aspect-[16/6]" style="border-radius:1.25rem"></div>
    </section>
    <section v-if="banners.length" class="relative overflow-hidden" style="border-radius:1.25rem;box-shadow:0 8px 32px rgba(0,0,0,.4)">
      <div class="flex transition-transform duration-500" :style="{ transform: 'translateX(-' + bannerIdx * 100 + '%)' }">
        <a v-for="b in banners" :key="b.id" :href="b.link_url || undefined" @click="!b.link_url && $event.preventDefault()"
           class="w-full shrink-0 block">
          <img :src="b.image_url" class="w-full aspect-[16/6] object-cover" alt="Promo">
        </a>
      </div>
      <div v-if="banners.length > 1" class="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
        <button v-for="(b, i) in banners" :key="b.id" @click="bannerIdx = i"
                class="h-1.5 rounded-full transition-all" :class="i === bannerIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'"></button>
      </div>
    </section>
    <!-- Promo lacak pesanan -->
    <section class="nv-card p-4 flex items-center justify-between mb-1">
      <div>
        <div class="font-bold text-sm dark:text-nova-text">📦 Sudah pesan? Lacak di sini!</div>
        <div class="text-[11px] text-gray-500 dark:text-nova-muted mt-0.5">Pantau status pesananmu secara real-time</div>
      </div>
      <button @click="go('track')" class="nv-btn text-xs px-5 py-2.5 shrink-0">Lacak 🔍</button>
    </section>
    <!-- Flash sale -->
    <section v-if="store.productsLoading">
      <div class="flex items-center gap-2 mb-2">
        <div class="skel h-5 w-28"></div>
      </div>
      <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        <div v-for="i in 4" :key="'fsk'+i" class="flex-shrink-0 w-32 sm:w-36 nv-card overflow-hidden">
          <div class="skel aspect-square" style="border-radius:0"></div>
          <div class="p-2 space-y-1.5"><div class="skel h-3 w-full"></div><div class="skel h-3.5 w-2/3"></div></div>
        </div>
      </div>
    </section>
    <section v-if="flash.length">
      <div class="nv-sec">
        <span class="dot"></span>
        <h2>⚡ Flash Sale</h2>
        <span class="nv-badge nv-badge-red">Diskon!</span>
        <span v-if="countdown" class="ml-auto text-xs font-mono font-bold nv-card px-2.5 py-1 dark:text-nova-text">⏰ {{ countdown }}</span>
      </div>
      <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        <div v-for="p in flash" :key="p.id" @click="openProduct(p.id)"
             class="nv-card clickable flex-shrink-0 w-32 sm:w-36 overflow-hidden flex flex-col">
          <blur-img :src="imgOf(p)" cls="aspect-square" :alt="p.name"></blur-img>
          <div class="p-2 flex flex-col flex-1">
            <div class="text-xs font-medium clamp2 dark:text-nova-text" style="min-height:2.4em">{{ p.name }}</div>
            <div class="mt-1"><span class="nv-price text-sm">{{ rp(finalPrice(p)) }}</span>
              <span v-if="p.discount > 0" class="text-[10px] text-gray-400 dark:text-nova-muted line-through ml-1">{{ rp(p.price) }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter chips -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
      <button @click="setCat('all')" :class="['nv-chip', !f.cat || f.cat==='all' ? 'on' : '']">Semua</button>
      <button v-for="c in rootCats" :key="c.id" @click="setCat(c.id)"
              :class="['nv-chip', f.cat===c.id ? 'on' : '']">{{ c.icon }} {{ c.label }}</button>
      <button v-for="t in tags" :key="t" @click="setTag(t)"
              :class="['nv-chip', f.tag===t ? 'on' : '']">#{{ t }}</button>
    </div>
    <div v-if="activeSubcats.length" class="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 -mt-3">
      <button @click="setSub('')" :class="['nv-chip !text-xs', !f.sub ? 'on' : '']">Semua {{ activeCat ? activeCat.label : '' }}</button>
      <button v-for="sc in activeSubcats" :key="sc.id" @click="setSub(sc.id)"
              :class="['nv-chip !text-xs', f.sub===sc.id ? 'on' : '']">{{ sc.icon }} {{ sc.label }}</button>
    </div>

    <!-- Sort -->
    <div class="flex items-center justify-end">
      <select v-model="f.sort" class="text-sm rounded-full px-4 py-2 bg-white dark:bg-nova-surface dark:border dark:border-nova-line dark:text-nova-text outline-none cursor-pointer">
        <option value="pop">🔥 Populer</option>
        <option value="murah">💰 Termurah</option>
        <option value="mahal">💎 Termahal</option>
        <option value="rating">⭐ Rating</option>
      </select>
    </div>

    <!-- Produk per kategori (slider) -->
    <template v-for="c in rootCats" :key="'cs'+c.id">
      <section v-if="showCatSection(c)">
        <div class="nv-sec">
          <span class="dot"></span>
          <h2>{{ c.icon }} {{ c.label }}</h2>
          <a class="more" @click="setCat(c.id)">Lihat semua ›</a>
        </div>
        <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          <div v-for="p in catProducts(c.id)" :key="p.id" @click="openProduct(p.id)"
               class="nv-card clickable flex-shrink-0 w-28 sm:w-36 overflow-hidden">
            <div class="relative">
              <blur-img :src="imgOf(p)" cls="aspect-square w-full" :alt="p.name"></blur-img>
              <span v-if="p.discount > 0" class="absolute top-1.5 left-1.5 nv-badge nv-badge-red !text-[9px] !px-1.5 !py-0.5">-{{ Math.round(p.discount) }}%</span>
            </div>
            <div class="p-2">
              <div class="text-[11px] font-semibold leading-snug clamp2 dark:text-nova-text" style="min-height:2.2em">{{ p.name }}</div>
              <div class="nv-price text-xs mt-1">{{ rp(finalPrice(p)) }}</div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Semua produk (grid normal, tanpa slide) -->
    <section id="all-products">
      <div class="nv-sec">
        <span class="dot"></span>
        <h2>{{ activeCat ? activeCat.icon + ' ' + activeCat.label : '🛍️ Semua Produk' }}</h2>
        <span class="text-xs text-gray-500 dark:text-nova-muted font-medium">{{ list.length }} produk</span>
        <a v-if="activeCat" class="more" @click="setCat('all')">← Kembali</a>
      </div>
    <!-- Grid produk -->
    <div v-if="store.productsLoading" class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div v-for="i in 6" :key="'sk'+i" class="nv-card overflow-hidden">
        <div class="skel aspect-square" style="border-radius:0"></div>
        <div class="p-2.5 space-y-2">
          <div class="skel h-3.5 w-full"></div>
          <div class="skel h-3.5 w-2/3"></div>
          <div class="skel h-4 w-1/2"></div>
          <div class="skel h-8 w-full" style="border-radius:999px"></div>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div v-for="p in pagedList" :key="p.id" @click="openProduct(p.id)"
           class="nv-card clickable overflow-hidden flex flex-col">
        <div class="relative aspect-square">
          <blur-img :src="imgOf(p)" cls="w-full h-full" :alt="p.name"></blur-img>
          <span class="absolute top-2 left-2 nv-badge" :style="{ background: catColor(p.category) + '22', color: '#fff', border: '1px solid ' + catColor(p.category) + '66' }">{{ catLabel(p.category) }}</span>
          <button @click.stop="toggleWish(p.id)" :class="['absolute top-2 right-2 w-8 h-8 rounded-full text-sm flex items-center justify-center transition', isWished(p.id) ? 'text-white' : 'bg-black/40 text-gray-300 backdrop-blur']"
                  :style="isWished(p.id) ? 'background:linear-gradient(135deg,#ff6b8a,#e83e6b);box-shadow:0 4px 12px rgba(255,107,138,.4)' : ''"
                  :title="isWished(p.id) ? 'Hapus dari wishlist' : 'Tambah ke wishlist'">{{ isWished(p.id) ? '❤️' : '🤍' }}</button>
          <span v-if="(p.images||[]).length > 1" class="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur">📷 {{ p.images.length }}</span>
        </div>
        <div class="p-3 flex flex-col flex-1">
          <div class="text-[13px] font-semibold leading-snug clamp2 dark:text-nova-text">{{ p.name }}</div>
          <div class="text-[10px] text-gray-400 dark:text-nova-muted mt-0.5">{{ catLabel(p.category) || '' }}</div>
          <div class="flex items-center justify-between mt-auto pt-2">
            <div><span class="nv-price text-[15px]">{{ rp(finalPrice(p)) }}</span>
              <span v-if="p.discount > 0" class="text-[10px] text-gray-400 dark:text-nova-muted line-through ml-1">{{ rp(p.price) }}</span></div>
            <span v-if="p.discount > 0" class="nv-badge nv-badge-red">-{{ Math.round(p.discount) }}%</span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <div class="text-[10px] text-gray-400 dark:text-nova-muted">{{ p.sold_count ? p.sold_count + ' Terjual' : '✨ Baru' }}</div>
            <div class="text-[10px] text-gray-500 dark:text-nova-muted">⭐ <b class="text-gray-700 dark:text-nova-text">{{ Number(p.avg_rating || 0).toFixed(1) }}</b></div>
          </div>
          <button @click.stop="buyNow(p.id)" :disabled="p.stock < 1"
                  class="nv-btn mt-2.5 w-full text-xs py-2 disabled:opacity-40">🛒 Beli Sekarang</button>
        </div>
      </div>
      <div v-if="!list.length" class="col-span-full text-center py-14">
        <div class="text-5xl mb-3">🔍</div>
        <p class="text-sm text-gray-500 dark:text-nova-muted mb-1">Produk tidak ditemukan 😢</p>
        <p class="text-xs text-gray-400 dark:text-nova-muted mb-4">Coba kata kunci lain atau lihat semua produk</p>
        <button @click="f.q=''; f.cat='all'; f.tag=''" class="nv-btn text-sm px-6 py-2.5">Lihat Semua Produk</button>
      </div>
    </div>
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-5">
      <button @click="goPage(pg - 1)" :disabled="pg <= 1"
              class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">‹</button>
      <button v-for="n in totalPages" :key="n" @click="goPage(n)"
              :class="['w-9 h-9 rounded-full text-sm font-bold transition', pg === n ? 'text-white' : 'nv-btn-ghost !p-0']"
              :style="pg === n ? 'background:linear-gradient(135deg,#7a88ff,#5a68e8);box-shadow:0 4px 12px rgba(108,124,255,.4)' : ''">{{ n }}</button>
      <button @click="goPage(pg + 1)" :disabled="pg >= totalPages"
              class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">›</button>
    </div>
    </section>
    <!-- Testimoni pembeli -->
    <section v-if="testimonialsLoading" class="mt-8">
      <div class="skel h-5 w-32 mb-3"></div>
      <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        <div v-for="i in 3" :key="'tsk'+i" class="nv-card flex-shrink-0 w-64 p-4 space-y-2">
          <div class="skel h-3 w-24"></div>
          <div class="skel h-3 w-full"></div>
          <div class="skel h-3 w-2/3"></div>
        </div>
      </div>
    </section>
    <section v-if="testimonials.length" class="mt-8">
      <div class="nv-sec">
        <span class="dot"></span>
        <h2>⭐ Kata Mereka</h2>
        <span class="nv-badge nv-badge-gold">Testimoni asli</span>
      </div>
      <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        <div v-for="(t, i) in testimonials" :key="i" class="nv-card flex-shrink-0 w-64 p-4">
          <div class="text-sm mb-1.5" style="color:#ffc24b">{{ '★'.repeat(t.rating) }}<span class="dark:text-nova-line text-gray-300">{{ '★'.repeat(5 - t.rating) }}</span></div>
          <p class="text-xs text-gray-600 dark:text-nova-text leading-relaxed clamp2" style="min-height:2.6em">"{{ t.comment }}"</p>
          <div class="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-nova-line">
            <div class="text-xs font-bold dark:text-nova-text">{{ t.user_name }}</div>
            <div class="text-[10px] text-gray-400 dark:text-nova-muted">beli {{ t.product_name }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>`
};

async function openProduct(id) {
  store.productLoading = true;
  store.product = { id, name: '', _skeleton: true };
  try {
    const d = await api('/api/products/' + id);
    store.product = d.product;
    if (!store.product.images || !store.product.images.length) {
      store.product.images = store.product.image_url ? [{ id: 0, url: store.product.image_url }] : [];
    }
    store.galIdx = 0;
    store.reviews = (await api('/api/products/' + id + '/reviews')).reviews || [];
  } catch (e) { store.product = null; toast(e.message, false); }
  finally { store.productLoading = false; }
}
