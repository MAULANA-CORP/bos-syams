"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { BookOpen, CheckCircle2, CircleAlert, ClipboardList, LockKeyhole, Route, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "workflow", label: "Workflow", icon: Route },
  { value: "input", label: "Cara Isi", icon: ClipboardList },
  { value: "roles", label: "Role & Login", icon: UsersRound },
  { value: "controls", label: "Kontrol", icon: ShieldCheck },
  { value: "next", label: "Fase Berikutnya", icon: BookOpen },
] as const;

const workflow = [
  {
    area: "Customer / Buyer",
    imageFlow: "Portal customer, inquiry, status produksi, invoice, shipment.",
    appNow: "Customer Portal sudah aktif di Fase 6: login buyer, order status, sample approval, invoice, payment evidence, shipment tracking, dan ticket.",
    status: "Aktif",
  },
  {
    area: "CMO / Commercial",
    imageFlow: "Inquiry/order, breakdown article, harga, payment terms, konfirmasi order.",
    appNow: "Order, article, size breakdown, buyer ownership, CRM pipeline, sample approval, SPK Release oleh CMO, dan Quotation gate sudah aktif.",
    status: "Aktif",
  },
  {
    area: "COO / Production",
    imageFlow: "Production planning, material requirement, penjadwalan, kapasitas, eksekusi, QC.",
    appNow: "Batch planning, Batch Release, Production Handoff, discrepancy, QC Inspection, dan Makloon job sudah aktif.",
    status: "Aktif",
  },
  {
    area: "Inventory / Purchasing",
    imageFlow: "Material planning, PR, PO, GR, update stok on hand.",
    appNow: "Material Planning, PR, PO, GR, Inventory Ledger, hard block stok negatif, dan Stock Opname evidence/approval/apply aktif di Fase 4.",
    status: "Aktif",
  },
  {
    area: "Packing & Warehouse",
    imageFlow: "Packing berdasarkan QC PASS, goods ready, update warehouse stock.",
    appNow: "Packing Job dan Goods Ready aktif. Sistem menolak packing kalau belum ada QC PASS.",
    status: "Aktif",
  },
  {
    area: "Shipment / Logistics",
    imageFlow: "Shipment document, gate payment status, update status customer.",
    appNow: "Dokumen shipment, payment gate, status shipped/delivered, dan CEO exception release untuk outstanding payment sudah aktif di Fase 5.",
    status: "Aktif",
  },
  {
    area: "Finance / CFO",
    imageFlow: "Invoice, payment, AR/AP, ledger, costing dan reporting.",
    appNow: "Invoice, payment claim, verifikasi CFO, collection notes, dan status AR untuk shipment gate sudah aktif. Costing detail/ledger akuntansi penuh menyusul fase berikutnya.",
    status: "Aktif",
  },
];

const inputSteps = [
  "Login sesuai role, lalu cek TODAY untuk task dan exception yang perlu ditangani.",
  "System Admin atau role berwenang mengisi Master Data: size, garment type, warna, lokasi, supplier, material, carrier, payment term, reject category, dan process rate.",
  "CMO membuat Buyer lebih dulu supaya order punya customer truth yang jelas.",
  "CMO membuat Order, mengisi article dan size breakdown, lalu lanjut SPK Release saat data wajib sudah lengkap.",
  "Production Controller membuat Batch dari article yang sudah siap produksi dan melakukan Batch Release.",
  "Tim produksi, warehouse, finance, QC, dan people memakai Task dan Exception untuk koordinasi lintas divisi.",
  "Warehouse membuat Shipment setelah goods ready. Sistem otomatis menahan shipment kalau invoice order belum paid.",
  "CFO membuat invoice dan memverifikasi payment. Claim transfer masih REPORTED sampai CFO menekan Verify.",
  "CMO membuat Portal Account untuk buyer invite-only; buyer login di /portal/login untuk cek status, upload evidence payment, approve sample, dan kirim ticket.",
  "CMO mengelola CRM pipeline dan Sample Approval; Production/Warehouse mengelola Makloon jika proses keluar pabrik dibutuhkan.",
  "CHRO mengisi Employee dan Manpower Plan, lalu Owner melihat ringkasannya di CEO Control Tower.",
  "Owner/CEO membuka Dashboard, Audit, dan Exception untuk melihat ringkasan, risiko, dan keputusan yang perlu approval, termasuk shipment outstanding.",
  "CEO, CMO, dan COO dapat mengirim Request Revision ke developer; lampirkan screenshot, tulis checklist verifikasi, lalu pindahkan ke Done setelah perbaikan dicek.",
];

