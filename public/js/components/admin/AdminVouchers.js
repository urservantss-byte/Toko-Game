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
    <div class="bg-white dark:bg-gray-900 border rounded-2xl p-4 mb-4">
      <h3 class="font-bold text-sm mb-3">➕ Buat Voucher Baru</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <input v-model="form.code" placeholder="Kode (mis. HEMAT10)" class="border rounded-xl px-3 py-2 text-sm uppercase outline-none focus:border-primary">
        <select v-model="form.kind" class="border rounded-xl px-3 py-2 text-sm outline-none">
          <option value="percent">Persen (%)</option>
          <option value="fixed">Nominal (Rp)</option>
        </select>
        <input v-model="form.value" type="number" placeholder="Nilai (10 / 50000)" class="border rounded-xl px-3 py-2 text-sm outline-none">
        <input v-model="form.min_total" type="number" placeholder="Min. belanja (Rp)" class="border rounded-xl px-3 py-2 text-sm outline-none">
        <input v-model="form.max_uses" type="number" placeholder="Maks. pakai (0 = unlimited)" class="border rounded-xl px-3 py-2 text-sm outline-none">
        <input v-model="form.expires_at" type="date" class="border rounded-xl px-3 py-2 text-sm outline-none">
      </div>
      <button @click="save" class="mt-3 bg-primary text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-indigo-700">Buat</button>
      <span class="text-xs ml-2" :class="msg.includes('✓') ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
    <div class="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[560px]">
          <thead><tr class="text-left text-xs text-gray-400 border-b dark:border-gray-800">
            <th class="p-3">Kode</th><th class="p-3">Diskon</th><th class="p-3">Min. Belanja</th><th class="p-3">Terpakai</th><th class="p-3">Expired</th><th class="p-3"></th>
          </tr></thead>
          <tbody>
            <tr v-for="v in list" :key="v.code" class="border-b dark:border-gray-800 last:border-0">
              <td class="p-3 font-mono font-bold">{{ v.code }}</td>
              <td class="p-3">{{ valLabel(v) }}</td>
              <td class="p-3">{{ v.min_total > 0 ? rp(v.min_total) : '-' }}</td>
              <td class="p-3">{{ v.used_count }}{{ v.max_uses > 0 ? '/' + v.max_uses : '' }}</td>
              <td class="p-3 text-xs">{{ v.expires_at || '-' }}</td>
              <td class="p-3 text-right"><button @click="del(v.code)" class="text-red-500 text-xs font-bold hover:underline">Hapus</button></td>
            </tr>
            <tr v-if="!list.length"><td colspan="6" class="p-6 text-center text-gray-400 text-xs">Belum ada voucher</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`
};
