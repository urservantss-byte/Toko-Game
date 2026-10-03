/* Menu utama: katalog produk + flash sale + filter */
const HomeView = {
  components: { BlurImg, Stars },
  data: () => ({ banners: [], bannerIdx: 0, bannerTimer: null }),
  mounted() {
    fetch('/api/banners').then(r => r.json()).then(d => {
      this.banners = d.banners || [];
      if (this.banners.length > 1) {
        this.bannerTimer = setInterval(() => { this.bannerIdx = (this.bannerIdx + 1) % this.banners.length; }, 5000);
      }
    }).catch(() => {});
  },
  beforeUnmount() { if (this.bannerTimer) clearInterval(this.bannerTimer); },
  computed: {
    f: () => store.f,
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
        pop: (a, b) => (b.review_count || 0) - (a.review_count || 0),
        murah: (a, b) => a.price - b.price,
        mahal: (a, b) => b.price - a.price,
        rating: (a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0)
      };
      return arr.sort(sorters[store.f.sort] || sorters.pop);
    },
  },
  methods: {
    rp, CATLABEL, CATCOLOR,
    imgOf(p) { return (p.images && p.images[0] && p.images[0].url) || p.image_url; },
    openProduct(id) { openProduct(id); },
    addCart(id) {
      const p = store.products.find(x => x.id === id);
      if (!p || p.stock < 1) return toast('Stok habis', false);
      const c = store.cart.find(x => x.id === id);
      if (c) c.qty++;
      else store.cart.push({ id: p.id, name: p.name, price: p.price, image_url: this.imgOf(p), qty: 1 });
      saveCart();
      toast('Ditambahkan ke keranjang 🛒');
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
    <!-- Flash sale -->
    <section v-if="flash.length">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xl">⚡</span>
        <h2 class="font-extrabold text-base">Flash Sale</h2>
        <span class="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">Diskon!</span>
      </div>
      <div class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        <div v-for="p in flash" :key="p.id" @click="openProduct(p.id)"
             class="flex-shrink-0 w-32 sm:w-36 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md flex flex-col">
          <blur-img :src="imgOf(p)" cls="aspect-square" :alt="p.name"></blur-img>
          <div class="p-2 flex flex-col flex-1">
            <div class="text-xs font-medium clamp2" style="min-height:2.4em">{{ p.name }}</div>
            <div class="text-accent font-extrabold text-sm mt-1">{{ rp(p.price) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter chips -->
    <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      <button @click="setCat('all')" :class="['text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap', !f.cat || f.cat==='all' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700']">Semua</button>
      <button v-for="c in store.cats" :key="c.id" @click="setCat(c.id)"
              :class="['text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap', f.cat===c.id ? 'bg-primary text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700']">{{ c.icon }} {{ c.label }}</button>
      <button v-for="t in tags" :key="t" @click="setTag(t)"
              :class="['text-xs px-3 py-1.5 rounded-full whitespace-nowrap', f.tag===t ? 'bg-indigo-100 text-primary border border-primary' : 'bg-indigo-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-300']">#{{ t }}</button>
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
           class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition flex flex-col">
        <div class="relative aspect-square">
          <blur-img :src="imgOf(p)" cls="w-full h-full" :alt="p.name"></blur-img>
          <span class="absolute top-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide" :style="{ background: catColor(p.category) }">{{ catLabel(p.category) }}</span>
          <span v-if="(p.images||[]).length > 1" class="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">📷 {{ p.images.length }}</span>
        </div>
        <div class="p-2.5 flex flex-col flex-1">
          <div class="text-[13px] font-medium leading-snug clamp2">{{ p.name }}</div>
          <div class="text-[10px] text-gray-400 dark:text-gray-300 mt-0.5">{{ catLabel(p.category) || '' }}</div>
          <div class="flex items-center justify-between mt-auto pt-1.5">
            <div class="text-accent font-extrabold text-sm">{{ rp(p.price) }}</div>
          </div>
          <div class="flex items-center justify-between mt-0.5">
            <div class="text-[10px] text-gray-400 dark:text-gray-300">{{ p.review_count ? p.review_count + ' Terjual' : 'Baru' }}</div>
            <div class="text-[10px] text-gray-500 dark:text-gray-300">⭐ <b class="text-gray-700 dark:text-gray-200">{{ Number(p.avg_rating || 0).toFixed(1) }}</b></div>
          </div>
          <button @click.stop="buyNow(p.id)" :disabled="p.stock < 1"
                  class="mt-2 w-full text-[11px] font-bold bg-primary text-white rounded-xl py-1.5 hover:bg-indigo-700 disabled:opacity-40">🛒 Beli</button>
        </div>
      </div>
      <div v-if="!list.length" class="col-span-full text-center text-gray-400 py-10 text-sm">Produk tidak ditemukan 😢</div>
    </div>
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
