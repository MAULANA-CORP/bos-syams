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

## 3. Buat App
New Service → **App** → Source: GitHub → pilih repo
- Build Method: **Dockerfile**
- Port: **3000**
- Isi semua environment variable dari `.env.example`

## 4. Migrasi + seed (sekali saja)
Setelah container jalan, buka Terminal service app:
```bash
npx prisma migrate deploy
npm run db:seed
```
Dockerfile sudah membawa Prisma CLI, `tsx`, schema, dan generated client supaya dua command di atas bisa jalan dari terminal container EasyPanel.

## 5. Domain
EasyPanel → Domains → `namaapp.maulanacorp.my.id` → arahkan ke port 3000.

## 6. Login pertama
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
