/* Pengaturan akun: profil, foto, password */
const SettingsView = {
  data: () => ({ name: '', pwCur: '', pwNew: '', pwNew2: '', loading: false }),
  computed: { user: () => store.user },
  mounted() { this.load(); },
  methods: {
    async load() {
      try {
        const d = await api('/api/users/me');
        store.user = d.user;
        this.name = d.user.name || '';
      } catch (e) { toast(e.message, false); }
    },
    async saveProfile() {
      if (!this.name.trim()) return toast('Nama tidak boleh kosong', false);
      try {
        const d = await api('/api/users/me', { method: 'PUT', body: JSON.stringify({ name: this.name.trim() }) });
        store.user = d.user;
        toast('Profil disimpan ✅');
      } catch (e) { toast(e.message, false); }
    },
    onAvatar(e) {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) return toast('Maksimal 2MB', false);
      const fd = new FormData();
      fd.append('avatar', f);
      fetch('/api/users/me/avatar', { method: 'POST', headers: { 'Authorization': 'Bearer ' + store.token }, body: fd })
        .then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Upload gagal');
          store.user.avatar = d.avatar;
          toast('Foto profil diperbarui 📸');
        })
        .catch(e => toast(e.message, false))
        .finally(() => { e.target.value = ''; });
    },
    async changePassword() {
      if (this.pwNew !== this.pwNew2) return toast('Password baru tidak sama', false);
      if (!this.pwNew || this.pwNew.length < 6) return toast('Password minimal 6 karakter', false);
      try {
        await api('/api/users/me/password', { method: 'POST', body: JSON.stringify({ current_password: this.pwCur, new_password: this.pwNew }) });
        this.pwCur = this.pwNew = this.pwNew2 = '';
        toast('Password berhasil diubah 🔑');
      } catch (e) { toast(e.message, false); }
    },
  },
  template: `
  <div class="max-w-2xl mx-auto px-4 py-4 space-y-4">
    <h2 class="text-xl font-bold">⚙️ Pengaturan Akun</h2>

    <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
      <h3 class="font-bold text-sm mb-4">Profil</h3>
      <div class="flex items-center gap-4 mb-4">
        <div class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-3xl shrink-0">
          <img v-if="user && user.avatar" :src="user.avatar" class="w-full h-full object-cover">
          <span v-else>👤</span>
        </div>
        <div>
          <input type="file" ref="avatarInput" accept="image/*" class="hidden" @change="onAvatar">
          <button @click="$refs.avatarInput.click()" class="text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl px-4 py-2">📸 Ganti Foto</button>
          <p class="text-[11px] text-gray-400 mt-1">Maks 2MB</p>
        </div>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Nama</label>
          <input v-model="name" class="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-200 dark:ring-violet-800">
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <div class="flex items-center gap-2 mt-1">
            <input :value="user && user.email" disabled class="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <span v-if="user" :class="['text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap', user.email_verified ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300']">
              {{ user.email_verified ? '✓ Terverifikasi' : 'Belum verifikasi' }}
            </span>
          </div>
        </div>
        <button @click="saveProfile" class="bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Simpan</button>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
      <h3 class="font-bold text-sm mb-4">🔑 Ganti Password</h3>
      <div class="space-y-3">
        <input v-model="pwCur" type="password" placeholder="Password saat ini" class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-200 dark:ring-violet-800">
        <input v-model="pwNew" type="password" placeholder="Password baru (min. 6)" class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-200 dark:ring-violet-800">
        <input v-model="pwNew2" type="password" placeholder="Ulangi password baru" class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-violet-200 dark:ring-violet-800">
        <button @click="changePassword" class="bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">Ubah Password</button>
      </div>
    </div>
  </div>`
};
