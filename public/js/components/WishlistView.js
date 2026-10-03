/* Halaman wishlist user */
const WishlistView = {
  components: { BlurImg },
  data: () => ({ items: [], loading: true }),
  mounted() { this.load(); },
  methods: {
    rp,
    async load() {
      this.loading = true;
      try {
        const d = await api('/api/wishlist');
        this.items = d.products || [];
      } catch (e) { toast(e.message, false); }
      this.loading = false;
    },
    async remove(id) {
      try {
        await api('/api/wishlist/' + id, { method: 'DELETE' });
        this.items = this.items.filter(p => p.id !== id);
        store.wishlist = store.wishlist.filter(x => x !== id);
      } catch (e) { toast(e.message, false); }
    },
    imgOf(p) { return (p.images && p.images[0] && p.images[0].url) || p.image_url; },
  },
  template: `
  <div class="max-w-6xl mx-auto px-4 py-4">
    <h2 class="text-xl font-bold mb-4">❤️ Wishlist Saya</h2>
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div v-for="i in 6" :key="'wsk'+i" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div class="skel aspect-square" style="border-radius:0"></div>
        <div class="p-2.5 space-y-2"><div class="skel h-3.5 w-full"></div><div class="skel h-4 w-1/2"></div></div>
      </div>
    </div>
    <div v-else-if="!items.length" class="text-center py-14">
      <div class="text-5xl mb-3">🤍</div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Wishlist masih kosong</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Ketuk ikon hati di produk favoritmu</p>
      <button @click="go('home')" class="bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Lihat Produk</button>
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div v-for="p in items" :key="p.id" @click="openProduct(p.id)"
           class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition flex flex-col">
        <div class="relative aspect-square">
          <blur-img :src="imgOf(p)" cls="w-full h-full" :alt="p.name"></blur-img>
          <button @click.stop="remove(p.id)" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white shadow text-sm flex items-center justify-center" title="Hapus dari wishlist">✕</button>
        </div>
        <div class="p-2.5 flex flex-col flex-1">
          <div class="text-[13px] font-medium leading-snug clamp2">{{ p.name }}</div>
          <div class="text-accent font-extrabold text-sm mt-1">{{ rp(p.price) }}</div>
        </div>
      </div>
    </div>
  </div>`
};
