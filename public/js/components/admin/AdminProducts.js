/* Admin: kelola produk + form produk + photo manager */
const AdminProducts = {
  data: () => ({ products: [], codesModal: null, codes: [], codesInput: '', codesMsg: '', sel: [], bulkVal: '', pg: 1 }),
  computed: {
    allChecked() { return this.products.length > 0 && this.sel.length === this.products.length; },
    totalPages() { return Math.max(1, Math.ceil(this.products.length / 10)); },
    pagedProducts() {
      const p = Math.min(this.pg, this.totalPages);
      return this.products.slice((p - 1) * 10, p * 10);
    },
  },
  mounted() { this.load(); },
  methods: {
    rp,
    goPage(n) {
      this.pg = Math.min(Math.max(1, n), this.totalPages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    catLbl(c) { return catLabel(c); },
    catBg(c) { return catColor(c); },
    async load() {
      try { this.products = (await api('/api/products?limit=100')).products || []; }
      catch (e) { toast(e.message, false); }
    },
    toggleAll(v) { this.sel = v ? this.products.map(p => p.id) : []; },
    async bulkStock(mode) {
      const n = Number(this.bulkVal);
      if (!this.sel.length) return toast('Pilih produk dulu ☑️', false);
      if (!(n >= 0)) return toast('Isi jumlah stok dulu', false);
      const label = mode === 'set' ? `Set stok ${this.sel.length} produk jadi ${n}` : `Tambah stok ${this.sel.length} produk +${n}`;
      if (!confirm(label + '?')) return;
      try {
        const d = await api('/api/admin/products/bulk-stock', { method: 'POST',
          body: JSON.stringify({ ids: this.sel, mode, value: n }) });
        toast(d.message || 'Stok diperbarui ✅');
        this.sel = []; this.bulkVal = '';
        this.load(); loadHome();
      } catch (e) { toast(e.message, false); }
    },
    async restock(id) {
      try {
        const { product: p } = await api('/api/products/' + id);
        if ((p.variants || []).length) return toast('Produk ini pakai varian — ubah stok lewat tiap varian', false);
        if (p.category === 'voucher') return toast('Stok voucher mengikuti jumlah kode — kelola lewat 🎫 Kode', false);
        await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({
          name: p.name, description: p.description, price: p.price, stock: (p.stock || 0) + 10, category: p.category, tags: p.tags }) });
        toast('Stok ditambah +10 ✅');
        this.load(); loadHome();
      } catch (e) { toast(e.message, false); }
    },
    async del(id) {
      if (!confirm('Hapus produk ini?')) return;
      try {
        await api('/api/products/' + id, { method: 'DELETE' });
        toast('Produk dihapus');
        this.load(); loadHome();
      } catch (e) { toast(e.message, false); }
    },
    openForm(id) { openProductForm(id || null); },
    async openCodes(p) {
      this.codesModal = p; this.codes = []; this.codesInput = ''; this.codesMsg = '';
      try { this.codes = (await api(`/api/admin/products/${p.id}/codes`)).codes || []; }
      catch (e) { this.codesMsg = e.message; }
    },
    async addCodes() {
      this.codesMsg = '';
      try {
        const d = await api(`/api/admin/products/${this.codesModal.id}/codes`, { method: 'POST',
          body: JSON.stringify({ codes: this.codesInput }) });
        this.codesMsg = `${d.added} kode ditambahkan ✓`;
        this.codesInput = '';
        this.openCodes(this.codesModal);
      } catch (e) { this.codesMsg = e.message; }
    },
    async delCode(cid) {
      await api(`/api/admin/products/${this.codesModal.id}/codes/${cid}`, { method: 'DELETE' });
      this.openCodes(this.codesModal);
    },
  },
  template: `
  <div>
    <button @click="openForm(null)" class="mb-3 bg-primary text-white text-sm font-bold rounded-xl px-5 py-2.5">➕ Tambah Produk</button>
    <div v-if="sel.length" class="mb-3 flex flex-wrap items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 rounded-2xl px-4 py-2.5 text-sm">
      <b class="text-primary dark:text-indigo-300">{{ sel.length }} dipilih</b>
      <input v-model="bulkVal" type="number" min="0" placeholder="Jumlah stok"
             class="w-32 border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-primary">
      <button @click="bulkStock('set')" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Set stok</button>
      <button @click="bulkStock('add')" class="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700">+ Tambah</button>
      <button @click="sel = []; bulkVal = ''" class="text-xs text-gray-500 dark:text-gray-400 font-semibold hover:underline ml-auto">Batal</button>
    </div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-x-auto shadow-sm">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-gray-400 border-b dark:border-nova-line text-xs uppercase">
          <th class="p-3 w-10"><input type="checkbox" :checked="allChecked" @change="toggleAll($event.target.checked)" class="w-4 h-4 accent-indigo-600 cursor-pointer"></th>
          <th class="p-3">Produk</th><th class="p-3">Foto</th><th class="p-3">Kategori</th><th class="p-3">Harga</th><th class="p-3">Stok</th><th class="p-3">Aksi</th>
        </tr></thead>
        <tbody>
          <tr v-for="p in pagedProducts" :key="p.id" :class="['border-b last:border-0 hover:bg-gray-50 dark:hover:bg-nova-surface2', p.stock < 5 ? 'bg-red-50/50 dark:bg-red-500/10' : '']">
            <td class="p-3"><input type="checkbox" :value="p.id" v-model="sel" class="w-4 h-4 accent-indigo-600 cursor-pointer"></td>
            <td class="p-3 font-medium">{{ p.name }}<div v-if="p.stock < 5" class="text-[10px] text-red-500 font-bold mt-0.5">⚠️ Stok rendah!</div></td>
            <td class="p-3"><span class="text-xs bg-indigo-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-300 px-2 py-1 rounded-full font-bold">{{ (p.images || []).length }} foto</span></td>
            <td class="p-3"><span class="text-[10px] font-bold px-2 py-1 rounded-full text-white uppercase" :style="{ background: catBg(p.category) }">{{ catLbl(p.category) }}</span></td>
            <td class="p-3 font-bold text-accent">{{ rp(p.price) }}</td>
            <td class="p-3">
              <span v-if="p.stock < 5" class="font-bold text-red-600">{{ p.stock }}</span><span v-else>{{ p.stock }}</span>
              <button v-if="p.stock < 5" @click="restock(p.id)" class="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-bold hover:bg-emerald-700 ml-1">+10</button>
            </td>
            <td class="p-3 whitespace-nowrap">
              <button @click="openForm(p.id)" class="text-primary font-semibold hover:underline mr-3">Edit</button>
              <button v-if="p.category === 'voucher'" @click="openCodes(p)" class="text-amber-600 font-semibold hover:underline mr-3">🎫 Kode</button>
              <button @click="del(p.id)" class="text-red-500 font-semibold hover:underline">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-4">
      <button @click="goPage(pg - 1)" :disabled="pg <= 1" class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">‹</button>
      <button v-for="n in totalPages" :key="n" @click="goPage(n)"
              :class="['w-9 h-9 rounded-full text-sm font-bold transition', pg === n ? 'text-white' : 'nv-btn-ghost !p-0']"
              :style="pg === n ? 'background:linear-gradient(135deg,#7a88ff,#5a68e8);box-shadow:0 4px 12px rgba(108,124,255,.4)' : ''">{{ n }}</button>
      <button @click="goPage(pg + 1)" :disabled="pg >= totalPages" class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">›</button>
    </div>
    <product-form-modal @saved="load"></product-form-modal>
    <!-- Modal stok kode voucher -->
    <div v-if="codesModal" class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" @click.self="codesModal = null">
      <div class="bg-white dark:bg-nova-surface rounded-3xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <h3 class="font-bold mb-1">🎫 Stok Kode: {{ codesModal.name }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Kode otomatis terkirim saat admin delivery. Satu kode per qty.</p>
        <textarea v-model="codesInput" rows="4" placeholder="Tempel kode, satu per baris"
                  class="w-full border rounded-xl p-2.5 text-xs font-mono outline-none focus:border-primary mb-2"></textarea>
        <button @click="addCodes" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Tambah Kode</button>
        <span class="text-xs ml-2" :class="codesMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ codesMsg }}</span>
        <div class="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
          <div v-for="c in codes" :key="c.id" class="flex items-center justify-between bg-gray-50 dark:bg-nova-surface2 rounded-xl px-3 py-2 text-xs font-mono">
            <span :class="c.used ? 'line-through text-gray-400' : ''">{{ c.used ? '•••••• (terpakai #' + c.order_id + ')' : c.code }}</span>
            <button v-if="!c.used" @click="delCode(c.id)" class="text-red-500 font-bold">✕</button>
          </div>
          <p v-if="!codes.length" class="text-xs text-gray-400 text-center py-3">Belum ada stok kode</p>
        </div>
        <button @click="codesModal = null" class="mt-4 w-full bg-gray-100 dark:bg-nova-surface2 font-bold text-sm rounded-xl py-2.5">Tutup</button>
      </div>
    </div>
  </div>`
};

