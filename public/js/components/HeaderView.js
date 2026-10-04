/* Header + navigasi */
const HeaderView = {
  data: () => ({ q: '', searchT: null, menuOpen: false }),
  computed: {
    user: () => store.user,
    count: () => cartCount.value,
    page: () => store.page,
  },
  methods: {
    onSearch() {
      clearTimeout(this.searchT);
      this.searchT = setTimeout(() => { store.f.q = this.q; }, 250);
    },
    goHome() { this.q = ''; store.f.q = ''; go('home'); },
    userBtn() {
      if (!store.user) { go('login'); return; }
      this.menuOpen = !this.menuOpen;
    },
    toggleDark() { toggleTheme(); this.$forceUpdate(); },
    isDark() { return typeof document !== 'undefined' && document.documentElement.classList.contains('dark'); },
  },
  template: `
  <div>
  <header class="nv-header sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex items-center gap-3 h-16">
        <a @click="goHome" class="cursor-pointer flex items-center gap-2.5 shrink-0">
          <span class="w-9 h-9 rounded-2xl flex items-center justify-center text-xl"
                style="background:linear-gradient(135deg,#7a88ff 0%,#4a56c8 100%);box-shadow:0 4px 14px rgba(108,124,255,.4)">🎮</span>
          <span class="nv-logo hidden sm:block">{{ store.siteName }}</span>
        </a>
        <div class="flex-1 min-w-0 flex items-center gap-2 rounded-full px-4 py-2 bg-gray-100 dark:bg-nova-surface dark:border dark:border-nova-line">
          <span class="text-gray-400 dark:text-nova-muted">🔍</span>
          <input v-model="q" @input="onSearch" placeholder="Cari diamond, akun, voucher..."
                 class="flex-1 min-w-0 bg-transparent outline-none text-sm dark:placeholder-nova-muted dark:text-nova-text">
        </div>
        <button @click="toggleDark" class="p-2.5 rounded-full text-lg leading-none transition hover:bg-gray-100 dark:hover:bg-nova-surface2 dark:text-nova-muted" :title="isDark() ? 'Mode terang' : 'Mode gelap'">{{ isDark() ? '☀️' : '🌙' }}</button>
        <button v-if="user" @click="go('cart')" class="relative p-2.5 rounded-full transition hover:bg-gray-100 dark:hover:bg-nova-surface2">
          <span class="text-xl">🛒</span>
          <span v-if="count" class="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style="background:linear-gradient(135deg,#7a88ff,#4a56c8);box-shadow:0 2px 8px rgba(108,124,255,.5)">{{ count }}</span>
        </button>
        <div class="relative">
          <button @click="userBtn" class="p-1 rounded-full transition hover:bg-gray-100 dark:hover:bg-nova-surface2">
            <img v-if="user && user.avatar" :src="user.avatar" class="w-8 h-8 rounded-full object-cover ring-2 ring-nova-accent/40">
            <span v-else class="text-xl block w-8 h-8 leading-8 text-center">👤</span>
          </button>
          <div v-if="menuOpen && user" class="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl py-2 z-50 bg-white dark:bg-nova-surface dark:border dark:border-nova-line" style="box-shadow:0 16px 48px rgba(0,0,0,.5)">
            <div class="px-4 py-2.5 border-b border-gray-100 dark:border-nova-line">
              <p class="font-bold text-sm truncate dark:text-nova-text">{{ user.name }}</p>
              <p class="text-xs text-gray-500 dark:text-nova-muted truncate">{{ user.email }}</p>
            </div>
            <a @click="menuOpen=false; go('orders')" class="cursor-pointer block px-4 py-2.5 text-sm dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2">📦 Pesananku</a>
            <a @click="menuOpen=false; go('wishlist')" class="cursor-pointer block px-4 py-2.5 text-sm dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2">❤️ Wishlist</a>
            <a @click="menuOpen=false; go('tickets')" class="cursor-pointer block px-4 py-2.5 text-sm dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2">🎫 Bantuan</a>
            <a @click="menuOpen=false; go('settings')" class="cursor-pointer block px-4 py-2.5 text-sm dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2">⚙️ Pengaturan</a>
            <a v-if="user.role==='admin'" @click="menuOpen=false; go('admin')" class="cursor-pointer block px-4 py-2.5 text-sm dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2">🛠️ Admin Panel</a>
            <a @click="menuOpen=false; logout()" class="cursor-pointer block px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-nova-surface2">🚪 Keluar</a>
          </div>
        </div>
      </div>
    </div>
  </header>
  <nav class="md:hidden fixed bottom-3 left-3 right-3 z-40">
    <div class="nv-nav">
      <div class="grid text-center text-[11px] font-semibold" :class="user ? 'grid-cols-3' : 'grid-cols-2'">
        <a @click="goHome" class="nv-navitem" :class="{ 'on': page==='home' }"><span class="text-lg">🏠</span>Beranda<span class="nv-navdot"></span></a>
        <a v-if="user" @click="go('cart')" class="nv-navitem" :class="{ 'on': page==='cart' }"><span class="text-lg">🛒</span>Keranjang<span class="nv-navdot"></span></a>
        <a @click="user ? go('orders') : go('login')" class="nv-navitem" :class="{ 'on': page==='orders' }"><span class="text-lg">📦</span>Pesanan<span class="nv-navdot"></span></a>
      </div>
    </div>
  </nav>
  </div>`
};
