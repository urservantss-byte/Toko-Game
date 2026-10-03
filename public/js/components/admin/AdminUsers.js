/* Admin: kelola user */
const AdminUsers = {
  data: () => ({ users: [] }),
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
  <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
    <table class="w-full text-sm">
      <thead><tr class="text-left text-gray-400 border-b dark:border-gray-800 text-xs uppercase">
        <th class="p-3">Nama</th><th class="p-3">Email</th><th class="p-3">Role</th><th class="p-3">Daftar</th><th class="p-3">Aksi</th>
      </tr></thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800">
          <td class="p-3 font-medium">{{ u.name }}
            <span v-if="u.email_verified" class="text-emerald-500 text-xs" title="Email terverifikasi"> ✓</span>
            <span v-else class="text-amber-500 text-xs" title="Belum verifikasi email"> !</span>
          </td>
          <td class="p-3 text-gray-500 dark:text-gray-400">{{ u.email }}</td>
          <td class="p-3"><span :class="['text-[10px] font-bold px-2 py-1 rounded-full', u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400']">{{ u.role }}</span></td>
          <td class="p-3 text-xs text-gray-400">{{ fmtDay(u.created_at) }}</td>
          <td class="p-3">
            <button v-if="me && u.id !== me.id" @click="toggleRole(u.id, u.role)" class="text-xs font-semibold text-primary hover:underline">Jadikan {{ u.role === 'admin' ? 'User' : 'Admin' }}</button>
            <span v-else class="text-xs text-gray-300">(kamu)</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>`,
  computed: { me: () => store.user },
};
