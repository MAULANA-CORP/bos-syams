# BOS Syams

Business Operating System untuk Syams Garment Manufacturer. App mencakup backbone Buyer -> Order -> Article -> Size Breakdown -> Batch, RBAC, audit trail, task engine, master data, Pricing & Quotation, Production Handoff, QC Inspection, Packing, Inventory Ledger, PR -> PO -> GR, Stock Opname, Invoice, Payment, Shipment Gate, Customer Portal, CRM Pipeline, Sample Approval, Makloon, Employee, Manpower Plan, CEO Control Tower, Request Revision, Change Request, SLA Rule Engine, Delegation, dan dokumen deploy.

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

Repo ini menyediakan `.env.local` development yang mengarah ke `localhost:54320`. Untuk EasyPanel, gunakan host internal PostgreSQL seperti `client_bos-syam-db`, bukan `localhost` atau alamat publik.

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

Security note: Next.js 16 memakai `src/proxy.ts` sebagai convention resmi pengganti `middleware.ts`; build akan menampilkan `Proxy (Middleware)`. Proxy menolak halaman tanpa cookie session, membuat CSRF cookie, dan memasang security headers. Prisma 7 mengambil `DATABASE_URL` dari `prisma.config.ts`, sehingga `datasource` schema sengaja tidak menduplikasi `url`.

## Yang Sengaja Diblokir

Confirm Order memakai gate pricing/CFO approval. Order baru bisa `CONFIRMED` setelah ada Quotation `APPROVED` untuk order atau seluruh article terkait. Kalau pricing config/HPP belum lengkap, sistem tetap mengembalikan blocker `pricing_gate_blocked` atau `pricing_config_incomplete` dan mencatat percobaan confirm ke audit trail.

Fase 2 aktif di `/pricing`: Quotation draft, estimasi HPP, reference markup configurable (default owner: HPP x 1,30), final selling price manual oleh Finance/CFO, send, dan approval CFO/CEO. Reference markup bukan auto-pricing dan bukan auto-override harga final.

Fase 3 aktif di `/production-flow`: Production Handoff dengan discrepancy, QC Inspection dengan validasi `inspected = pass + reject`, dan Packing yang hanya boleh dibuat setelah QC `PASS`.

Fase 4 aktif di `/inventory`: Procurement Request, Purchase Order, Goods Receipt yang menambah inventory ledger, material issue, hard block stok negatif, dan Stock Opname dengan evidence, approval, lalu apply adjustment ke ledger.

Fase 5 aktif di `/finance` dan `/shipments`: Invoice issued, payment claim tetap `REPORTED` sampai CFO verify/reject, collection notes mengikuti field masking, shipment otomatis `BLOCKED_BY_PAYMENT` kalau invoice order belum `PAID`, dan CEO release hanya lewat exception `SHIPMENT_OUTSTANDING` yang sudah `APPROVED`.

Fase 6 aktif di `/portal-admin`, `/portal/login`, dan `/portal`: akun portal invite-only terikat Buyer ID, buyer hanya melihat order/sample/invoice/shipment/ticket miliknya, bisa approve/reject sample dan submit payment evidence sebagai `REPORTED`.

Fase 7 aktif di `/crm`, `/samples`, `/makloon`, `/people`, dan `/control-tower`: CMO Pipeline/CRM, Sample Approval internal, Makloon sent/received/closed, Employee & Manpower CHRO, dan CEO Control Tower.

Request Revision aktif di `/request-revision` untuk CEO/Owner, CMO Manager, CMO Support, dan COO/Production Controller. Request mendukung checklist verifikasi, lampiran gambar, paste screenshot dari clipboard, dan filter `Belum diperbaiki` / `Done`.

Owner workflow aktif di `/order-changes`: perubahan atau cancellation setelah release memakai impact review CMO/COO/CFO, versioning, disposition WIP/material, financial treatment, evidence, dan apply terkontrol. CEO hanya menjadi authority khusus sesuai keputusan typed, bukan generic override.

SLA dan delegasi aktif di `/sla`: SLA Rule memiliki target duration, trigger start/stop, warning threshold, owner role, escalation, working calendar, effective dates, dan version. Task dapat membuat SLA instance; status instance ON_TRACK/WARNING/OVERDUE/COMPLETED. Delegation menyimpan user asal/tujuan, scope, periode, alasan, status aktif, dan audit trail.

Master data aktual seperti size, garment type, color, location, carrier, supplier, material, reject category, dan process rate sengaja tidak diisi data karangan. Payment term default owner `DP50_BALANCE50` sudah tersedia sebagai 50% DP sebelum Production Release dan 50% balance sebelum Shipment Release; term Buyer/Order tetap configurable. Isi master resmi lewat menu Master Data setelah owner memberikan daftarnya.

## Verifikasi

```bash
npm run test
npm run build
```

## Deploy

Lihat `DEPLOY_EASYPANEL.md`.
