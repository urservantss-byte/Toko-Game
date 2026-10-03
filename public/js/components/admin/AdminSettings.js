/* Admin: Pengaturan toko (dinamis) — profil, kategori, otomatisasi */
const AdminSettings = {
  data: () => ({
    storeName: '', announcement: '', announcementOn: false, autoDays: 2, flashEnds: '', storeMsg: '',
    cats: [], catMsg: '',
    catForm: { label: '', icon: '📦' }, catEdit: null,
  }),
  mounted() { this.load(); },
  methods: {
    async load() {
      try {
        const d = await api('/api/admin/store-settings');
        this.storeName = d.store_name || '';
        this.announcement = d.announcement || '';
        this.announcementOn = !!d.announcement_on;
        this.autoDays = d.auto_complete_days || 2;
        this.flashEnds = d.flash_sale_ends || '';
        this.cats = d.categories || [];
      } catch (e) { toast(e.message, false); }
    },
    async saveStore() {
      this.storeMsg = '';
      try {
        await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({
          store_name: this.storeName, announcement: this.announcement,
          announcement_on: this.announcementOn, auto_complete_days: this.autoDays,
          flash_sale_ends: this.flashEnds,
        }) });
        store.siteName = this.storeName || 'TokoGame';
        store.announcement = this.announcementOn ? this.announcement : '';
        this.storeMsg = 'Pengaturan disimpan ✓';
      } catch (e) { this.storeMsg = e.message; }
    },
    async toggleCat(c) {
      try {
        const d = await api('/api/admin/categories/' + c.id, { method: 'PUT', body: JSON.stringify({ active: !c.active }) });
        Object.assign(c, d.category);
        setCats(this.cats.filter(x => x.active));
      } catch (e) { toast(e.message, false); }
    },
    async addCat() {
      this.catMsg = '';
      if (!this.catForm.label.trim()) { this.catMsg = 'Label wajib diisi'; return; }
      try {
        const d = await api('/api/admin/categories', { method: 'POST',
          body: JSON.stringify({ label: this.catForm.label, icon: this.catForm.icon }) });
        this.cats.push(d.category);
        setCats(this.cats.filter(x => x.active));
        this.catForm = { label: '', icon: '📦' };
        this.catMsg = 'Kategori ditambahkan ✓';
      } catch (e) { this.catMsg = e.message; }
    },
    startEditCat(c) {
      this.catEdit = c.id;
      this.catForm = { label: c.label, icon: c.icon };
      this.catMsg = '';
    },
    async saveEditCat() {
      this.catMsg = '';
      try {
        const d = await api('/api/admin/categories/' + this.catEdit, { method: 'PUT',
          body: JSON.stringify({ label: this.catForm.label, icon: this.catForm.icon }) });
        const i = this.cats.findIndex(x => x.id === this.catEdit);
        if (i >= 0) this.cats.splice(i, 1, d.category);
        setCats(this.cats.filter(x => x.active));
        this.catEdit = null;
        this.catForm = { label: '', icon: '📦' };
        this.catMsg = 'Kategori diperbarui ✓';
      } catch (e) { this.catMsg = e.message; }
    },
    cancelEditCat() { this.catEdit = null; this.catForm = { label: '', icon: '📦' }; },
    async delCat(c) {
      if (!confirm('Hapus kategori "' + c.label + '"?')) return;
      try {
        await api('/api/admin/categories/' + c.id, { method: 'DELETE' });
        this.cats = this.cats.filter(x => x.id !== c.id);
        setCats(this.cats.filter(x => x.active));
      } catch (e) { toast(e.message, false); }
    },
  },
  template: `
  <div class="space-y-4">
    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4">
      <h3 class="font-bold text-sm mb-3">🏪 Profil Toko</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label class="text-xs font-semibold text-gray-500">Nama toko</label>
          <input v-model="storeName" placeholder="TokoGame" class="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500">Auto-selesai pesanan (hari)</label>
          <input v-model.number="autoDays" type="number" min="1" max="30" class="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
          <p class="text-[10px] text-gray-400 mt-1">Pesanan "dikirim" otomatis selesai setelah N hari tanpa ulasan.</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500">Flash sale berakhir</label>
          <input v-model="flashEnds" type="datetime-local" class="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
          <p class="text-[10px] text-gray-400 mt-1">Countdown tampil di beranda. Kosongkan = tanpa countdown.</p>
        </div>
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-gray-500">Pengumuman (banner atas)</label>
          <div class="flex gap-2">
            <input v-model="announcement" placeholder="mis: Promo 12.12 — diskon 20% semua voucher!" class="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <button @click="announcementOn = !announcementOn" :class="['px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap', announcementOn ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700']">{{ announcementOn ? 'Tampil' : 'Sembunyi' }}</button>
          </div>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <button @click="saveStore" class="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">💾 Simpan</button>
        <span class="text-xs" :class="storeMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ storeMsg }}</span>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4">
      <h3 class="font-bold text-sm mb-1">🗂️ Kategori Produk</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Kategori tampil sebagai filter di beranda & pilihan saat tambah produk.</p>
      <div class="space-y-2 mb-3">
        <div v-for="c in cats" :key="c.id" class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
          <button @click="toggleCat(c)" :class="['w-10 h-6 rounded-full relative transition-colors shrink-0', c.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']">
            <span :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', c.active ? 'left-[18px]' : 'left-0.5']"></span>
          </button>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold truncate">{{ c.icon }} {{ c.label }} <span class="font-normal text-gray-400">({{ c.id }})</span></div>
          </div>
          <button @click="startEditCat(c)" class="text-xs text-primary font-bold px-2 py-1">✏️</button>
          <button @click="delCat(c)" class="text-xs text-red-500 font-bold px-2 py-1">🗑️</button>
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
        <div class="text-xs font-bold mb-2">{{ catEdit ? '✏️ Ubah kategori' : '➕ Tambah kategori baru' }}</div>
        <div class="flex gap-2">
          <input v-model="catForm.icon" placeholder="📦" class="w-14 border rounded-xl px-3 py-2 text-sm text-center outline-none focus:border-primary">
          <input v-model="catForm.label" placeholder="Label, mis: Pulsa" class="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
          <button v-if="!catEdit" @click="addCat" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Tambah</button>
          <template v-else>
            <button @click="saveEditCat" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Simpan</button>
            <button @click="cancelEditCat" class="bg-gray-200 dark:bg-gray-700 text-xs font-bold px-3 py-2 rounded-xl">Batal</button>
          </template>
        </div>
        <span class="text-xs" :class="catMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ catMsg }}</span>
      </div>
    </div>
  </div>`
};
