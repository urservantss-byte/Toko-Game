/* Auth: login, daftar, lupa password, reset password */
const AuthView = {
  data: () => ({
    email: '', password: '', name: '', showPw: false,
    newPw: '', confirmPw: '',
    loading: false,
    notice: '', devLink: '',
    googleAvailable: false,
  }),
  computed: { page: () => store.page },
  watch: {
    page() { this.notice = ''; this.devLink = ''; }
  },
  mounted() {
    fetch('/api/settings/google-available').then(r => r.json()).then(d => { this.googleAvailable = !!d.available; }).catch(() => {});
  },
  methods: {
    async doLogin() {
      if (!this.email.trim() || !this.password) return toast('Isi email & password', false);
      this.loading = true;
      try {
        const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: this.email.trim(), password: this.password }) });
        setToken(d.token); store.user = d.user;
        toast('Halo, ' + d.user.name + '! 👋');
        go('home');
      } catch (e) {
        if (e.data && e.data.need_verification) {
          this.notice = '⚠️ <b>Email belum diverifikasi.</b><br><span class="text-xs text-gray-600 dark:text-gray-400">Cek inbox email kamu, atau kirim ulang link verifikasi di bawah.</span>';
        } else toast(e.message, false);
      } finally { this.loading = false; }
    },
    async doRegister() {
      if (!this.name.trim() || !this.email.trim() || !this.password) return toast('Lengkapi semua kolom', false);
      if (this.password.length < 6) return toast('Password minimal 6 karakter', false);
      this.loading = true;
      try {
        const d = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: this.name.trim(), email: this.email.trim(), password: this.password }) });
        this.notice = d.message || 'Pendaftaran berhasil! Cek email kamu untuk verifikasi sebelum masuk.';
        this.devLink = d.dev_link || '';
        toast('Akun dibuat ✅');
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    async doForgot() {
      if (!this.email.trim()) return toast('Isi email dulu', false);
      this.loading = true;
      try {
        const d = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: this.email.trim() }) });
        this.notice = d.message || 'Link reset dikirim.';
        this.devLink = d.dev_link || '';
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    async doResend() {
      if (!this.email.trim()) return toast('Isi email dulu', false);
      this.loading = true;
      try {
        const d = await api('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: this.email.trim() }) });
        this.notice = d.message || 'Link verifikasi dikirim ulang.';
        this.devLink = d.dev_link || '';
        toast('Link verifikasi dikirim ulang ✅');
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
    async doReset() {
      if (!this.newPw || this.newPw.length < 6) return toast('Password minimal 6 karakter', false);
      if (this.newPw !== this.confirmPw) return toast('Konfirmasi password tidak cocok', false);
      this.loading = true;
      try {
        const d = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: store.resetToken, password: this.newPw }) });
        toast(d.message || 'Password diubah ✅');
        store.resetToken = '';
        go('login');
      } catch (e) { toast(e.message, false); }
      finally { this.loading = false; }
    },
  },
  template: `
  <div class="min-h-[75vh] flex items-center justify-center px-4 py-12 relative">
    <div class="absolute -top-20 -right-20 w-80 h-80 dark:opacity-30 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    <div class="absolute -bottom-20 -left-20 w-80 h-80 dark:opacity-30 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

    <div class="w-full max-w-md relative">
      <div class="nv-modal bg-white dark:bg-nova-surface p-8">
        <div class="flex items-center gap-3 mb-7">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#7a88ff,#4a56c8);box-shadow:0 4px 14px rgba(108,124,255,.4)">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h4M8 7v4"/><circle cx="15.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="17.8" cy="12.6" r="1" fill="currentColor" stroke="none"/><path d="M7.5 5.5h9a4 4 0 014 4v5.2a2.8 2.8 0 01-5.1 1.6L13.6 14h-3.2l-1.8 2.3A2.8 2.8 0 013.5 14.7V9.5a4 4 0 014-4z"/></svg>
          </div>
          <div>
            <div class="nv-logo leading-tight">TOKOGAME</div>
            <div class="text-xs text-gray-400">Top up & voucher game</div>
          </div>
        </div>

        <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ page==='register' ? 'Buat akun baru' : page==='forgot' ? 'Lupa password?' : page==='reset' ? 'Buat password baru' : 'Masuk ke akunmu' }}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">{{ page==='register' ? 'Daftar gratis, cuma butuh semenit.' : page==='forgot' ? 'Kami kirim link reset ke emailmu.' : page==='reset' ? 'Pilih password yang kuat.' : 'Senang melihatmu kembali.' }}</p>

        <div v-if="notice" class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/25 text-amber-800 dark:text-amber-200 text-sm rounded-xl px-4 py-3 mb-5">
          <span v-html="notice"></span>
          <div v-if="devLink" class="mt-2 break-all">
            <span class="text-xs text-gray-500 dark:text-gray-400">Mode demo — link:</span><br>
            <a :href="devLink" class="text-indigo-600 underline text-xs">{{ devLink }}</a>
          </div>
          <button v-if="page==='login'" @click="doResend" :disabled="loading" class="mt-2 text-xs font-semibold text-indigo-600 underline">Kirim ulang verifikasi</button>
        </div>

        <template v-if="page==='login' || page==='register'">
          <div class="space-y-4">
            <div v-if="page==='register'">
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Nama</label>
              <input v-model="name" placeholder="Nama kamu" class="nv-input mt-1.5">
            </div>
            <div>
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input v-model="email" type="email" placeholder="nama@email.com" class="nv-input mt-1.5">
            </div>
            <div>
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div class="relative mt-1.5">
                <input v-model="password" :type="showPw ? 'text' : 'password'" :placeholder="page==='register' ? 'Min. 6 karakter' : '••••••••'" @keyup.enter="page==='login' ? doLogin() : doRegister()" class="nv-input pr-11">
                <button @click="showPw=!showPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" :title="showPw ? 'Sembunyikan' : 'Tampilkan'">
                  <svg v-if="!showPw" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.05 12.55a1 1 0 010-.1 11.4 11.4 0 0119.9 0 1 1 0 010 .1 11.4 11.4 0 01-19.9 0z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.6 5.1A11.6 11.6 0 0122 12a11.4 11.4 0 01-3.2 3.9M6.6 6.6A11.3 11.3 0 002 12a11.4 11.4 0 0019.9 0"/></svg>
                </button>
              </div>
            </div>
            <button v-if="page==='login'" @click="doLogin" :disabled="loading" class="nv-btn w-full py-3 text-sm">{{ loading ? 'Memproses...' : 'Masuk' }}</button>
            <button v-else @click="doRegister" :disabled="loading" class="nv-btn w-full py-3 text-sm">{{ loading ? 'Memproses...' : 'Daftar' }}</button>
            <div v-if="googleAvailable && (page==='login' || page==='register')" class="mt-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="flex-1 border-t border-gray-200 dark:border-nova-line"></div>
                <span class="text-xs text-gray-400">atau</span>
                <div class="flex-1 border-t border-gray-200 dark:border-nova-line"></div>
              </div>
              <a href="/api/auth/google" class="w-full flex items-center justify-center gap-2.5 border border-gray-300 dark:border-gray-600 rounded-xl py-2.5 text-sm font-semibold text-gray-700 dark:text-nova-text hover:bg-gray-50 dark:hover:bg-nova-surface2 transition">
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.6-5 3.6-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8-.1.1C3.5 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5.1l3.8-2.7z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.4 6.9l3.8 2.8c1-2.9 3.7-5 6.8-5z"/></svg>
                Lanjutkan dengan Google
              </a>
            </div>
          </div>
          <div v-if="page==='login'" class="flex justify-between text-sm mt-5">
            <a @click="go('forgot')" class="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition">Lupa password?</a>
            <a @click="go('register')" class="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700 transition">Daftar akun</a>
          </div>
          <p v-else class="text-sm text-center text-gray-500 dark:text-gray-400 mt-5">Sudah punya akun? <a @click="go('login')" class="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700 transition">Masuk</a></p>
        </template>

        <template v-if="page==='forgot'">
          <div class="space-y-4">
            <div>
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input v-model="email" type="email" placeholder="nama@email.com" @keyup.enter="doForgot" class="nv-input mt-1.5">
            </div>
            <button @click="doForgot" :disabled="loading" class="nv-btn w-full py-3 text-sm">{{ loading ? 'Mengirim...' : 'Kirim Link Reset' }}</button>
          </div>
          <p class="text-sm text-center mt-5"><a @click="go('login')" class="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition">← Kembali masuk</a></p>
        </template>

        <template v-if="page==='reset'">
          <div class="space-y-4">
            <div>
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Password baru</label>
              <input v-model="newPw" type="password" placeholder="Min. 6 karakter" class="nv-input mt-1.5">
            </div>
            <div>
              <label class="text-[13px] font-medium text-gray-700 dark:text-gray-300">Konfirmasi password</label>
              <input v-model="confirmPw" type="password" placeholder="Ulangi password" @keyup.enter="doReset" class="nv-input mt-1.5">
            </div>
            <button @click="doReset" :disabled="loading" class="nv-btn w-full py-3 text-sm">{{ loading ? 'Memproses...' : 'Reset Password' }}</button>
          </div>
        </template>
      </div>
      <p class="text-center text-xs text-gray-400 mt-6">© 2026 TokoGame</p>
    </div>
  </div>`
};
