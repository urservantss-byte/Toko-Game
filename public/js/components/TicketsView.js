/* Tiket komplain / bantuan (user) */
const TicketsView = {
  data: () => ({
    list: [], cur: null, reply: '',
    form: { subject: '', order_id: '', message: '' },
    showForm: false, loading: false,
    myOrders: [],
  }),
  mounted() { this.load(); this.loadOrders(); },
  methods: {
    fmtDate,
    async load() {
      try { this.list = (await api('/api/tickets')).tickets || []; } catch (e) { toast(e.message, false); }
    },
    async loadOrders() {
      try { this.myOrders = (await api('/api/orders')).orders || []; } catch {}
      if (store.ticketOrderId) {
        this.form.order_id = String(store.ticketOrderId);
        store.ticketOrderId = '';
        this.showForm = true;
      }
    },
    async open(t) {
      try { this.cur = (await api('/api/tickets/' + t.id)).ticket; this.reply = ''; } catch (e) { toast(e.message, false); }
    },
    async create() {
      if (!this.form.subject.trim() || !this.form.message.trim()) return toast('Isi subjek & pesan', false);
      this.loading = true;
      try {
        const d = await api('/api/tickets', { method: 'POST', body: JSON.stringify({
          subject: this.form.subject, message: this.form.message,
          order_id: this.form.order_id ? Number(this.form.order_id) : null,
        })});
        this.form = { subject: '', order_id: '', message: '' };
        this.showForm = false;
        toast('Tiket dibuat, admin akan segera membalas');
        this.load();
        this.cur = d.ticket;
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    async sendReply() {
      if (!this.reply.trim()) return;
      this.loading = true;
      try {
        this.cur = (await api('/api/tickets/' + this.cur.id + '/reply', { method: 'POST', body: JSON.stringify({ message: this.reply }) })).ticket;
        this.reply = '';
        this.load();
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    stCls(s) {
      return s === 'open' ? 'bg-amber-100 text-amber-700' : s === 'answered' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-800';
    },
    stLbl(s) { return s === 'open' ? 'Menunggu balasan' : s === 'answered' ? 'Dibalas admin' : 'Ditutup'; },
  },
  template: `
  <div class="max-w-4xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">🎫 Bantuan & Komplain</h2>
      <button @click="showForm = !showForm; cur = showForm ? null : cur" class="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">
        {{ showForm ? 'Tutup' : '＋ Buat Tiket' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-4 space-y-3">
      <div>
        <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Subjek</label>
        <input v-model="form.subject" placeholder="Contoh: Kode voucher tidak valid" class="mt-1.5 w-full border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
      </div>
      <div>
        <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Pesanan terkait (opsional)</label>
        <select v-model="form.order_id" class="mt-1.5 w-full border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">— Umum / tanpa pesanan —</option>
          <option v-for="o in myOrders" :key="o.id" :value="o.id">#{{ o.id }} — {{ o.status }}</option>
        </select>
      </div>
      <div>
        <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Pesan</label>
        <textarea v-model="form.message" rows="4" placeholder="Jelaskan masalahmu sedetail mungkin..." class="mt-1.5 w-full border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"></textarea>
      </div>
      <button @click="create" :disabled="loading" class="bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Mengirim...' : 'Kirim Tiket' }}</button>
    </div>

    <div class="grid md:grid-cols-[1fr_1.5fr] gap-3">
      <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto">
          <div v-for="t in list" :key="t.id" @click="open(t); showForm = false" class="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
               :class="{ 'bg-indigo-50/50 dark:bg-indigo-900/20': cur && cur.id === t.id }">
            <div class="flex items-center justify-between gap-2 mb-1">
              <b class="text-sm truncate">#{{ t.id }} {{ t.subject }}</b>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" :class="stCls(t.status)">{{ stLbl(t.status) }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ t.order_id ? 'Order #' + t.order_id : 'Umum' }} · {{ fmtDate(t.updated_at) }} · {{ t.msg_count }} pesan</div>
          </div>
          <div v-if="!list.length" class="p-8 text-center text-gray-400 text-sm">Belum ada tiket. Klik "Buat Tiket" jika butuh bantuan.</div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col min-h-[50vh]">
        <template v-if="cur">
          <div class="mb-3">
            <b class="text-sm">#{{ cur.id }} {{ cur.subject }}</b>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ cur.order_id ? 'Order #' + cur.order_id : 'Umum' }} ·
              <span :class="stCls(cur.status)" class="px-2 py-0.5 rounded-full text-[10px] font-bold">{{ stLbl(cur.status) }}</span>
            </div>
          </div>
          <div class="flex-1 space-y-2.5 overflow-y-auto max-h-[45vh] mb-3 pr-1">
            <div v-for="m in cur.messages" :key="m.id" class="flex" :class="m.is_admin ? 'justify-start' : 'justify-end'">
              <div class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm"
                   :class="m.is_admin ? 'bg-gray-100 dark:bg-gray-800 rounded-bl-md' : 'bg-primary text-white rounded-br-md'">
                <div class="text-[10px] opacity-70 mb-0.5 font-semibold">{{ m.is_admin ? 'Admin TokoGame' : 'Kamu' }}</div>
                <div class="whitespace-pre-wrap">{{ m.message }}</div>
                <div class="text-[10px] opacity-60 mt-1 text-right">{{ fmtDate(m.created_at) }}</div>
              </div>
            </div>
          </div>
          <div v-if="cur.status !== 'closed'" class="flex gap-2">
            <input v-model="reply" @keyup.enter="sendReply" placeholder="Tulis balasan..." :disabled="loading"
                   class="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
            <button @click="sendReply" :disabled="loading" class="bg-primary text-white text-sm font-bold px-5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">Kirim</button>
          </div>
          <p v-else class="text-xs text-gray-400 text-center">Tiket ini sudah ditutup admin.</p>
        </template>
        <div v-else class="flex-1 flex items-center justify-center text-gray-400 text-sm">Pilih tiket untuk melihat percakapan</div>
      </div>
    </div>
  </div>`
};
