/* Header + navigasi ala referensi GAME TOPUP */
const HeaderView = {
  data: () => ({ q: '', searchT: null, menuOpen: false, searchOpen: false }),
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
    goHome() { this.q = ''; store.f.q = ''; this.searchOpen = false; go('home'); },
    toggleSearch() {
      this.searchOpen = !this.searchOpen;
      if (this.searchOpen) this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus());
      else { this.q = ''; store.f.q = ''; }
    },
    goCategories() {
      go('home');
      this.$nextTick(() => {
        const el = document.getElementById('home-categories');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    goProfile() {
      if (this.user) go('settings');
      else go('login');
    },
    userBtn() {
      if (!store.user) { go('login'); return; }
      this.menuOpen = !this.menuOpen;
    },
    navCls(p) {
      const active = this.page === p;
      return active ? 'text-rlav' : 'text-rmuted';
    },
  },
  template: `
  <div>
  <header class="sticky top-0 z-40 bg-rbg/95 backdrop-blur">
    <div class="max-w-6xl mx-auto px-5">
      <div class="flex items-center justify-between h-16">
        <a @click="goHome" class="cursor-pointer">
          <span class="text-[15px] font-semibold tracking-[0.25em] text-rmuted">{{ (store.siteName || 'GAME TOPUP').toUpperCase() }}</span>
        </a>
        <div class="flex items-center gap-5">
          <button @click="toggleSearch" class="text-rmuted hover:text-white transition" title="Cari">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </button>
          <button @click="go('cart')" class="relative text-rmuted hover:text-white transition" title="Keranjang">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h15l-1.5 9h-12z"/><path d="M6 7l-1-4H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
            <span v-if="count" class="absolute -top-1.5 -right-1.5 bg-rlav text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1">{{ count }}</span>
          </button>
        </div>
      </div>
      <div v-if="searchOpen" class="pb-3">
        <div class="flex items-center gap-2 bg-rcard border border-rline rounded-full px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9ab5" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input ref="searchInput" v-model="q" @input="onSearch" placeholder="Cari diamond, akun, voucher..."
                 class="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder-rmuted">
          <button @click="toggleSearch" class="text-rmuted text-lg leading-none">✕</button>
        </div>
      </div>
    </div>
  </header>
  <!-- Bottom nav floating ala referensi -->
  <nav class="md:hidden fixed bottom-4 left-4 right-4 z-40">
    <div class="bg-rcard border border-rline rounded-3xl shadow-2xl">
      <div class="grid grid-cols-4 text-center py-2.5">
        <a @click="goHome" class="cursor-pointer flex flex-col items-center gap-1 py-1" :class="navCls('home')">
          <svg width="22" height="22" viewBox="0 0 24 24" :fill="page==='home' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>
          <span class="text-[11px] font-semibold">Home</span>
        </a>
        <a @click="goCategories" class="cursor-pointer flex flex-col items-center gap-1 py-1 text-rmuted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.6 2 9.2h7.6z"/></svg>
          <span class="text-[11px] font-semibold">Categories</span>
        </a>
        <a @click="go('cart')" class="cursor-pointer flex flex-col items-center gap-1 py-1" :class="navCls('cart')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h15l-1.5 9h-12z"/><path d="M6 7l-1-4H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
          <span class="text-[11px] font-semibold">Cart</span>
        </a>
        <a @click="goProfile" class="cursor-pointer flex flex-col items-center gap-1 py-1" :class="navCls('settings')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
          <span class="text-[11px] font-semibold">Profile</span>
        </a>
      </div>
    </div>
  </nav>
  </div>`
};
