/* Halaman FAQ & Cara Beli */
const FaqView = {
  data: () => ({ open: null }),
  methods: {
    toggle(i) { this.open = this.open === i ? null : i; },
  },
  template: `
  <div class="max-w-3xl mx-auto px-4 py-6">
    <h2 class="text-xl font-bold mb-1">❓ Bantuan & Cara Beli</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Belanja di {{ store.siteName }} gampang banget, ikuti langkah ini:</p>

    <!-- Cara beli bergambar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 text-center">
        <div class="text-4xl mb-2">🛍️</div>
        <div class="text-xs font-bold mb-1">1. Pilih Produk</div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400">Cari voucher / topup favoritmu di katalog</div>
      </div>
      <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 text-center">
        <div class="text-4xl mb-2">💳</div>
        <div class="text-xs font-bold mb-1">2. Bayar</div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400">Scan QRIS atau transfer, lalu upload bukti</div>
      </div>
      <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 text-center">
        <div class="text-4xl mb-2">⚡</div>
        <div class="text-xs font-bold mb-1">3. Diproses</div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400">Admin verifikasi & kirim pesananmu</div>
      </div>
      <div class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl p-4 text-center">
        <div class="text-4xl mb-2">🎉</div>
        <div class="text-xs font-bold mb-1">4. Selesai</div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400">Kode / akun dikirim, kasih ulasan ya!</div>
      </div>
    </div>

    <!-- FAQ accordion -->
    <h3 class="font-bold mb-3">Pertanyaan Umum</h3>
    <div class="space-y-2 mb-8">
      <div v-for="(f, i) in faqs" :key="i" class="bg-white dark:bg-nova-surface border border-gray-100 dark:border-nova-line rounded-2xl overflow-hidden">
        <button @click="toggle(i)" class="w-full text-left px-4 py-3.5 text-sm font-semibold flex justify-between items-center">
          {{ f.q }}<span class="text-gray-400">{{ open === i ? '▲' : '▼' }}</span>
        </button>
        <div v-if="open === i" class="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ f.a }}</div>
      </div>
    </div>

    <div class="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 text-center">
      <div class="text-sm font-semibold mb-1">Masih bingung? Lacak pesananmu di sini 👇</div>
      <button @click="go('track')" class="mt-2 bg-primary text-white text-sm font-bold rounded-xl px-6 py-2.5">🔍 Lacak Pesanan</button>
    </div>
  </div>`,
  computed: {
    faqs() {
      return [
        { q: 'Bagaimana cara membeli?', a: 'Pilih produk → klik Beli → pilih metode pembayaran (QRIS/transfer) → upload bukti bayar → tunggu admin memproses. Kode voucher / data akun akan muncul di halaman Pesanan.' },
        { q: 'Berapa lama pesanan diproses?', a: 'Rata-rata dalam beberapa menit setelah pembayaran terverifikasi. Estimasi tiap produk tertera di halaman detail produk. Kalau lewat dari 1 jam, hubungi CS via tombol WhatsApp.' },
        { q: 'Metode pembayaran apa saja yang tersedia?', a: 'QRIS (semua e-wallet & m-banking) dan transfer bank. Daftar metode aktif bisa dilihat di footer website.' },
        { q: 'Bagaimana cara melacak pesanan saya?', a: 'Buka menu "Lacak Pesanan" di footer atau halaman utama, masukkan nomor pesanan (mis: #123). Kamu juga bisa lihat semua pesanan di menu "Pesanan" setelah login.' },
        { q: 'Apakah bisa membatalkan pesanan?', a: 'Bisa, selama status masih "Menunggu" (belum diproses admin). Klik tombol "Batalkan Pesanan" di halaman Pesanan.' },
        { q: 'Saya salah memasukkan data (ID game / nomor HP), bagaimana?', a: 'Segera buat tiket komplain dari halaman Pesanan (tombol 💬 Komplain) atau hubungi CS via WhatsApp sebelum pesanan diproses.' },
        { q: 'Apakah data saya aman?', a: 'Ya. Password terenkripsi, pembayaran terverifikasi manual oleh admin, dan data pribadimu tidak dibagikan ke pihak lain.' },
      ];
    }
  }
};