const roles = [
  {
    username: "owner",
    password: "owner123",
    role: "CEO",
    scope: "ALL_COMPANY",
    akses: "Lihat seluruh operasi, CEO Control Tower, Request Revision, approval exception owner, override tertentu, dashboard CEO.",
  },
  {
    username: "cmo",
    password: "cmo123",
    role: "CMO_MANAGER",
    scope: "DEPARTMENT",
    akses: "Buyer, order, article, quotation, CRM, sample, portal account, Request Revision, shipment view/create, SPK Release, task commercial, exception commercial.",
  },
  {
    username: "cmo_support",
    password: "support123",
    role: "CMO_SUPPORT",
    scope: "TEAM",
    akses: "Bantu input buyer, CRM, sample, Request Revision, lihat order/article/invoice/shipment, buat dan update task commercial.",
  },
  {
    username: "coo",
    password: "coo123",
    role: "PRODUCTION_CONTROLLER",
    scope: "PRODUCTION",
    akses: "Planning batch, edit batch, Batch Release, Makloon job, Request Revision, manpower view, exception produksi.",
  },
  {
    username: "production",
    password: "prod123",
    role: "PRODUCTION_USER",
    scope: "ASSIGNED",
    akses: "Lihat order/article/batch/makloon yang relevan, update task produksi.",
  },
  {
    username: "warehouse",
    password: "wh123",
    role: "WAREHOUSE_PURCHASING",
    scope: "INVENTORY",
    akses: "Master data inventory, PR/PO/GR/ledger/opname, shipment create/execute, makloon execute, task warehouse, exception material/purchasing.",
  },
  {
    username: "qc",
    password: "qc123",
    role: "QC",
    scope: "QUALITY",
    akses: "Lihat produksi, master data QC, task QC, exception quality.",
  },
  {
    username: "cfo",
    password: "cfo123",
    role: "CFO",
    scope: "FINANCE",
    akses: "Invoice, payment claim, payment verify/reject, collection notes, makloon cost, field sensitif HPP/cost, buyer/order finance fields, exception pricing/finance.",
  },
  {
    username: "chro",
    password: "chro123",
    role: "CHRO",
    scope: "PEOPLE",
    akses: "Employee data, manpower planning, task people, exception people.",
  },
  {
    username: "admin",
    password: "admin123",
    role: "SYSTEM_ADMIN",
    scope: "SYSTEM",
    akses: "Kelola user, permission, config, audit. Tidak punya approval bisnis harian.",
  },
  {
    username: "lutfi",
    password: "lutfi123",
    role: "CMO_MANAGER + WAREHOUSE_PURCHASING",
    scope: "DEPARTMENT + INVENTORY",
    akses: "Contoh akun multi-role untuk user lintas commercial dan inventory.",
  },
];

const controls = [
  {
    title: "RBAC per role",
    body: "Akses modul dan aksi diambil dari permission matrix. Tombol bisnis mengikuti role, bukan sekadar halaman terbuka.",
  },
  {
    title: "System Admin bukan approver bisnis",
    body: "Admin bisa kelola sistem, user, permission, config, dan audit, tetapi tidak diberi EXECUTE, APPROVE, atau OVERRIDE transaksi bisnis.",
  },
  {
    title: "Audit trail",
    body: "Aktivitas penting dicatat supaya owner bisa melihat siapa melakukan apa, kapan, dan pada data mana.",
  },
  {
    title: "Field sensitif",
    body: "HPP, cost, FX, salary level, dan collection notes dibatasi ke role tertentu seperti CEO, CFO, dan CHRO.",
  },
  {
    title: "Pricing gate",
    body: "Konfirmasi order ditahan kalau konfigurasi pricing minimum belum diputuskan, sehingga sistem tidak memakai angka asumsi diam-diam.",
  },
  {
    title: "Exception engine",
    body: "Keputusan lintas divisi dibuat sebagai exception dengan tipe keputusan dan approver yang jelas.",
  },
];

