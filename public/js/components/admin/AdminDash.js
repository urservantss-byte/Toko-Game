/* Admin: dashboard statistik */
const AdminDash = {
  components: { StatusBadge },
  data: () => ({ stats: null, err: '', qrisInput: '', qrisMerchant: '', qrisOk: false, qrisMsg: '',
    waInput: '', waSaved: '', waMsg: '', waOn: true,
    payMethods: [], pmMsg: '',
    pmForm: { id: '', label: '', details: '', kind: 'transfer' }, pmEdit: null,
    em: { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', admin_email: '', brevo_api_key: '' },
    emMsg: '', emOk: false,
    gId: '', gSecret: '', gMsg: '', gOk: false, gSavedId: '' }),
  mounted() { this.load(); this.loadQris(); this.loadEmail(); this.loadGoogle(); },
  methods: {
    rp,
    shortRp(n) {
      n = Number(n) || 0;
      if (n >= 1e9) return 'Rp' + (n / 1e9).toFixed(1) + 'M';
      if (n >= 1e6) return 'Rp' + (n / 1e6).toFixed(1) + 'jt';
      if (n >= 1e3) return 'Rp' + (n / 1e3).toFixed(0) + 'rb';
      return 'Rp' + n;
    },
    async load() {
      try {
        this.stats = await api('/api/admin/stats');
        store.pendingCount = this.stats.pending_orders || 0;
      } catch (e) { this.err = 'Gagal memuat dashboard.'; }
    },
    async loadQris() {
      try {
        const d = await api('/api/admin/settings');
        this.qrisOk = d.qris_configured;
        this.qrisMerchant = d.qris_merchant || '';
        this.waSaved = d.wa_cs || '';
        this.waOn = d.wa_cs_enabled !== false;
        this.payMethods = d.pay_methods || [];
      } catch {}
    },
    async saveQris() {
      this.qrisMsg = '';
      try {
        const d = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ qris_static: this.qrisInput }) });
        this.qrisOk = true; this.qrisMerchant = d.qris_merchant || ''; this.qrisInput = '';
        this.qrisMsg = 'QRIS tersimpan ✓';
      } catch (e) { this.qrisMsg = e.message; }
    },
    async saveWa() {
      this.waMsg = '';
      try {
        const d = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ wa_cs: this.waInput }) });
        this.waSaved = d.wa_cs || ''; this.waInput = '';
        this.waMsg = 'Nomor WA tersimpan ✓';
      } catch (e) { this.waMsg = e.message; }
    },
    async toggleWa() {
      this.waOn = !this.waOn;
      try { await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ wa_cs_enabled: this.waOn }) }); }
      catch (e) { this.waOn = !this.waOn; toast(e.message, false); }
    },
    async togglePay(m) {
      const nv = !m.active;
      try {
        const d = await api('/api/admin/pay-methods/' + m.id, { method: 'PUT', body: JSON.stringify({ active: nv }) });
        m.active = d.method.active;
      } catch (e) { toast(e.message, false); }
    },
    async addPay() {
      this.pmMsg = '';
      const f = this.pmForm;
      if (!f.label.trim()) { this.pmMsg = 'Label wajib diisi'; return; }
      try {
        const d = await api('/api/admin/pay-methods', { method: 'POST',
          body: JSON.stringify({ id: f.id || f.label, label: f.label, details: f.details, kind: f.kind }) });
        this.payMethods.push(d.method);
        this.pmForm = { id: '', label: '', details: '', kind: 'transfer' };
        this.pmMsg = 'Metode ditambahkan ✓';
      } catch (e) { this.pmMsg = e.message; }
    },
    startEditPay(m) {
      this.pmEdit = m.id;
      this.pmForm = { id: m.id, label: m.label, details: m.details || '', kind: m.kind };
      this.pmMsg = '';
    },
    async saveEditPay() {
      this.pmMsg = '';
      const f = this.pmForm;
      try {
        const d = await api('/api/admin/pay-methods/' + this.pmEdit, { method: 'PUT',
          body: JSON.stringify({ label: f.label, details: f.details, kind: f.kind }) });
        const i = this.payMethods.findIndex(x => x.id === this.pmEdit);
        if (i >= 0) this.payMethods.splice(i, 1, d.method);
        this.pmEdit = null;
        this.pmForm = { id: '', label: '', details: '', kind: 'transfer' };
        this.pmMsg = 'Metode diperbarui ✓';
      } catch (e) { this.pmMsg = e.message; }
    },
    cancelEditPay() {
      this.pmEdit = null;
      this.pmForm = { id: '', label: '', details: '', kind: 'transfer' };
    },
    async delPay(m) {
      if (!confirm('Hapus metode "' + m.label + '"?')) return;
      try {
        await api('/api/admin/pay-methods/' + m.id, { method: 'DELETE' });
        this.payMethods = this.payMethods.filter(x => x.id !== m.id);
      } catch (e) { toast(e.message, false); }
    },
    async loadEmail() {
      try {
        const d = await api('/api/admin/email-settings');
        this.em = { smtp_host: d.smtp_host || '', smtp_port: d.smtp_port || '587', smtp_user: d.smtp_user || '',
          smtp_pass: '', smtp_from: d.smtp_from || '', admin_email: d.admin_email || '', brevo_api_key: '' };
        this.emOk = !!d.smtp_host || !!d.brevo_api_key_set;
      } catch {}
    },
    async saveEmail() {
      this.emMsg = '';
      try {
        await api('/api/admin/email-settings', { method: 'PUT', body: JSON.stringify(this.em) });
        this.em.smtp_pass = '';
        this.em.brevo_api_key = '';
        this.emOk = !!this.em.smtp_host || this.emOk;
        this.emMsg = 'Pengaturan email tersimpan ✓';
      } catch (e) { this.emMsg = e.message; }
    },
    async testEmail() {
      this.emMsg = '';
      try {
        const d = await api('/api/admin/email-test', { method: 'POST' });
        this.emMsg = d.message || 'Terkirim ✓';
      } catch (e) { this.emMsg = e.message; }
    },
    async loadGoogle() {
      try {
        const d = await api('/api/admin/google-settings');
        this.gOk = d.google_configured;
        this.gSavedId = d.google_client_id || '';
      } catch {}
    },
    async saveGoogle() {
      this.gMsg = '';
      try {
        const d = await api('/api/admin/google-settings', { method: 'PUT',
          body: JSON.stringify({ google_client_id: this.gId, google_client_secret: this.gSecret }) });
        this.gOk = d.google_configured; this.gSavedId = this.gId || this.gSavedId;
        this.gId = ''; this.gSecret = '';
        this.gMsg = 'Kredensial Google tersimpan ✓';
      } catch (e) { this.gMsg = e.message; }
    },
    barH(t, max) { return Math.round((Number(t) / max) * 90) + 4; },
    dayName(d) { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short' }); },
  },
  computed: {
    maxSale() { return Math.max(...(this.stats ? this.stats.sales_7d.map(x => Number(x.t)) : [0]), 1); },
    cards() {
      const s = this.stats;
      if (!s) return [];
      return [
        { ic: '💰', lb: 'Total Pendapatan', v: rp(s.revenue_total), cls: 'text-emerald-700 dark:text-emerald-400' },
        { ic: '🧾', lb: 'Pesanan Hari Ini', v: s.orders_today + ' (' + rp(s.revenue_today) + ')', cls: 'text-blue-700 dark:text-blue-400' },
        { ic: '⏳', lb: 'Perlu Diproses', v: s.pending_orders + ' pending', cls: 'text-amber-700 dark:text-amber-400' },
        { ic: '📦', lb: 'Total Produk', v: String(s.total_products), cls: 'text-violet-700 dark:text-violet-400', warn: s.low_stock ? ` (${s.low_stock} !)` : '' },
        { ic: '👥', lb: 'Total Pembeli', v: String(s.total_users), cls: 'text-pink-700 dark:text-pink-400' },
      ];
    },
  },
  template: `
  <div>
    <p v-if="err" class="text-red-400 text-sm">{{ err }}</p>
    <div v-if="!stats && !err" class="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-5">
      <div v-for="i in 5" :key="'dsk'+i" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 space-y-2">
        <div class="skel h-3 w-2/3"></div><div class="skel h-6 w-1/2"></div>
      </div>
    </div>
    <template v-if="stats">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-5">
        <div v-for="c in cards" :key="c.lb" class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm min-w-0">
          <div class="text-xl mb-1">{{ c.ic }}</div>
          <div class="text-[11px] text-gray-400 font-medium truncate">{{ c.lb }}</div>
          <div :class="['text-sm md:text-lg font-extrabold mt-1 break-words', c.cls]">{{ c.v }}<span v-if="c.warn" class="text-red-500">{{ c.warn }}</span></div>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-3 md:gap-4">
        <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 md:p-4 shadow-sm overflow-hidden">
          <h3 class="font-bold text-sm mb-3">📈 Penjualan 7 Hari <span class="text-[10px] font-normal text-gray-400">(realtime)</span></h3>
          <div class="flex items-end gap-1 md:gap-2 h-28 md:h-32">
            <div v-for="x in stats.sales_7d" :key="x.d" class="flex-1 flex flex-col items-center gap-1">
              <div class="text-[10px] font-bold text-gray-600 dark:text-gray-400">{{ x.t > 0 ? shortRp(x.t) : '' }}</div>
              <div class="w-full bg-indigo-100 dark:bg-gray-800 rounded-t-lg relative" :style="{ height: barH(x.t, maxSale) + 'px' }">
                <div class="absolute bottom-0 inset-x-0 bg-primary rounded-t-lg" style="height:100%"></div>
              </div>
              <div class="text-[10px] text-gray-400">{{ dayName(x.d) }}</div>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 md:p-4 shadow-sm overflow-hidden">
          <h3 class="font-bold text-sm mb-3">🕐 Pesanan Terbaru</h3>
          <div class="space-y-2 text-sm">
            <div v-for="o in stats.recent_orders" :key="o.id" class="flex items-center justify-between py-2 border-b last:border-0 gap-2">
              <div class="min-w-0"><b class="text-primary">#{{ o.id }}</b> <span class="text-gray-500 dark:text-gray-400 text-xs truncate">{{ o.user_name }}</span></div>
              <div class="text-right shrink-0"><div class="font-bold text-sm">{{ rp(o.total) }}</div><div class="text-[10px]"><status-badge :status="o.status"></status-badge></div></div>
            </div>
            <p v-if="!stats.recent_orders.length" class="text-gray-400 text-xs">Belum ada pesanan.</p>
          </div>
        </div>
      </div>
      <!-- Pengaturan QRIS -->
      <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm mt-4">
        <h3 class="font-bold text-sm mb-1">⚡ Pengaturan QRIS</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Tempel string QRIS statis tokomu (scan QRIS cetak pakai aplikasi QR scanner, copy teksnya). Status:
          <b :class="qrisOk ? 'text-green-600' : 'text-red-500'">{{ qrisOk ? 'Aktif (' + qrisMerchant + ')' : 'Belum dikonfigurasi' }}</b>
        </p>
        <textarea v-model="qrisInput" rows="3" placeholder="Tempel string QRIS di sini (diawali 000201...)"
                  class="w-full border rounded-xl p-2.5 text-xs font-mono outline-none focus:border-primary"></textarea>
        <div class="flex items-center gap-2 mt-2">
          <button @click="saveQris" class="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Simpan QRIS</button>
          <span class="text-xs" :class="qrisMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ qrisMsg }}</span>
        </div>
        <div class="border-t mt-4 pt-3">
          <h4 class="font-bold text-xs mb-1">💬 WhatsApp CS</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Nomor aktif: <b>{{ waSaved || '-' }}</b> (format: 62812xxxxxxx)</p>
          <div class="flex gap-2">
            <input v-model="waInput" placeholder="62812xxxxxxx" class="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <button @click="saveWa" class="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-green-700">Simpan</button>
          </div>
          <label class="flex items-center gap-2 mt-2 text-xs cursor-pointer select-none">
            <button @click="toggleWa" :class="['w-10 h-6 rounded-full relative transition-colors', waOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']">
              <span :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', waOn ? 'left-[18px]' : 'left-0.5']"></span>
            </button>
            <span>Tombol chat WA {{ waOn ? 'tampil' : 'disembunyikan' }}</span>
          </label>
          <span class="text-xs" :class="waMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ waMsg }}</span>
        </div>
        <div class="border-t mt-4 pt-3">
          <h4 class="font-bold text-xs mb-1">💳 Metode Pembayaran</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Kelola bank/e-wallet/QRIS. Yang nonaktif tidak tampil di checkout.</p>
          <div class="space-y-2 mb-3">
            <div v-for="m in payMethods" :key="m.id" class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
              <button @click="togglePay(m)" :class="['w-10 h-6 rounded-full relative transition-colors shrink-0', m.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700']">
                <span :class="['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', m.active ? 'left-[18px]' : 'left-0.5']"></span>
              </button>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold truncate">{{ m.label }} <span class="font-normal text-gray-400">({{ m.kind === 'qris' ? 'QRIS' : 'Transfer' }})</span></div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">{{ m.details || '-' }}</div>
              </div>
              <button @click="startEditPay(m)" class="text-xs text-primary font-bold px-2 py-1">✏️</button>
              <button @click="delPay(m)" class="text-xs text-red-500 font-bold px-2 py-1">🗑️</button>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <div class="text-xs font-bold mb-2">{{ pmEdit ? '✏️ Ubah metode' : '➕ Tambah metode baru' }}</div>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="pmForm.label" :disabled="!!pmEdit" placeholder="Label, mis: 🏦 Transfer BRI" class="border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary col-span-2">
              <input v-model="pmForm.details" placeholder="Detail rekening, mis: BRI 1234 0100 5678 901 a.n. TokoGame" class="border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary col-span-2">
              <select v-model="pmForm.kind" class="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary bg-white dark:bg-gray-900">
                <option value="transfer">Transfer (upload bukti)</option>
                <option value="qris">QRIS (scan QR)</option>
              </select>
              <div class="flex gap-2">
                <button v-if="!pmEdit" @click="addPay" class="flex-1 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-700">Tambah</button>
                <template v-else>
                  <button @click="saveEditPay" class="flex-1 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-700">Simpan</button>
                  <button @click="cancelEditPay" class="bg-gray-200 dark:bg-gray-700 text-xs font-bold px-3 py-2 rounded-xl">Batal</button>
                </template>
              </div>
            </div>
            <span class="text-xs" :class="pmMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ pmMsg }}</span>
          </div>
        </div>
        </div>
        <div class="border-t mt-4 pt-3">
          <h4 class="font-bold text-xs mb-1">📧 Email Notifikasi (SMTP Gmail)</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Status: <b :class="emOk ? 'text-green-600' : 'text-red-500'">{{ emOk ? 'Aktif' : 'Belum dikonfigurasi' }}</b> — dipakai untuk notifikasi pesanan ke pembeli & email ke admin saat pesanan dikirim. Untuk Gmail: buat <b>App Password</b> di myaccount.google.com → Keamanan → Verifikasi 2 langkah → Sandi aplikasi. <b>Catatan:</b> kalau hosting memblokir SMTP (mis. Railway), isi <b>Brevo API Key</b> di bawah — email dikirim via HTTPS.</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <input v-model="em.brevo_api_key" type="password" placeholder="Brevo API Key (opsional, atasi blokir SMTP)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary col-span-2 md:col-span-3">
            <input v-model="em.smtp_host" placeholder="Host (smtp.gmail.com)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="em.smtp_port" placeholder="Port (587)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="em.smtp_user" placeholder="Email Gmail" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="em.smtp_pass" type="password" placeholder="App Password (kosongkan = tidak diubah)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="em.smtp_from" placeholder="Nama pengirim (opsional)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="em.admin_email" placeholder="Email admin penerima notif" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button @click="saveEmail" class="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Simpan Email</button>
            <button @click="testEmail" class="bg-gray-100 dark:bg-gray-800 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700">Kirim Tes</button>
            <span class="text-xs" :class="emMsg.includes('✓') || emMsg.includes('Terkirim') ? 'text-green-600' : 'text-red-500'">{{ emMsg }}</span>
          </div>
        </div>
        <div class="border-t mt-4 pt-3">
          <h4 class="font-bold text-xs mb-1">🔑 Login Google (OAuth)</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Status: <b :class="gOk ? 'text-green-600' : 'text-red-500'">{{ gOk ? 'Aktif' : 'Belum dikonfigurasi' }}</b><span v-if="gSavedId"> — Client ID: <span class="font-mono">{{ gSavedId.slice(0, 24) }}…</span></span></p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Buat di <b>console.cloud.google.com</b> → APIs & Services → Credentials → OAuth client ID (Web). Tambahkan <b>Authorized redirect URI</b>: <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">[URL-publik-toko]/api/auth/google/callback</span> (URL berubah tiap reconnect — tambahkan yang baru).</p>
          <div class="grid md:grid-cols-2 gap-2">
            <input v-model="gId" placeholder="Google Client ID" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
            <input v-model="gSecret" type="password" placeholder="Google Client Secret (kosongkan = tidak diubah)" class="border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary">
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button @click="saveGoogle" class="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">Simpan Google</button>
            <span class="text-xs" :class="gMsg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ gMsg }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>`
};
