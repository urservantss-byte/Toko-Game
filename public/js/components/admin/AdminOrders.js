/* Admin: kelola pesanan + modal input data delivery */
const STATUS_LIST = ['pending', 'proses', 'delivery', 'selesai', 'dibatalkan'];

const AdminOrders = {
  components: { StatusBadge },
  data: () => ({ orders: [], all: [], pg: 1 }),
  computed: {
    aof: () => store.aof,
    STATUS_LIST: () => STATUS_LIST,
    counts() {
      const c = {};
      STATUS_LIST.forEach(s => { c[s] = this.all.filter(o => o.status === s).length; });
      return c;
    },
    totalPages() { return Math.max(1, Math.ceil(this.orders.length / 10)); },
    pagedOrders() {
      const p = Math.min(this.pg, this.totalPages);
      return this.orders.slice((p - 1) * 10, p * 10);
    },
  },
  mounted() { this.load(); },
  methods: {
    rp,
    goPage(n) {
      this.pg = Math.min(Math.max(1, n), this.totalPages);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    stl(s) { return STLBL[s] || s; },
    async load() {
      try {
        const d = await api('/api/orders/all');
        this.all = d.orders || [];
        this.filter();
      } catch (e) { toast(e.message, false); }
    },
    filter() {
      let arr = this.all;
      if (store.aof.status) arr = arr.filter(o => o.status === store.aof.status);
      if (store.aof.q) {
        const q = store.aof.q.toLowerCase();
        arr = arr.filter(o => String(o.id).includes(q) || (o.user_name || '').toLowerCase().includes(q) || (o.user_email || '').toLowerCase().includes(q));
      }
      this.orders = arr;
    },
    fmtDay(s) { return new Date((s || '').replace(' ', 'T') + 'Z').toLocaleDateString('id-ID'); },
    async process(id) {
      if (!confirm('Proses pesanan #' + id + '?')) return;
      try {
        const d = await api('/api/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'proses' }) });
        if (d.autoDelivered) {
          toast('Pesanan #' + id + ' otomatis terkirim! ⚡ Kode sudah dikirim ke pembeli.');
        } else {
          toast('Pesanan #' + id + ' diproses ⚙️');
          this.openDeliver(id);
        }
      } catch (e) { toast(e.message, false); }
      this.load();
    },
    async cancel(id, force) {
      if (!confirm(force ? 'BATAL PAKSA pesanan #' + id + '? Stok & kode dikembalikan. Lakukan hanya jika salah input data!' : 'Batalkan pesanan #' + id + '?')) return;
      try {
        await api('/api/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status: 'dibatalkan', force: !!force }) });
        toast('Pesanan #' + id + ' dibatalkan');
      } catch (e) { toast(e.message, false); }
      this.load();
    },
    async openDeliver(id) {
      let order;
      try { order = (await api('/api/orders/' + id)).order; }
      catch (e) { return toast(e.message, false); }
      if (order.status !== 'proses') return toast('Pesanan bukan berstatus proses', false);
      store.deliverOrder = { id: order.id, items: order.items.map(it => ({ ...it, data: '', trx: '', file: null })) };
    },
  },
  template: `
  <div>
    <div class="flex gap-2 mb-3 flex-wrap">
      <select v-model="aof.status" @change="filter" class="nv-input !w-auto text-sm">
        <option value="">Semua status</option>
        <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ stl(s) }} ({{ counts[s] || 0 }})</option>
      </select>
      <input v-model="aof.q" @input="filter" placeholder="🔍 Cari ID / nama / email..." class="nv-input !w-auto flex-1 min-w-[180px] text-sm">
    </div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-x-auto shadow-sm">
      <table class="adm-table">
        <thead><tr>
          <th>ID</th><th>User</th><th>Item</th><th>Total</th><th>Bayar</th><th>Bukti</th><th>Status</th>
        </tr></thead>
        <tbody>
          <tr v-for="o in pagedOrders" :key="o.id">
            <td><b class="text-primary">#{{ o.id }}</b><br><span class="text-[10px] text-gray-400">{{ fmtDay(o.created_at) }}</span></td>
            <td><b class="font-medium">{{ o.user_name }}</b><br><span class="text-xs text-gray-400">{{ o.user_email }}</span></td>
            <td class="text-xs max-w-[180px]"><div v-for="it in (o.items || [])" :key="it.product_id" class="py-0.5">{{ it.name }} <b>×{{ it.qty }}</b></div></td>
            <td><b class="nv-price">{{ rp(o.total) }}</b></td>
            <td class="text-xs">{{ o.payment_method }}</td>
            <td>
              <a v-if="o.proof_path" :href="o.proof_path" target="_blank"><img :src="o.proof_path" class="w-12 h-12 object-cover rounded-lg border hover:scale-110 transition"></a>
              <span v-else class="text-xs text-gray-300">-</span>
            </td>
            <td>
              <div class="mb-2"><status-badge :status="o.status"></status-badge></div>
              <div class="adm-act">
                <template v-if="o.status === 'pending'">
                  <button @click="process(o.id)" class="adm-btn adm-btn-primary">⚙️ Proses</button>
                  <button @click="cancel(o.id)" class="adm-btn adm-btn-danger">Batalkan</button>
                </template>
                <template v-if="o.status === 'proses'">
                  <button @click="openDeliver(o.id)" class="adm-btn adm-btn-primary">📤 Input Data & Delivery</button>
                  <button @click="cancel(o.id, true)" class="adm-btn adm-btn-danger" title="Batal paksa — hanya jika salah input data">⚠️ Batal paksa</button>
                </template>
                <template v-if="o.status === 'delivery'">
                  <span class="text-[11px] text-gray-400">⏳ Menunggu ulasan user</span>
                  <button @click="cancel(o.id, true)" class="adm-btn adm-btn-danger" title="Batal paksa — hanya jika salah input data">⚠️ Batal paksa</button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="!orders.length"><td colspan="7" class="p-6 text-center text-gray-400 text-sm">Tidak ada pesanan.</td></tr>
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
    <deliver-modal @done="load"></deliver-modal>
  </div>`
};

/* Modal input data delivery (admin) */
const DeliverModal = {
  data: () => ({ sending: false }),
  computed: {
    order: () => store.deliverOrder,
    autoFor() { return (it) => it.category !== 'topup' && (it.auto_codes || 0) >= it.qty; },
  },
  methods: {
    close() { store.deliverOrder = null; },
    onFile(it, e) { it.file = e.target.files[0] || null; },
    async submit() {
      const o = this.order;
      if (!o) return;
      const fd = new FormData();
      for (const it of o.items) {
        if (it.category === 'topup') {
          if (!it.file) return toast(`Bukti topup wajib untuk "${it.name}"`, false);
          if (it.file.size > 1024 * 1024) return toast(`Bukti "${it.name}" maksimal 1MB`, false);
          if (!it.trx.trim()) return toast(`TRX ID wajib untuk "${it.name}"`, false);
          fd.append('proof_' + it.product_id, it.file);
          fd.append('trx_' + it.product_id, it.trx.trim());
        } else if (this.autoFor(it)) {
          fd.append('data_' + it.product_id, ''); // server pakai kode otomatis
        } else {
          if (!it.data.trim()) return toast(`Data pengiriman wajib untuk "${it.name}"`, false);
          fd.append('data_' + it.product_id, it.data.trim());
        }
      }
      if (!confirm('Data sudah benar? Status pesanan akan berubah ke DELIVERY dan data dikirim ke pembeli.')) return;
      this.sending = true;
      try {
        const r = await fetch('/api/orders/' + o.id + '/deliver', { method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Gagal delivery');
        toast(d.message || 'Delivery berhasil 📤');
        this.close();
        this.$emit('done');
      } catch (e) { toast(e.message, false); }
      finally { this.sending = false; }
    },
  },
  template: `
  <div v-if="order" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="close">
    <div class="absolute inset-0 bg-black/50" @click="close"></div>
    <div class="relative bg-white dark:bg-nova-surface w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto p-5">
      <h3 class="font-bold text-lg mb-1">📤 Input Data Delivery</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Pesanan <b class="text-primary">#{{ order.id }}</b> — isi data di bawah, lalu konfirmasi. Status otomatis berubah ke <b>delivery</b>.</p>
      <div class="space-y-3">
        <div v-for="it in order.items" :key="it.product_id" class="border rounded-2xl p-4 bg-gray-50 dark:bg-nova-surface2">
          <template v-if="it.category === 'topup'">
            <div class="font-bold text-sm mb-1">💎 {{ it.name }} <span class="text-[10px] font-normal text-gray-400">×{{ it.qty }}</span></div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Upload bukti sukses topup (gambar) + isi TRX ID.</p>
            <input type="file" accept="image/*" @change="onFile(it, $event)" class="w-full text-xs mb-2 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-100 dark:file:bg-indigo-500/20 file:text-primary dark:file:text-indigo-300 file:font-bold">
            <input v-model="it.trx" placeholder="TRX ID (contoh: TRX123456)" class="w-full border rounded-xl px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
          </template>
          <template v-else>
            <div class="font-bold text-sm mb-1">{{ it.category === 'akun' ? '👤' : '🎟️' }} {{ it.name }} <span class="text-[10px] font-normal text-gray-400">×{{ it.qty }}</span></div>
            <div v-if="autoFor(it)" class="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300">
              ⚡ {{ it.auto_codes }} kode otomatis tersedia — akan dikirim otomatis, tidak perlu isi manual.
            </div>
            <template v-else>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{{ it.category === 'akun' ? 'Isi detail akun (email & password / data login).' : 'Isi kode voucher.' }}<span v-if="it.auto_codes > 0" class="text-amber-600"> (stok kode otomatis kurang: {{ it.auto_codes }}/{{ it.qty }})</span></p>
              <textarea v-model="it.data" rows="3" :placeholder="it.category === 'akun' ? 'Email: ...\\nPassword: ...' : 'Kode voucher: ...'" class="w-full border rounded-xl px-3 py-2.5 text-sm focus:border-primary focus:outline-none font-mono"></textarea>
            </template>
          </template>
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button @click="close" class="flex-1 nv-btn-ghost py-2.5 text-sm">Nanti Saja</button>
        <button @click="submit" :disabled="sending" class="flex-1 nv-btn py-2.5 text-sm disabled:opacity-50">{{ sending ? 'Mengirim...' : 'Kirim & Delivery →' }}</button>
      </div>
    </div>
  </div>`
};
