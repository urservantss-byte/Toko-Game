/* Admin: kelola user */
const AdminUsers = {
  data: () => ({ users: [], pg: 1 }),
  computed: {
    totalPages() { return Math.max(1, Math.ceil(this.users.length / 10)); },
    pagedUsers() {
      const p = Math.min(this.pg, this.totalPages);
      return this.users.slice((p - 1) * 10, p * 10);
    },
  },
  mounted() { this.load(); },
  methods: {
    fmtDay(s) { return new Date((s || '').replace(' ', 'T') + 'Z').toLocaleDateString('id-ID'); },
    async load() {
      try { this.users = (await api('/api/users')).users || []; }
      catch (e) { toast(e.message, false); }
    },
    async toggleRole(id, cur) {
      const role = cur === 'admin' ? 'user' : 'admin';
      if (!confirm(`Ubah role jadi ${role}?`)) return;
      try {
        await api('/api/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role }) });
        toast('Role diubah');
        this.load();
      } catch (e) { toast(e.message, false); }
    },
  },
  template: `
  <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-x-auto shadow-sm">
    <table class="w-full text-sm">
      <thead><tr class="text-left text-gray-400 border-b dark:border-nova-line text-xs uppercase">
        <th class="p-3">Nama</th><th class="p-3">Email</th><th class="p-3">Role</th><th class="p-3">Daftar</th><th class="p-3">Aksi</th>
      </tr></thead>
      <tbody>
        <tr v-for="u in pagedUsers" :key="u.id" class="border-b dark:border-nova-line last:border-0 hover:bg-gray-50 dark:hover:bg-nova-surface2">
          <td class="p-3 font-medium">{{ u.name }}
            <span v-if="u.email_verified" class="text-emerald-500 text-xs" title="Email terverifikasi"> ✓</span>
            <span v-else class="text-amber-500 text-xs" title="Belum verifikasi email"> !</span>
          </td>
          <td class="p-3 text-gray-500 dark:text-gray-400">{{ u.email }}</td>
          <td class="p-3"><span :class="['text-[10px] font-bold px-2 py-1 rounded-full', u.role === 'admin' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' : 'bg-gray-100 dark:bg-nova-surface2 text-gray-600 dark:text-gray-400']">{{ u.role }}</span></td>
          <td class="p-3 text-xs text-gray-400">{{ fmtDay(u.created_at) }}</td>
          <td class="p-3">
            <button v-if="me && u.id !== me.id" @click="toggleRole(u.id, u.role)" class="text-xs font-semibold text-primary hover:underline">Jadikan {{ u.role === 'admin' ? 'User' : 'Admin' }}</button>
            <span v-else class="text-xs text-gray-300">(kamu)</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-4">
      <button @click="pg = Math.max(1, pg - 1)" :disabled="pg <= 1" class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">‹</button>
      <button v-for="n in totalPages" :key="n" @click="pg = n"
              :class="['w-9 h-9 rounded-full text-sm font-bold transition', pg === n ? 'text-white' : 'nv-btn-ghost !p-0']"
              :style="pg === n ? 'background:linear-gradient(135deg,#7a88ff,#5a68e8);box-shadow:0 4px 12px rgba(108,124,255,.4)' : ''">{{ n }}</button>
      <button @click="pg = Math.min(totalPages, pg + 1)" :disabled="pg >= totalPages" class="nv-btn-ghost w-9 h-9 !p-0 text-sm disabled:opacity-30">›</button>
    </div>
  </div>`,
  computed: { me: () => store.user },
};
