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
  <header class="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex items-center gap-3 h-16">
        <a @click="goHome" class="cursor-pointer flex items-center gap-2 shrink-0">
          <span class="text-2xl">🎮</span>
          <span class="font-extrabold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent hidden sm:block">TokoGame</span>
        </a>
        <div class="flex-1 min-w-0 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
          <span class="text-gray-400">🔍</span>
          <input v-model="q" @input="onSearch" placeholder="Cari diamond, akun, voucher..."
                 class="flex-1 min-w-0 bg-transparent outline-none text-sm dark:placeholder-gray-500">
        </div>
        <button @click="toggleDark" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-lg leading-none" :title="isDark() ? 'Mode terang' : 'Mode gelap'">{{ isDark() ? '☀️' : '🌙' }}</button>
        <button v-if="user" @click="go('cart')" class="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <span class="text-xl">🛒</span>
          <span v-if="count" class="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">{{ count }}</span>
        </button>
        <div class="relative">
          <button @click="userBtn" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <img v-if="user && user.avatar" :src="user.avatar" class="w-8 h-8 rounded-full object-cover">
            <span v-else class="text-xl block w-8 h-8 leading-8 text-center">👤</span>
          </button>
          <div v-if="menuOpen && user" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
              <p class="font-semibold text-sm truncate">{{ user.name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
            </div>
            <a @click="menuOpen=false; go('orders')" class="cursor-pointer block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">📦 Pesananku</a>
            <a @click="menuOpen=false; go('tickets')" class="cursor-pointer block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">🎫 Bantuan</a>
            <a @click="menuOpen=false; go('settings')" class="cursor-pointer block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">⚙️ Pengaturan</a>
            <a v-if="user.role==='admin'" @click="menuOpen=false; go('admin')" class="cursor-pointer block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">🛠️ Admin Panel</a>
            <a @click="menuOpen=false; logout()" class="cursor-pointer block px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800">🚪 Keluar</a>
          </div>
        </div>
      </div>
    </div>
  </header>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-40">
    <div class="grid text-center text-[11px] font-medium text-gray-600 dark:text-gray-400" :class="user ? 'grid-cols-3' : 'grid-cols-2'">
      <a @click="goHome" class="cursor-pointer py-2.5 flex flex-col items-center gap-0.5" :class="{ 'text-violet-600': page==='home' }"><span class="text-lg">🏠</span>Beranda</a>
      <a v-if="user" @click="go('cart')" class="cursor-pointer py-2.5 flex flex-col items-center gap-0.5" :class="{ 'text-violet-600': page==='cart' }"><span class="text-lg">🛒</span>Keranjang</a>
      <a @click="user ? go('orders') : go('login')" class="cursor-pointer py-2.5 flex flex-col items-center gap-0.5" :class="{ 'text-violet-600': page==='orders' }"><span class="text-lg">📦</span>Pesanan</a>
    </div>
  </nav>
  </div>`
};
