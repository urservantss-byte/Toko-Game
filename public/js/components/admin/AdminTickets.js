/* Admin: kelola tiket komplain */
const AdminTickets = {
  data: () => ({ list: [], cur: null, reply: '', filter: 'open', loading: false }),
  mounted() { this.load(); },
  computed: {
    filtered() {
      if (this.filter === 'all') return this.list;
      return this.list.filter(t => t.status === this.filter);
    },
    counts() {
      const c = { open: 0, answered: 0, closed: 0 };
      this.list.forEach(t => { if (c[t.status] !== undefined) c[t.status]++; });
      return c;
    },
  },
  methods: {
    fmtDate,
    async load() {
      try { this.list = (await api('/api/admin/tickets')).tickets || []; } catch (e) { toast(e.message, false); }
    },
    async open(t) {
      try { this.cur = (await api('/api/admin/tickets/' + t.id)).ticket; this.reply = ''; } catch (e) { toast(e.message, false); }
    },
    async sendReply() {
      if (!this.reply.trim()) return;
      this.loading = true;
      try {
        this.cur = (await api('/api/admin/tickets/' + this.cur.id + '/reply', { method: 'POST', body: JSON.stringify({ message: this.reply }) })).ticket;
        this.reply = '';
        this.load();
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    async setStatus(s) {
      await api('/api/admin/tickets/' + this.cur.id, { method: 'PATCH', body: JSON.stringify({ status: s }) });
      this.cur.status = s;
      this.load();
      toast(s === 'closed' ? 'Tiket ditutup' : 'Tiket dibuka kembali');
    },
    stCls(s) {
      return s === 'open' ? 'bg-red-500/15 text-red-600 dark:text-red-300' : s === 'answered' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'bg-gray-500/15 text-gray-500 dark:text-gray-400';
    },
    stLbl(s) { return s === 'open' ? 'Butuh Balasan' : s === 'answered' ? 'Terjawab' : 'Ditutup'; },
  },
  template: `
  <div class="grid md:grid-cols-[1fr_1.4fr] gap-3">
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-hidden">
      <div class="p-3 border-b border-gray-100 dark:border-nova-line flex gap-1.5 flex-wrap">
        <button v-for="f in [['open','Butuh Balasan'],['answered','Terjawab'],['closed','Ditutup'],['all','Semua']]" :key="f[0]"
                @click="filter = f[0]" class="text-xs font-semibold px-3 py-1.5 rounded-full"
                :class="filter === f[0] ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-nova-surface2 text-gray-600 dark:text-gray-400'">
          {{ f[1] }} ({{ f[0] === 'all' ? list.length : (counts[f[0]] || 0) }})
        </button>
      </div>
      <div class="divide-y divide-gray-100 dark:divide-nova-line max-h-[60vh] overflow-y-auto">
        <div v-for="t in filtered" :key="t.id" @click="open(t)" class="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-nova-surface2"
             :class="{ 'bg-indigo-50/50 dark:bg-indigo-900/20': cur && cur.id === t.id }">
          <div class="flex items-center justify-between gap-2 mb-1">
            <b class="text-sm">#{{ t.id }} {{ t.subject }}</b>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" :class="stCls(t.status)">{{ stLbl(t.status) }}</span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">{{ t.user_name }} · {{ t.order_id ? 'Order #' + t.order_id : 'Umum' }} · {{ fmtDate(t.updated_at) }}</div>
        </div>
        <div v-if="!filtered.length" class="p-8 text-center text-gray-400 text-sm">Tidak ada tiket</div>
      </div>
    </div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 flex flex-col min-h-[50vh]">
      <template v-if="cur">
        <div class="flex items-center justify-between mb-3">
          <div>
            <b class="text-sm">#{{ cur.id }} {{ cur.subject }}</b>
            <div class="text-xs text-gray-500 dark:text-gray-400">{{ cur.user_name }} ({{ cur.user_email }}) · {{ cur.order_id ? 'Order #' + cur.order_id : 'Umum' }}</div>
          </div>
          <button v-if="cur.status !== 'closed'" @click="setStatus('closed')" class="text-xs bg-gray-100 dark:bg-nova-surface2 px-3 py-1.5 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">Tutup tiket</button>
          <button v-else @click="setStatus('open')" class="text-xs bg-gray-100 dark:bg-nova-surface2 px-3 py-1.5 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">Buka lagi</button>
        </div>
        <div class="flex-1 space-y-2.5 overflow-y-auto max-h-[45vh] mb-3 pr-1">
          <div v-for="m in cur.messages" :key="m.id" class="flex" :class="m.is_admin ? 'justify-end' : 'justify-start'">
            <div class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm"
                 :class="m.is_admin ? 'bg-primary text-white rounded-br-md' : 'bg-gray-100 dark:bg-nova-surface2 rounded-bl-md'">
              <div class="text-[10px] opacity-70 mb-0.5 font-semibold">{{ m.is_admin ? 'Admin' : m.user_name }}</div>
              <div class="whitespace-pre-wrap">{{ m.message }}</div>
              <div class="text-[10px] opacity-60 mt-1 text-right">{{ fmtDate(m.created_at) }}</div>
            </div>
          </div>
        </div>
        <div v-if="cur.status !== 'closed'" class="flex gap-2">
          <input v-model="reply" @keyup.enter="sendReply" placeholder="Tulis balasan..." :disabled="loading"
                 class="flex-1 min-w-0 border border-gray-200 dark:border-nova-line bg-gray-50/60 dark:bg-nova-surface2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
          <button @click="sendReply" :disabled="loading" class="bg-primary text-white text-sm font-bold px-5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">Kirim</button>
        </div>
        <p v-else class="text-xs text-gray-400 text-center">Tiket sudah ditutup.</p>
      </template>
      <div v-else class="flex-1 flex items-center justify-center text-gray-400 text-sm">Pilih tiket untuk melihat percakapan</div>
    </div>
  </div>`
};
