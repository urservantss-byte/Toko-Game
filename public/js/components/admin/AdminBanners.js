/* Admin: kelola banner promo beranda */
const AdminBanners = {
  data: () => ({ list: [], link: '', file: null, msg: '', uploading: false }),
  mounted() { this.load(); },
  methods: {
    async load() {
      try { this.list = (await api('/api/admin/banners')).banners || []; } catch (e) { this.msg = e.message; }
    },
    onFile(e) { this.file = e.target.files[0] || null; },
    async upload() {
      this.msg = '';
      if (!this.file) { this.msg = 'Pilih gambar dulu'; return; }
      this.uploading = true;
      try {
        const fd = new FormData();
        fd.append('file', this.file);
        fd.append('link_url', this.link);
        await api('/api/admin/banners', { method: 'POST', body: fd });
        this.msg = 'Banner ditambahkan ✓';
        this.link = ''; this.file = null;
        this.$refs.fileInput.value = '';
        this.load();
      } catch (e) { this.msg = e.message; }
      finally { this.uploading = false; }
    },
    async toggle(b) {
      await api('/api/admin/banners/' + b.id, { method: 'PATCH', body: JSON.stringify({ active: !b.active }) });
      this.load();
    },
    async move(b, dir) {
      await api('/api/admin/banners/' + b.id, { method: 'PATCH', body: JSON.stringify({ sort_order: b.sort_order + dir }) });
      this.load();
    },
    async saveLink(b) {
      await api('/api/admin/banners/' + b.id, { method: 'PATCH', body: JSON.stringify({ link_url: b.link_url }) });
      toast('Link disimpan');
    },
    async del(b) {
      if (!confirm('Hapus banner ini?')) return;
      await api('/api/admin/banners/' + b.id, { method: 'DELETE' });
      this.load();
    },
  },
  template: `
  <div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4 shadow-sm">
      <h3 class="font-bold text-sm mb-3">➕ Tambah Banner</h3>
      <div class="flex flex-col sm:flex-row gap-2">
        <input ref="fileInput" type="file" accept="image/*" @change="onFile" class="nv-input text-sm !w-auto">
        <input v-model="link" placeholder="Link tujuan (opsional, mis. #/orders)" class="nv-input text-sm flex-1 min-w-0">
        <button @click="upload" :disabled="uploading" class="nv-btn text-sm px-5 py-2 disabled:opacity-50">{{ uploading ? '...' : 'Upload' }}</button>
      </div>
      <p class="text-xs text-gray-400 mt-2">Rasio disarankan 16:6 / 1200×450 px, maks 2MB. Klik gambar banner di beranda untuk membuka link.</p>
      <span class="text-xs" :class="msg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
    <div class="grid gap-3">
      <div v-for="b in list" :key="b.id" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center shadow-sm" :class="{ 'opacity-50': !b.active }">
        <img :src="b.image_url" class="w-full sm:w-48 aspect-[16/6] object-cover rounded-xl border border-gray-100 dark:border-nova-line">
        <div class="flex-1 min-w-0 w-full">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="nv-badge" :class="b.active ? 'nv-badge-green' : ''" :style="b.active ? '' : 'background:#f1f4fb;border:1px solid #e2e8f5;color:#9aa3c0'">{{ b.active ? '● Aktif' : '○ Nonaktif' }}</span>
            <span class="text-xs text-gray-400">#{{ b.sort_order }}</span>
          </div>
          <div class="flex gap-2">
            <input v-model="b.link_url" placeholder="Link tujuan" class="nv-input text-xs !py-1.5 flex-1 min-w-0">
            <button @click="saveLink(b)" class="adm-btn adm-btn-ghost">Simpan</button>
          </div>
        </div>
        <div class="adm-act">
          <button @click="move(b, -1)" class="adm-btn adm-btn-ghost" title="Naik">↑</button>
          <button @click="move(b, 1)" class="adm-btn adm-btn-ghost" title="Turun">↓</button>
          <button @click="toggle(b)" class="adm-btn adm-btn-ghost">{{ b.active ? 'Off' : 'On' }}</button>
          <button @click="del(b)" class="adm-btn adm-btn-danger">🗑️ Hapus</button>
        </div>
      </div>
      <div v-if="!list.length" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-8 text-center text-gray-400 text-sm">Belum ada banner</div>
    </div>
  </div>`
};