const nextPhases = [
  ["Inventory Costing+", "Valuasi moving average, actual HPP, dan costing variance masuk penguatan Finance/Costing berikutnya."],
  ["Production Execution+", "Detail operator per station, timer produksi, kapasitas mesin, dan progress via web/HP."],
  ["Quality Control+", "Evidence foto, recheck rework lengkap, dan dashboard defect per kategori."],
  ["Packing & Goods Ready+", "Label PDF, dokumen packing list, dan update stok finished goods warehouse."],
  ["Finance+", "AR/AP ledger akuntansi penuh, actual HPP, variance, budget actual, dan financial report."],
];

function StatusPill({ status }: { status: string }) {
  const tone = status === "Aktif" ? "good" : status === "Sebagian" ? "warn" : "neutral";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function GuidePage() {
  return (
    <div>
      <PageHeader
        title="Panduan BOS Syams"
        subtitle="Panduan kerja untuk mengisi app, memahami role login, dan membaca kecocokan Fase 1 dengan workflow BOS dari order sampai pembayaran."
      />

      <Tabs.Root defaultValue="workflow" className="space-y-5">
        <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2">
          {tabs.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted transition",
                "data-[state=active]:bg-red-700 data-[state=active]:text-white dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-zinc-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="workflow">
          <Panel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Workflow dari gambar</h2>
                <p className="mt-1 text-sm text-muted">
                  Fase 1 menjadi central database, RBAC, master data, order, article, batch, task, exception, dan audit. Fase 2-7 sudah menambah pricing/quotation, production handoff, QC, packing, inventory PR to PO to GR, stock opname, invoice, payment, shipment gate, customer portal, CRM, sample approval, makloon, employee, manpower, dan CEO Control Tower. Costing detail masih fase berikutnya.
                </p>
              </div>
              <StatusBadge tone="good">Fase 1-7 aktif bertahap</StatusBadge>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {workflow.map((item) => (
                <div key={item.area} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{item.area}</h3>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase text-muted">Di gambar</p>
                  <p className="mt-1 text-sm text-foreground">{item.imageFlow}</p>
                  <p className="mt-3 text-xs font-medium uppercase text-muted">Di app sekarang</p>
                  <p className="mt-1 text-sm text-foreground">{item.appNow}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="input">
          <Panel>
            <h2 className="text-lg font-semibold text-foreground">Urutan input tim</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {inputSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-md border border-border bg-background p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-semibold text-white dark:bg-red-500 dark:text-zinc-950">
                    {index + 1}
                  </div>
                  <p className="text-sm text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="roles">
          <Panel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Role dan akun demo</h2>
                <p className="mt-1 text-sm text-muted">
                  &quot;Operating subledger&quot; adalah subtitle sistem di sidebar. Login owner memakai role CEO.
                </p>
              </div>
              <StatusBadge tone="good">Owner tersedia: owner / owner123</StatusBadge>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-muted dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-3">Username</th>
                    <th className="px-3 py-3">Password</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Scope</th>
                    <th className="px-3 py-3">Akses utama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roles.map((role) => (
                    <tr key={role.username} className="bg-background">
                      <td className="px-3 py-3 font-medium text-foreground">{role.username}</td>
                      <td className="px-3 py-3 text-foreground">{role.password}</td>
                      <td className="px-3 py-3 text-foreground">{role.role}</td>
                      <td className="px-3 py-3 text-muted">{role.scope}</td>
                      <td className="px-3 py-3 text-foreground">{role.akses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="controls">
          <Panel>
            <h2 className="text-lg font-semibold text-foreground">Business rules & controls</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {controls.map((control) => (
                <div key={control.title} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-red-700 dark:text-red-300" />
                    <h3 className="font-semibold text-foreground">{control.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted">{control.body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="next">
          <Panel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Fase berikutnya sesuai workflow lengkap</h2>
                <p className="mt-1 text-sm text-muted">
                  Daftar ini sengaja dipisah supaya tim tahu mana yang sudah bisa dipakai sekarang dan mana yang akan dibangun setelah keputusan owner berikutnya.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CircleAlert className="h-4 w-4" />
                Menunggu scope fase lanjutan
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {nextPhases.map(([title, body]) => (
                <div key={title} className="flex gap-3 rounded-md border border-border bg-background p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
