/* Admin: Pengaturan toko (dinamis) — profil, kategori, otomatisasi */
const AdminSettings = {
  data: () => ({
    storeName: '', announcement: '', announcementOn: false, autoDays: 2, flashEnds: '', storeMsg: '',
    cats: [], catMsg: '',
    catForm: { label: '', icon: '📦', parent_id: null }, catEdit: null, addingSubFor: null,
  }),
  computed: {
    catTree() {
      const map = {};
      for (const c of this.cats) map[c.id] = { ...c, children: [] };
      const roots = [];
      for (const c of this.cats) {
        if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
        else roots.push(map[c.id]);
      }
      return roots;
    },
    rootCats() { return this.cats.filter(c => !c.parent_id); },
  },
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
        const i = this.cats.findIndex(x => x.id === c.id);
        if (i >= 0) this.cats.splice(i, 1, d.category);
        setCats(this.cats.filter(x => x.active));
      } catch (e) { toast(e.message, false); }
    },
    syncCat(cat) {
      const i = this.cats.findIndex(x => x.id === cat.id);
      if (i >= 0) this.cats.splice(i, 1, cat); else this.cats.push(cat);
      setCats(this.cats.filter(x => x.active));
    },
    async addCat() {
      this.catMsg = '';
      if (!this.catForm.label.trim()) { this.catMsg = 'Label wajib diisi'; return; }
      try {
        const d = await api('/api/admin/categories', { method: 'POST',
          body: JSON.stringify({ label: this.catForm.label, icon: this.catForm.icon, parent_id: this.catForm.parent_id }) });
        this.syncCat(d.category);
        this.catForm = { label: '', icon: '📦', parent_id: null };
        this.addingSubFor = null;
        this.catMsg = 'Kategori ditambahkan ✓';
      } catch (e) { this.catMsg = e.message; }
    },
    startAddSub(parent) {
      this.catEdit = null;
      this.addingSubFor = parent.id;
      this.catForm = { label: '', icon: '📦', parent_id: parent.id };
      this.catMsg = '';
    },
    cancelAddSub() { this.addingSubFor = null; this.catForm = { label: '', icon: '📦', parent_id: null }; },
    startEditCat(c) {
      this.catEdit = c.id;
      this.addingSubFor = null;
      this.catForm = { label: c.label, icon: c.icon, parent_id: c.parent_id || null };
      this.catMsg = '';
    },
    async saveEditCat() {
      this.catMsg = '';
      try {
        const d = await api('/api/admin/categories/' + this.catEdit, { method: 'PUT',
          body: JSON.stringify({ label: this.catForm.label, icon: this.catForm.icon, parent_id: this.catForm.parent_id }) });
        this.syncCat(d.category);
        this.catEdit = null;
        this.catForm = { label: '', icon: '📦', parent_id: null };
        this.catMsg = 'Kategori diperbarui ✓';
      } catch (e) { this.catMsg = e.message; }
    },
    cancelEditCat() { this.catEdit = null; this.catForm = { label: '', icon: '📦', parent_id: null }; },
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
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 shadow-sm">
      <h3 class="font-bold text-sm mb-3">🏪 Profil Toko</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Nama toko</label>
          <input v-model="storeName" placeholder="TokoGame" class="nv-input text-sm mt-1">
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Auto-selesai pesanan (hari)</label>
          <input v-model.number="autoDays" type="number" min="1" max="30" class="nv-input text-sm mt-1">
          <p class="text-[10px] text-gray-400 mt-1">Pesanan "dikirim" otomatis selesai setelah N hari tanpa ulasan.</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Flash sale berakhir</label>
          <input v-model="flashEnds" type="datetime-local" class="nv-input text-sm mt-1">
          <p class="text-[10px] text-gray-400 mt-1">Countdown tampil di beranda. Kosongkan = tanpa countdown.</p>
        </div>
        <div class="md:col-span-2">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Pengumuman (banner atas)</label>
          <div class="flex items-center gap-2 mt-1">
            <input v-model="announcement" placeholder="mis: Promo 12.12 — diskon 20% semua voucher!" class="nv-input text-sm flex-1 min-w-0">
            <button @click="announcementOn = !announcementOn" :class="['w-10 h-6 rounded-full relative transition-colors shrink-0', announcementOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']" :title="announcementOn ? 'Sembunyikan' : 'Tampilkan'">
              <span :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', announcementOn ? 'left-[18px]' : 'left-0.5']"></span>
            </button>
            <span class="text-[11px] font-semibold whitespace-nowrap" :class="announcementOn ? 'text-green-600' : 'text-gray-400'">{{ announcementOn ? 'Tampil' : 'Sembunyi' }}</span>
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <button @click="saveStore" class="nv-btn text-sm px-6 py-2.5">💾 Simpan</button>
        <span class="text-xs" :class="storeMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ storeMsg }}</span>
      </div>
    </div>

    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 shadow-sm">
      <h3 class="font-bold text-sm mb-1">🗂️ Kategori & Subkategori Produk</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Kategori tampil sebagai filter di beranda. Tiap kategori bisa punya subkategori sendiri (mis: Top Up → Mobile Legends, Free Fire).</p>
      <div class="space-y-2 mb-3">
        <template v-for="c in catTree" :key="c.id">
          <div class="flex items-center gap-2.5 bg-gray-50 dark:bg-nova-surface2 rounded-xl px-3 py-2.5">
            <button @click="toggleCat(c)" :class="['w-10 h-6 rounded-full relative transition-colors shrink-0', c.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']">
              <span :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', c.active ? 'left-[18px]' : 'left-0.5']"></span>
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold truncate">{{ c.icon }} {{ c.label }} <span class="font-normal text-gray-400 text-xs">({{ c.id }})</span></div>
            </div>
            <div class="adm-act">
              <button @click="startAddSub(c)" class="adm-btn adm-btn-ghost" title="Tambah subkategori">＋Sub</button>
              <button @click="startEditCat(c)" class="adm-btn adm-btn-ghost" title="Ubah">✏️</button>
              <button @click="delCat(c)" class="adm-btn adm-btn-danger" title="Hapus">🗑️</button>
            </div>
          </div>
          <div v-for="sc in c.children" :key="sc.id" class="flex items-center gap-2.5 bg-gray-50/60 dark:bg-nova-surface2/60 rounded-xl px-3 py-2 ml-6 border-l-2 border-indigo-200 dark:border-indigo-500/40">
            <button @click="toggleCat(sc)" :class="['w-8 h-5 rounded-full relative transition-colors shrink-0', sc.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']">
              <span :class="['absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', sc.active ? 'left-[14px]' : 'left-0.5']"></span>
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold truncate">↳ {{ sc.icon }} {{ sc.label }} <span class="font-normal text-gray-400">({{ sc.id }})</span></div>
            </div>
            <div class="adm-act">
              <button @click="startEditCat(sc)" class="adm-btn adm-btn-ghost" title="Ubah">✏️</button>
              <button @click="delCat(sc)" class="adm-btn adm-btn-danger" title="Hapus">🗑️</button>
            </div>
          </div>
          <div v-if="addingSubFor === c.id" class="ml-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 rounded-xl p-3">
            <div class="text-xs font-bold mb-2">＋ Subkategori untuk <b>{{ c.label }}</b></div>
            <div class="flex flex-wrap gap-2">
              <input v-model="catForm.icon" placeholder="📦" class="nv-input text-sm text-center !w-14 shrink-0">
              <input v-model="catForm.label" placeholder="mis: Mobile Legends" class="nv-input text-sm flex-1 min-w-[120px]">
              <button @click="addCat" class="nv-btn text-xs px-5 py-2 shrink-0 whitespace-nowrap">Tambah</button>
              <button @click="cancelAddSub" class="nv-btn-ghost text-xs px-5 py-2 shrink-0 whitespace-nowrap">Batal</button>
            </div>
          </div>
        </template>
      </div>
      <div class="bg-gray-50 dark:bg-nova-surface2 rounded-xl p-3">
        <div class="text-xs font-bold mb-2">{{ catEdit ? '✏️ Ubah kategori' : '➕ Tambah kategori baru' }}</div>
        <div class="flex flex-wrap gap-2">
          <input v-model="catForm.icon" placeholder="📦" class="nv-input text-sm text-center !w-14 shrink-0">
          <input v-model="catForm.label" placeholder="Label, mis: Pulsa" class="nv-input text-sm flex-1 min-w-[120px]">
          <select v-model="catForm.parent_id" class="nv-input text-sm shrink-0" title="Induk (kosongkan = kategori utama)">
            <option :value="null">— Kategori utama —</option>
            <option v-for="r in rootCats" :key="r.id" :value="r.id">{{ r.icon }} {{ r.label }}</option>
          </select>
          <button v-if="!catEdit" @click="addCat" class="nv-btn text-xs px-5 py-2 shrink-0 whitespace-nowrap">Tambah</button>
          <template v-else>
            <button @click="saveEditCat" class="nv-btn text-xs px-5 py-2 shrink-0 whitespace-nowrap">Simpan</button>
            <button @click="cancelEditCat" class="nv-btn-ghost text-xs px-5 py-2 shrink-0 whitespace-nowrap">Batal</button>
          </template>
        </div>
        <span class="text-xs" :class="catMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ catMsg }}</span>
      </div>
    </div>
  </div>`
};
