# Toko Game Digital 🎮

Toko online full-stack untuk penjualan produk digital: **akun game**, **voucher**, dan **topup**.

## Stack

- **Backend:** Node.js + Express + better-sqlite3 + bcryptjs + jsonwebtoken
- **Frontend:** Single-file SPA (`public/index.html`) — Tailwind CSS via CDN + vanilla JS
- **Database:** SQLite (`toko.db`), tabel dibuat otomatis saat start

## Cara menjalankan

```bash
cd ~/workspace/toko-game
npm install
node server.js
# atau: npm start
```

Buka **http://localhost:3000**

Environment (opsional):

| Var | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port server |
| `JWT_SECRET` | `dev-secret-change-me` | Secret JWT — **wajib diganti di production** |

## Akun demo (dibuat otomatis saat pertama start)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@toko.id` | `admin123` |
| User | `user@toko.id` | `user123` |

9 produk seed (3 akun, 3 voucher, 3 topup) ikut dibuat otomatis.

## Fitur

**Pengunjung:** katalog + pencarian keyword, filter kategori & tag chips, sorting (termurah/termahal/terbaru), detail produk, keranjang.

**User login:** checkout (Transfer BCA/Mandiri/DANA + upload bukti bayar wajib, atau Payment Gateway simulasi), lacak pesanan dengan timeline Pending → Proses → Delivery → Selesai.

**Admin:** kelola produk (tambah/edit/hapus), kelola pesanan (ubah status, lihat bukti bayar).

## API ringkas

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/products?q=&category=&tag=&sort=`, `GET /api/products/:id`, `GET /api/tags`
- `POST/PUT/DELETE /api/products[/:id]` (admin)
- `POST /api/orders`, `POST /api/orders/:id/proof` (multipart field `bukti`, maks 5MB, gambar saja)
- `GET /api/orders` (milik sendiri), `GET /api/orders/all` (admin)
- `PATCH /api/orders/:id/status` (admin)

Bukti bayar tersimpan di `uploads/` dan diserve di `/uploads/<file>`.
