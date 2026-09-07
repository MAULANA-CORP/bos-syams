# BOS Syams

Business Operating System untuk Syams Garment Manufacturer. Implementasi ini menuntaskan Fase 1 PRD dan mulai menjalankan Fase 2-4: pondasi auth, RBAC, audit trail, typed exception, task engine, core backbone Buyer -> Order -> Article -> Size Breakdown -> Batch, master data, Pricing & Quotation, Production Handoff, QC Inspection, Packing, Inventory Ledger, PR -> PO -> GR, shell aplikasi, dan dokumen deploy.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- Prisma 7 + PostgreSQL
- iron-session + bcryptjs
- TanStack Query v5
- Vitest

## Jalan Lokal

1. Install dependency:

```bash
npm install
```

2. Buat `.env` dari `.env.example`, lalu isi minimal:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=isi_minimal_32_karakter
```

Untuk development cepat dengan Docker:

```bash
docker compose up -d
```

Repo ini sudah menyediakan `.env.local` development yang mengarah ke `localhost:54320`.

3. Generate Prisma, migrate, dan seed:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Jalankan app:

```bash
npm run dev
```

Login demo setelah seed:

- `owner` / `owner123` - CEO / Owner
- `cmo` / `cmo123` - CMO Manager
- `cmo_support` / `support123` - CMO Support
- `coo` / `coo123` - Production Controller
- `production` / `prod123` - Production User
- `warehouse` / `wh123` - Warehouse / Purchasing
- `qc` / `qc123` - Quality Control
- `cfo` / `cfo123` - Finance / CFO
- `chro` / `chro123` - People / CHRO
- `admin` / `admin123` - System Admin, atau nilai `SEED_ADMIN_PASSWORD`
- `lutfi` / `lutfi123` - contoh user multi-role CMO + Warehouse

Panduan workflow, urutan input, dan penjelasan role ada di menu `/guide`.

## Yang Sengaja Diblokir

Confirm Order memakai gate pricing/CFO approval. Order baru bisa `CONFIRMED` setelah ada Quotation `APPROVED` untuk order atau seluruh article terkait. Kalau pricing config/HPP belum lengkap, sistem tetap mengembalikan blocker `pricing_gate_blocked` atau `pricing_config_incomplete` dan mencatat percobaan confirm ke audit trail.

Fase 2 aktif di `/pricing`: Quotation draft, minimum price, offered price, send, approve CFO/CEO, dan guard harga di bawah minimum.

Fase 3 aktif di `/production-flow`: Production Handoff dengan discrepancy, QC Inspection dengan validasi `inspected = pass + reject`, dan Packing yang hanya boleh dibuat setelah QC `PASS`.

Fase 4 aktif di `/inventory`: Procurement Request, Purchase Order, Goods Receipt yang menambah inventory ledger, material issue, dan hard block stok negatif. Stock opname tetap belum dibuka karena blocker B-11 belum diputus.

Master data seperti size, garment type, color, location, carrier, supplier, material, payment term, dan process rate sengaja tidak diisi data karangan. Isi lewat database/menu Master Data setelah owner memberi daftar resmi.

## Verifikasi

```bash
npm run test
npm run build
```

## Deploy

Lihat `DEPLOY_EASYPANEL.md`.