/* Modal form produk + photo manager */
const ProductFormModal = {
  data: () => ({
    form: { name: '', description: '', price: '', stock: '', category: 'voucher', tags: '', process_time: '', discount: '' },
    existing: [],   // foto yg sudah tersimpan [{id, url, sort_order}]
    pending: [],    // File baru
    err: '',
    saving: false,
    dragOver: false,
    variants: [],
    nv: { label: '', price: '', stock: '' },
  }),
  computed: {
    show: () => !!store.productForm,
    pid() { return store.productForm && store.productForm.id; },
    total() { return this.existing.length + this.pending.length; },
  },
  watch: {
    show(v) { if (v) this.init(); }
  },
  methods: {
    close() { store.productForm = null; },
    async init() {
      const pf = store.productForm;
      this.existing = []; this.pending = []; this.err = ''; this.variants = []; this.nv = { label: '', price: '', stock: '' };
      this.form = { name: '', description: '', price: '', stock: '', category: 'voucher', tags: '', process_time: '', discount: '' };
      if (pf && pf.id) {
        try {
          const { product: p } = await api('/api/products/' + pf.id);
          this.form = { name: p.name || '', description: p.description || '', price: p.price || '', stock: p.stock ?? '', category: p.category || 'voucher', tags: p.tags || '', process_time: p.process_time || '', discount: p.discount || '' };
          this.existing = (p.images || []).slice();
          this.variants = (p.variants || []).slice();
        } catch (e) { toast(e.message, false); this.close(); }
      }
    },
    photoErr(msg) {
      this.err = msg || '';
      if (msg) setTimeout(() => { this.err = ''; }, 4000);
    },
    async handleFiles(fileList) {
      this.photoErr('');
      const room = 10 - this.total;
      if (room <= 0) return this.photoErr('Maksimal 10 foto');
      let added = 0;
      for (const f of fileList) {
        if (added >= room) break;
        if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { this.photoErr(`"${f.name}" bukan gambar valid`); continue; }
        const cf = await compressImage(f);
        if (cf.size > 1024 * 1024) { this.photoErr(`"${f.name}" lebih dari 1MB setelah kompresi, dilewati`); continue; }
        this.pending.push(cf); added++;
      }
    },
    onDrop(e) { this.dragOver = false; this.handleFiles(e.dataTransfer.files); },
    onPick(e) { this.handleFiles(e.target.files); e.target.value = ''; },
    rmPending(i) { this.pending.splice(i, 1); },
    async saveVariant(v) {
      try {
        await api(`/api/products/${this.pid}/variants/${v.id}`, { method: 'PUT',
          body: JSON.stringify({ label: v.label, price: Number(v.price) || 0, stock: Number(v.stock) || 0 }) });
        toast('Varian disimpan');
      } catch (e) { toast(e.message, false); }
    },
    async addVariant() {
      if (!this.nv.label.trim()) return toast('Label varian wajib diisi', false);
      try {
        const d = await api(`/api/products/${this.pid}/variants`, { method: 'POST',
          body: JSON.stringify({ label: this.nv.label.trim(), price: Number(this.nv.price) || 0, stock: Number(this.nv.stock) || 0 }) });
        this.variants.push(d.variant);
        this.nv = { label: '', price: '', stock: '' };
        toast('Varian ditambah ✅');
      } catch (e) { toast(e.message, false); }
    },
    async delVariant(vid) {
      if (!confirm('Hapus varian ini?')) return;
      try {
        await api(`/api/products/${this.pid}/variants/${vid}`, { method: 'DELETE' });
        this.variants = this.variants.filter(v => v.id !== vid);
        toast('Varian dihapus');
      } catch (e) { toast(e.message, false); }
    },
    preview(f) { return URL.createObjectURL(f); },
    async delPhoto(imageId) {
      if (!confirm('Hapus foto ini?')) return;
      try {
        await api(`/api/products/${this.pid}/images/${imageId}`, { method: 'DELETE' });
        this.existing = this.existing.filter(x => x.id !== imageId);
        if (!this.existing.some(x => x.sort_order === 0) && this.existing.length) this.existing[0].sort_order = 0;
        toast('Foto dihapus');
      } catch (e) { toast(e.message, false); }
    },
    async setMain(imageId) {
      try {
        const order = this.existing.map(x => x.id);
        order.sort((a, b) => (a === imageId ? -1 : b === imageId ? 1 : 0));
        await api(`/api/products/${this.pid}/images/reorder`, { method: 'PUT', body: JSON.stringify({ order }) });
        this.existing.forEach(x => { x.sort_order = order.indexOf(x.id); });
        this.existing.sort((a, b) => a.sort_order - b.sort_order);
        toast('Foto utama diubah');
      } catch (e) { toast(e.message, false); }
    },
    async save() {
      const b = {
        name: this.form.name.trim(), description: this.form.description.trim(),
        price: Number(this.form.price) || 0,
        category: this.form.category, tags: this.form.tags.trim(), process_time: this.form.process_time.trim(),
        discount: Math.max(0, Math.min(100, Number(this.form.discount) || 0))
      };
      // Stok manual hanya untuk produk tanpa varian dan bukan voucher (voucher ngikutin jumlah kode)
      if (!this.variants.length && this.form.category !== 'voucher') b.stock = Number(this.form.stock) || 0;
      if (!b.name || b.price < 0) return toast('Nama & harga wajib diisi', false);
      this.saving = true;
      try {
        let pid = this.pid;
        if (pid) await api('/api/products/' + pid, { method: 'PUT', body: JSON.stringify(b) });
        else { const d = await api('/api/products', { method: 'POST', body: JSON.stringify(b) }); pid = d.product.id; }
        if (this.pending.length) {
          const fd = new FormData();
          this.pending.forEach(f => fd.append('foto', f));
          const r = await fetch('/api/products/' + pid + '/images', { method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Upload foto gagal');
        }
        toast('Produk disimpan ✅');
        this.close();
        this.$emit('saved');
        loadHome();
      } catch (e) { toast(e.message, false); }
      finally { this.saving = false; }
    },
  },
  template: `
  <div v-if="show" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="close">
    <div class="absolute inset-0 bg-black/50" @click="close"></div>
    <div class="relative bg-white dark:bg-nova-surface w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto p-5">
      <h3 class="font-bold text-lg mb-4">{{ pid ? '✏️ Edit' : '➕ Tambah' }} Produk</h3>
      <div class="space-y-3 text-sm">
        <input v-model="form.name" placeholder="Nama produk" class="w-full border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
        <textarea v-model="form.description" placeholder="Deskripsi" rows="3" class="w-full border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none"></textarea>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="form.price" type="number" placeholder="Harga (Rp)" class="border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
          <input v-model="form.stock" type="number" placeholder="Stok" :disabled="variants.length > 0 || form.category === 'voucher'" :title="variants.length ? 'Stok mengikuti total varian' : (form.category === 'voucher' ? 'Stok mengikuti jumlah kode' : '')" class="border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400">
        </div>
        <p v-if="variants.length" class="text-[11px] text-gray-400">Stok produk = total stok varian ({{ variants.reduce((a, v) => a + (Number(v.stock) || 0), 0) }}). Ubah stok lewat tiap varian di bawah.</p>
        <p v-else-if="form.category === 'voucher'" class="text-[11px] text-gray-400">Stok otomatis mengikuti jumlah kode voucher yang tersedia. Kelola lewat tombol 🎫 Kode.</p>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="form.discount" type="number" min="0" max="100" placeholder="Diskon % (flash sale)" class="border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
          <input v-model="form.process_time" placeholder="Estimasi proses (mis: 5 menit)" class="border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
        </div>
        <select v-model="form.category" class="w-full border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
          <option v-for="c in store.cats" :key="c.id" :value="c.id">{{ c.icon }} {{ c.label }}</option>
        </select>
        <input v-model="form.tags" placeholder="Tags (koma, mis: mlbb,diamond)" class="w-full border rounded-xl px-3 py-2.5 focus:border-primary focus:outline-none">
        <div>
          <label class="block font-semibold mb-2">Foto Produk <span class="text-xs font-normal text-gray-400">({{ total }}/10)</span></label>
          <input type="file" ref="photoInput" accept="image/*" multiple class="hidden" @change="onPick">
          <div @click="$refs.photoInput.click()"
               @dragover.prevent="dragOver = true" @dragenter.prevent="dragOver = true"
               @dragleave.prevent="dragOver = false" @drop.prevent="onDrop"
               :class="['border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition', dragOver ? 'border-primary bg-indigo-50' : 'border-gray-300 dark:border-gray-600 hover:border-primary']">
            <div class="text-3xl mb-1">📸</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Klik atau seret foto ke sini<br><span class="text-xs text-gray-400">Maks 10 foto • 1MB per foto • jpg/png/webp/gif</span></div>
          </div>
          <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-3">
            <div v-for="im in existing" :key="'e' + im.id" class="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-nova-surface2 aspect-square">
              <img :src="im.url" class="w-full h-full object-cover">
              <span v-if="im.sort_order === 0" class="absolute top-1 left-1 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">Utama</span>
              <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 bg-black/40 opacity-0 group-hover:opacity-100 transition">
                <button v-if="im.sort_order !== 0" @click="setMain(im.id)" class="text-[10px] bg-white dark:bg-nova-surface rounded px-1.5 py-0.5">Utama</button>
                <button @click="delPhoto(im.id)" class="text-[10px] bg-red-500 text-white rounded px-1.5 py-0.5">Hapus</button>
              </div>
            </div>
            <div v-for="(f, i) in pending" :key="'p' + i" class="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-nova-surface2 aspect-square">
              <img :src="preview(f)" class="w-full h-full object-cover">
              <span class="absolute top-1 left-1 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-bold">Baru</span>
              <button @click="rmPending(i)" class="absolute bottom-1 right-1 text-[10px] bg-red-500 text-white rounded px-1.5 py-0.5">Hapus</button>
            </div>
          </div>
          <div v-if="err" class="text-xs text-red-500 mt-1.5">{{ err }}</div>
        </div>
        <!-- Varian produk (hanya saat edit) -->
        <div v-if="pid" class="mt-4">
          <label class="block font-semibold mb-2">Varian Produk <span class="text-xs font-normal text-gray-400">(mis: 50rb / 100rb / 200rb)</span></label>
          <div v-for="v in variants" :key="v.id" class="grid grid-cols-12 gap-2 mb-2 items-center">
            <input v-model="v.label" @change="saveVariant(v)" placeholder="Label" class="col-span-5 border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <input v-model.number="v.price" @change="saveVariant(v)" type="number" placeholder="Harga" class="col-span-3 border rounded-xl px-2 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <input v-model.number="v.stock" @change="saveVariant(v)" type="number" placeholder="Stok" class="col-span-3 border rounded-xl px-2 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <button @click="delVariant(v.id)" class="col-span-1 text-red-500 font-bold text-lg">✕</button>
          </div>
          <div class="grid grid-cols-12 gap-2 items-center">
            <input v-model="nv.label" placeholder="Label varian baru" class="col-span-5 border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <input v-model.number="nv.price" type="number" placeholder="Harga" class="col-span-3 border rounded-xl px-2 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <input v-model.number="nv.stock" type="number" placeholder="Stok" class="col-span-3 border rounded-xl px-2 py-2 text-sm focus:border-primary focus:outline-none min-w-0">
            <button @click="addVariant" class="col-span-1 bg-primary text-white text-sm font-bold rounded-xl py-2" title="Tambah varian">+</button>
          </div>
          <p class="text-[11px] text-gray-400 mt-1.5">Kalau ada varian, pembeli wajib pilih varian & harga/stok ngikutin varian yang dipilih.</p>
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button @click="close" class="flex-1 border-2 border-gray-200 dark:border-nova-line rounded-xl py-2.5 text-sm font-semibold">Batal</button>
        <button @click="save" :disabled="saving" class="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
      </div>
    </div>
  </div>`
};

function openProductForm(id) {
  store.productForm = { id: id || null };
}
