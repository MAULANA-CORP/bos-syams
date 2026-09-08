# Deploy ke EasyPanel

## 1. Buat PostgreSQL
EasyPanel → Services → New Service → **PostgreSQL**.
Catat host, port, user, password, nama database.
Connection string: `postgresql://USER:PASSWORD@HOST:5432/DATABASE`
Pakai **host internal**, bukan alamat publik.

## 2. Push ke GitHub
```bash
git init && git add . && git commit -m "initial commit"
git remote add origin <url-repo>
git branch -M main
git push -u origin main
```
Pastikan `.env` **tidak** ikut ter-commit (cek `.gitignore`).

## 3. Environment App
Isi environment variable berikut di EasyPanel. Jangan commit file `.env` ke repository.

```env
DATABASE_URL=postgres://postgres:PASSWORD@client_bos-syam-db:5432/client?sslmode=disable
SESSION_SECRET=<random minimal 32 karakter>
NODE_ENV=production
APP_BASE_URL=https://namaapp.maulanacorp.my.id
NEXT_PUBLIC_APP_NAME=BOS Syams
SESSION_COOKIE_NAME=bos_syams_session
SEED_ADMIN_PASSWORD=admin123
SEED_ADMIN_EMAIL=admin
SEED_OWNER_PASSWORD=owner123
APP_MODE=mock
SHOPEE_REGION=ID
SHOPEE_BASE_URL=https://partner.shopeemobile.com
SHOPEE_REDIRECT_URI=https://namaapp.maulanacorp.my.id/api/shopee/callback
```

Google OAuth, Telegram, AI, dan credential Shopee lain boleh dikosongkan sampai integrasinya benar-benar diaktifkan. Template lengkap ada di `.env.example`.

## 4. Buat App
New Service → **App** → Source: GitHub → pilih repo
- Build Method: **Dockerfile**
- Port: **3000**
- Isi semua environment variable dari `.env.example`

## 5. Migrasi + seed
Setiap container start otomatis menjalankan `prisma migrate deploy` sebelum Next.js start. Dockerfile menunggu PostgreSQL siap dan retry sampai 30 kali. Setelah deploy pertama, buka Terminal service app untuk seed:
```bash
npm run db:seed
```
Dockerfile membawa Prisma CLI, config, migration, schema, dan generated client.

## 6. Domain
EasyPanel → Domains → `namaapp.maulanacorp.my.id` → arahkan ke port 3000.

## 7. Login pertama
- Username: `admin`
- Password: `admin123` (atau isi `SEED_ADMIN_PASSWORD`)
- Ganti password setelah masuk.

## Update berikutnya
Push ke GitHub → EasyPanel → Deploy.
Kalau schema berubah, jalankan lagi `npx prisma migrate deploy`.

## Kalau bermasalah
| Gejala | Cek |
|---|---|
| Build gagal di `prisma generate` | Blok `generator` di `schema.prisma` |
| Runtime error koneksi DB | `DATABASE_URL` pakai host internal? |
| Login gagal terus | Sudah jalan `npm run db:seed`? |
| Google OAuth error `redirect_uri_mismatch` | URI di Google Console harus sama persis |
| Halaman blank | Cek log container, biasanya env kurang |
