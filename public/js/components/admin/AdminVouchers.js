/* Admin: kelola kode voucher/promo */
const AdminVouchers = {
  data: () => ({ list: [], form: { code: '', kind: 'percent', value: '', min_total: '', max_uses: '', expires_at: '' }, msg: '' }),
  mounted() { this.load(); },
  methods: {
    rp,
    async load() {
      try { this.list = (await api('/api/admin/vouchers')).vouchers || []; } catch (e) { this.msg = e.message; }
    },
    async save() {
      this.msg = '';
      try {
        await api('/api/admin/vouchers', { method: 'POST', body: JSON.stringify(this.form) });
        this.form = { code: '', kind: 'percent', value: '', min_total: '', max_uses: '', expires_at: '' };
        this.msg = 'Voucher dibuat ✓';
        this.load();
      } catch (e) { this.msg = e.message; }
    },
    async del(code) {
      if (!confirm(`Hapus voucher ${code}?`)) return;
      await api('/api/admin/vouchers/' + code, { method: 'DELETE' });
      this.load();
    },
    valLabel(v) { return v.kind === 'percent' ? v.value + '%' : rp(v.value); },
  },
  template: `
  <div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 mb-4 shadow-sm">
      <h3 class="font-bold text-sm mb-3">➕ Buat Voucher Baru</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <input v-model="form.code" placeholder="Kode (mis. HEMAT10)" class="nv-input text-sm uppercase">
        <select v-model="form.kind" class="nv-input text-sm">
          <option value="percent">Persen (%)</option>
          <option value="fixed">Nominal (Rp)</option>
        </select>
        <input v-model="form.value" type="number" placeholder="Nilai (10 / 50000)" class="nv-input text-sm">
        <input v-model="form.min_total" type="number" placeholder="Min. belanja (Rp)" class="nv-input text-sm">
        <input v-model="form.max_uses" type="number" placeholder="Maks. pakai (0 = unlimited)" class="nv-input text-sm">
        <input v-model="form.expires_at" type="date" class="nv-input text-sm">
      </div>
      <button @click="save" class="nv-btn text-sm px-5 py-2 mt-3">Buat</button>
      <span class="text-xs ml-2" :class="msg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
    <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-x-auto shadow-sm">
        <table class="adm-table min-w-[560px]">
          <thead><tr>
            <th>Kode</th><th>Diskon</th><th>Min. Belanja</th><th>Terpakai</th><th>Expired</th><th></th>
          </tr></thead>
          <tbody>
            <tr v-for="v in list" :key="v.code">
              <td><b class="font-mono">{{ v.code }}</b></td>
              <td>{{ valLabel(v) }}</td>
              <td>{{ v.min_total > 0 ? rp(v.min_total) : '-' }}</td>
              <td>{{ v.used_count }}{{ v.max_uses > 0 ? '/' + v.max_uses : '' }}</td>
              <td class="text-xs text-gray-400">{{ v.expires_at || '-' }}</td>
              <td><div class="adm-act justify-end"><button @click="del(v.code)" class="adm-btn adm-btn-danger">🗑️ Hapus</button></div></td>
            </tr>
            <tr v-if="!list.length"><td colspan="6" class="p-6 text-center text-gray-400 text-xs">Belum ada voucher</td></tr>
          </tbody>
        </table>
    </div>
  </div>`
};
