# Cara Deploy TokoGame (Link Permanen)

> Kenapa bukan Vercel? Vercel itu serverless — database SQLite (file) dan
> folder upload gambar bakal hilang tiap server "tidur". Butuh platform
> yang servernya jalan terus + disk permanen. Pilih salah satu di bawah.

## 0. Upload ke GitHub (sekali saja)

```bash
cd toko-game
git init
git add .
git commit -m "TokoGame v1"
# buat repo baru di github.com (jangan centang README), lalu:
git remote add origin https://github.com/USERNAME/toko-game.git
git push -u origin main
```

File sensitif (`toko.db`, `uploads/`, `.log`) sudah dikecualikan via `.gitignore`.

## 1. Deploy ke Railway (paling gampang) — https://railway.app

1. Login Railway pakai akun GitHub
2. **New Project → Deploy from GitHub repo** → pilih repo toko-game
3. Tambah **Volume**: Settings → Volumes → New Volume, mount path `/data`
4. Tambah Variables:
   - `DB_PATH` = `/data/toko.db`
   - `UPLOAD_PATH` = `/data/uploads`
   - (opsional SMTP) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
5. Railway kasih domain permanen, misal `toko-game.up.railway.app`
6. Cron auto-complete: tambah service cron `0 */6 * * *` atau jalankan manual berkala

## 2. Deploy ke Fly.io (ada free tier) — https://fly.io

```bash
# install flyctl, lalu login
fly auth login
fly launch          # pilih region sin (Singapore)
fly volumes create toko_data --size 1 --region sin
fly deploy
```
`fly.toml` sudah siap (volume `/data`, env `DB_PATH`/`UPLOAD_PATH`).
Dapat domain permanen: `https://toko-game.fly.dev`.

## 3. Deploy ke Render — https://render.com

1. New → Web Service → pilih repo GitHub
2. `render.yaml` sudah ada — Render otomatis baca (disk 1GB di `/data`)
3. Tambah env SMTP di dashboard bila perlu

## 4. VPS (paling bebas, ~Rp75rb/bln)

```bash
# di VPS (Ubuntu)
git clone https://github.com/USERNAME/toko-game.git
cd toko-game && npm install
npm install -g pm2
pm2 start server.js --name toko-game
pm2 save && pm2 startup
```
Opsional: pasang Nginx + domain sendiri + HTTPS gratis (Certbot).

## 5. Setelah deploy (wajib)

1. Buka URL permanen → login admin `admin@toko.id` / `admin123`
2. **Ganti password admin** (menu Profil)
3. Tab ⚙️ Dashboard: isi QRIS, nomor WA CS, SMTP email, Google Client ID/Secret
4. **Redirect URI Google**: `[url-permanen]/api/auth/google/callback`
   (cukup diset SEKALI karena URL tidak berubah lagi ✅)
5. Upload ulang produk & banner (tab 🛍️ Produk dan 🎨 Banner)

## 6. Jalankan lokal (tanpa deploy)

```bash
npm install
node server.js   # http://localhost:3000
```

## 7. Catatan

- Database = file SQLite (`toko.db`, atau `/data/toko.db` di server).
  Backup = copy file itu.
- Env yang didukung: `PORT`, `DB_PATH`, `UPLOAD_PATH`,
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
  `BASE_URL`.
