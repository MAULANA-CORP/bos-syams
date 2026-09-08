"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { BadgeCheck, BookOpen, CheckCircle2, CircleAlert, ClipboardList, LockKeyhole, MenuSquare, Route, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";
import type { UserRoleCode } from "@/lib/domain-types";
import { ROLE_LABELS, formatRoleSummary, getVisibleNavigationItems, type PermissionSummary } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type MeResponse = {
  nama: string;
  username: string;
  roles: UserRoleCode[];
  permissions: PermissionSummary[];
};

type RoleGuide = {
  username: string;
  scope: string;
  summary: string;
  workflow: string[];
  inputs: string[];
  controls: string[];
};

const guideTabs = [
  { value: "workflow", label: "Alur saya", icon: Route },
  { value: "input", label: "Cara isi", icon: ClipboardList },
  { value: "roles", label: "Role saya", icon: UsersRound },
  { value: "controls", label: "Kontrol akses", icon: ShieldCheck },
  { value: "decisions", label: "Keputusan Owner", icon: BadgeCheck, roles: ["CEO", "CMO_MANAGER", "PRODUCTION_CONTROLLER", "CFO", "SYSTEM_ADMIN"] satisfies UserRoleCode[] },
  { value: "next", label: "Roadmap", icon: BookOpen, roles: ["CEO", "SYSTEM_ADMIN"] satisfies UserRoleCode[] },
] as const;

const roleGuides: Record<UserRoleCode, RoleGuide> = {
  CEO: {
    username: "owner",
    scope: "ALL_COMPANY",
    summary: "Memantau operasi end-to-end, mengambil keputusan lintas divisi, dan melepas exception sesuai authority owner.",
    workflow: [
      "Buka TODAY untuk melihat task, exception, dan request yang perlu keputusan owner.",
      "Pantau CEO Tower untuk ringkasan order, produksi, shipment, finance, people, dan risiko lintas divisi.",
      "Review Change Request atau cancellation besar sebelum perubahan diterapkan ke order released.",
      "Kelola SLA & Delegation untuk memastikan keputusan tidak berhenti saat PIC berhalangan.",
      "Kirim Request Revision jika ada masukan langsung ke developer.",
    ],
    inputs: [
      "Isi keputusan approval atau rejection dengan alasan yang bisa diaudit.",
      "Gunakan Exception untuk kasus lintas divisi, bukan mengubah transaksi harian langsung.",
      "Pastikan owner decision yang masih TBD hanya diisi setelah angka bisnis resmi tersedia.",
    ],
    controls: [
      "CEO tidak diarahkan menjadi operator transaksi harian.",
      "Authority owner berlaku untuk exception, order change, SLA, dan kontrol strategis.",
      "Data sensitif seperti HPP dan salary tetap dibatasi sesuai matrix.",
    ],
  },
  CMO_MANAGER: {
    username: "cmo",
    scope: "DEPARTMENT",
    summary: "Mengelola buyer, order, quotation, portal customer, CRM, sample, shipment visibility, dan request revisi commercial.",
    workflow: [
      "Buat Buyer sebelum membuat Order supaya data customer rapi dari awal.",
      "Buat Order dan Article, lengkapi size breakdown, lalu lakukan SPK Release saat data wajib sudah siap.",
      "Kelola Pricing/Quotation dan update statusnya sesuai approval.",
      "Pantau Sample, CRM pipeline, portal account, dan status shipment ke customer.",
      "Ajukan Change Request saat order released butuh revisi atau cancellation.",
    ],
    inputs: [
      "Isi data buyer, order, article, size breakdown, due date, dan payment term sesuai dokumen customer.",
      "Gunakan Portal Admin hanya untuk buyer yang benar-benar akan diberi akses invite-only.",
      "Tutup loop ke customer lewat CRM, Sample, Shipment, Task, dan Exception.",
    ],
    controls: [
      "CMO Manager punya ruang create/edit commercial, tetapi HPP dan field cost tetap dibatasi.",
      "SPK Release menjadi gerbang sebelum produksi berjalan.",
      "Perubahan setelah release wajib lewat Change Request.",
    ],
  },
  CMO_SUPPORT: {
    username: "cmo_support",
    scope: "TEAM",
    summary: "Membantu input commercial: buyer, quotation, CRM, sample, portal customer, task, dan request revisi.",
    workflow: [
      "Bantu CMO melengkapi buyer, order reference, quotation draft, CRM follow-up, dan sample approval.",
      "Update task commercial yang menjadi tanggung jawab tim.",
      "Ajukan Request Revision jika ada temuan UI/data dari proses input.",
    ],
    inputs: [
      "Pastikan data customer dan artikel tidak dobel sebelum membuat record baru.",
      "Isi catatan follow-up CRM dan sample dengan bahasa operasional yang jelas.",
      "Gunakan Change Request hanya untuk perubahan order released yang memang perlu approval.",
    ],
    controls: [
      "CMO Support tidak melihat menu finance, people, inventory penuh, atau admin.",
      "Aksi approval bisnis tetap berada di manager/owner/finance sesuai matrix.",
      "Password demo tidak ditampilkan di panduan role.",
    ],
  },
  PRODUCTION_CONTROLLER: {
    username: "coo",
    scope: "PRODUCTION",
    summary: "Mengendalikan planning produksi, batch release, handoff proses, makloon, SLA produksi, dan review dampak order change.",
    workflow: [
      "Buat Batch dari article yang sudah siap produksi.",
      "Release batch setelah kapasitas, material, dan prioritas produksi jelas.",
      "Kelola Production Handoff antar proses serta pantau WIP.",
      "Review dampak produksi untuk Change Request dan cancellation.",
      "Ajukan Request Revision untuk perbaikan workflow produksi.",
    ],
    inputs: [
      "Isi batch, process, location, qty handoff, dan catatan discrepancy dengan teliti.",
      "Gunakan Makloon saat proses keluar pabrik perlu dicatat sebagai job terpisah.",
      "Hubungkan task produksi ke SLA bila pekerjaan punya target waktu.",
    ],
    controls: [
      "COO/Production Controller tidak masuk menu finance atau admin.",
      "Batch release dan handoff memakai version check.",
      "Change Request produksi harus menyimpan impact dan disposition WIP.",
    ],
  },
  PRODUCTION_USER: {
    username: "production",
    scope: "ASSIGNED",
    summary: "Menjalankan update produksi harian, handoff pekerjaan, task assigned, dan makloon execution yang relevan.",
    workflow: [
      "Lihat batch dan pekerjaan produksi yang perlu diproses.",
      "Update handoff dari proses ke proses berikutnya sesuai qty aktual.",
      "Kerjakan task produksi dan tandai progress setelah selesai.",
    ],
    inputs: [
      "Isi qty aktual, lokasi, proses tujuan, dan notes bila ada selisih.",
      "Laporkan kendala produksi melalui Task atau Exception.",
      "Jangan mengubah pricing, finance, atau master data resmi.",
    ],
    controls: [
      "Production User fokus pada execution, bukan approval.",
      "Aksesnya tidak membuka buyer, finance, people, atau admin.",
      "Data tetap diaudit per user individual.",
    ],
  },
  WAREHOUSE_PURCHASING: {
    username: "warehouse",
    scope: "INVENTORY",
    summary: "Mengelola PR, PO, GR, stok, packing/goods ready, shipment, makloon inventory, dan master data logistik.",
    workflow: [
      "Cek kebutuhan material, buat Procurement Request, lalu lanjut PO dan Goods Receipt.",
      "Update inventory ledger melalui penerimaan, issue material, dan stock opname.",
      "Kelola packing/goods ready serta buat shipment saat payment gate terpenuhi.",
      "Tangani exception material, purchasing, warehouse, atau shipment.",
    ],
    inputs: [
      "Isi supplier, warehouse, material, qty, UOM, tanggal kebutuhan, dan evidence opname secara lengkap.",
      "Pastikan stok tidak menjadi negatif sebelum issue material.",
      "Gunakan shipment status untuk memberi update operasional ke customer lewat sistem.",
    ],
    controls: [
      "Warehouse tidak melihat menu buyer, pricing, finance penuh, people, atau admin.",
      "Stock opname perlu approval/apply sesuai permission.",
      "Shipment tetap mengikuti gate pembayaran.",
    ],
  },
  CFO: {
    username: "cfo",
    scope: "FINANCE",
    summary: "Mengelola pricing final, invoice, payment, AR visibility, collection note, dan review finance untuk change/exception.",
    workflow: [
      "Validasi quotation dan pricing config yang menjadi keputusan finance.",
      "Buat invoice dari order, catat due date, dan kelola collection notes.",
      "Verifikasi atau reject payment claim berdasarkan evidence.",
      "Review dampak finansial pada Change Request atau cancellation.",
    ],
    inputs: [
      "Isi final selling price, invoice amount, payment evidence, due date, dan catatan collection sesuai bukti.",
      "Gunakan Master Data hanya untuk konfigurasi finance yang memang resmi.",
      "Pastikan revenue recognition yang masih TBD tidak diisi dengan asumsi.",
    ],
    controls: [
      "CFO dapat melihat field cost/HPP yang disembunyikan dari role operasional lain.",
      "Payment claim tetap REPORTED sampai diverifikasi CFO.",
      "Shipment bisa ditahan oleh payment gate.",
    ],
  },
  CHRO: {
    username: "chro",
    scope: "PEOPLE",
    summary: "Mengelola employee, manpower planning, SLA people, task HR, dan exception people.",
    workflow: [
      "Isi Employee Data dan Manpower Plan untuk kebutuhan produksi.",
      "Pantau task people dan exception terkait manpower atau isu karyawan.",
      "Bantu konfigurasi SLA yang berhubungan dengan ownership dan escalation.",
    ],
    inputs: [
      "Isi NIK, nama, departemen, role title, status, dan manpower plan per tanggal.",
      "Gunakan salary level hanya untuk kebutuhan terbatas sesuai permission.",
      "Catat isu people sebagai Exception bila butuh keputusan lintas divisi.",
    ],
    controls: [
      "CHRO tidak melihat menu commercial, inventory, finance transaksi, atau admin.",
      "Salary level dibatasi untuk CHRO, CEO, dan CFO.",
      "Manpower plan menjadi bahan ringkasan owner.",
    ],
  },
  QC: {
    username: "qc",
    scope: "QUALITY",
    summary: "Fokus pada QC inspection, pass/reject, sample quality, task QC, dan exception kualitas.",
    workflow: [
      "Buka Produksi untuk QC Inspection dan keputusan PASS/REJECT.",
      "Cek Sample untuk status approval yang butuh perhatian quality.",
      "Gunakan Task untuk pekerjaan QC harian.",
      "Laporkan reject berulang atau kendala quality lewat Exception.",
    ],
    inputs: [
      "Pilih batch, article, size, reject category, inspected qty, pass qty, reject qty, dan notes.",
      "Pastikan hanya QC PASS yang lanjut ke packing.",
      "Gunakan evidence/notes quality saat ada keputusan reject atau rework.",
    ],
    controls: [
      "QC tidak menampilkan Buyer, Order, Batch planning, Pricing, Inventory, Finance, People, Master Data, atau Admin di sidebar.",
      "QC punya authority PASS/REJECT pada modul QC, bukan approval finance atau shipment release.",
      "Menu panduan hanya menjelaskan pekerjaan QC.",
    ],
  },
  SYSTEM_ADMIN: {
    username: "admin",
    scope: "SYSTEM",
    summary: "Mengelola user, permission, master data sistem, audit, dan konfigurasi teknis tanpa approval bisnis harian.",
    workflow: [
      "Kelola user aktif, role, permission, dan audit trail dari menu Admin.",
      "Rawat Master Data resmi sesuai keputusan owner.",
      "Pastikan konfigurasi deployment dan environment tetap sesuai panduan operasional.",
    ],
    inputs: [
      "Buat user dengan role yang tepat, lalu cek menu yang muncul sesuai role tersebut.",
      "Isi master data resmi hanya dari sumber yang sudah disetujui owner.",
      "Gunakan audit trail untuk menelusuri perubahan penting.",
    ],
    controls: [
      "System Admin bukan business authority untuk approval transaksi.",
      "Admin tidak melihat menu kerja commercial, QC, warehouse, finance, atau people kecuali diberi role bisnis tambahan.",
      "Password tidak pernah dipublikasikan di halaman panduan.",
    ],
  },
};

const ownerDecisions = [
  ["Sudah dikunci", "Harga jual final manual oleh Finance/CFO; HPP x 1,30 menjadi reference internal yang configurable."],
  ["Sudah dikunci", "Payment term default 50% DP sebelum Production Release dan 50% balance sebelum Shipment Release. Term Buyer/Order dapat berbeda."],
  ["Sudah dikunci", "Change Request dan cancellation wajib impact review; histori versi, evidence, disposition WIP, dan perlakuan finansial dipertahankan."],
  ["Sudah dikunci", "Batch tidak boleh merge lintas Article; split, rework, dan replacement memakai lineage parent-child."],
  ["Sudah dikunci", "SLA Rule configurable dan versioned, terhubung ke Task Engine, Notification, Morning Priority, dan Dashboard."],
  ["Masih TBD", "Trigger revenue recognition, authority threshold, master data resmi, dan target go-live belum diisi sampai owner memberikan keputusan."],
];

const nextPhases = [
  ["Inventory Costing+", "Valuasi moving average, actual HPP, dan costing variance masuk penguatan Finance/Costing berikutnya."],
  ["Production Execution+", "Detail operator per station, timer produksi, kapasitas mesin, dan progress via web/HP."],
  ["Quality Control+", "Evidence foto, recheck rework lengkap, dan dashboard defect per kategori."],
  ["Packing & Goods Ready+", "Label PDF, dokumen packing list, dan update stok finished goods warehouse."],
  ["Finance+", "AR/AP ledger akuntansi penuh, actual HPP, variance, budget actual, dan financial report."],
];

function hasAnyRole(roles: UserRoleCode[], allowed?: readonly UserRoleCode[]) {
  if (!allowed) return true;
  return allowed.some((role) => roles.includes(role));
}

export function GuidePage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<MeResponse>("/api/auth/me"), refetchOnMount: false });

  if (me.isPending) {
    return (
      <div>
        <PageHeader title="Panduan BOS Syams" subtitle="Memuat panduan sesuai role login." />
        <Panel>
          <p className="text-sm text-muted">Memuat akses pengguna...</p>
        </Panel>
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div>
        <PageHeader title="Panduan BOS Syams" subtitle="Panduan belum bisa dibuka." />
        <Panel className="border-red-300 bg-red-50 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          Sesi tidak valid. Silakan login ulang.
        </Panel>
      </div>
    );
  }

  const roles = me.data.roles;
  const guides = roles.map((role) => ({ role, ...roleGuides[role] })).filter((guide) => guide.summary);
  const visibleMenus = getVisibleNavigationItems({ roles, permissions: me.data.permissions });
  const tabs = guideTabs.filter((tab) => hasAnyRole(roles, "roles" in tab ? tab.roles : undefined));

  return (
    <div>
      <PageHeader
        title={`Panduan ${formatRoleSummary(roles)}`}
        subtitle={`Login: ${me.data.username}. Isi panduan ini hanya menampilkan area kerja untuk role yang sedang aktif.`}
      />

      <Tabs.Root defaultValue={tabs[0]?.value ?? "workflow"} className="space-y-5">
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
                <h2 className="text-lg font-semibold text-foreground">Alur kerja role ini</h2>
                <p className="mt-1 text-sm text-muted">Panduan mengikuti role login. Role lain tidak ditampilkan di halaman ini.</p>
              </div>
              <StatusBadge tone="good">Role aktif: {formatRoleSummary(roles)}</StatusBadge>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {guides.map((guide) => (
                <div key={guide.role} className="rounded-md border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{ROLE_LABELS[guide.role]}</h3>
                      <p className="mt-1 text-xs uppercase text-muted">{guide.scope}</p>
                    </div>
                    <StatusBadge tone="good">Aktif</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{guide.summary}</p>
                  <div className="mt-4 space-y-2">
                    {guide.workflow.map((item) => (
                      <div key={item} className="flex gap-2 text-sm text-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="input">
          <Panel>
            <h2 className="text-lg font-semibold text-foreground">Urutan input untuk role ini</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {guides.flatMap((guide) => guide.inputs.map((step, index) => (
                <div key={`${guide.role}-${step}`} className="flex gap-3 rounded-md border border-border bg-background p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-semibold text-white dark:bg-red-500 dark:text-zinc-950">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted">{ROLE_LABELS[guide.role]}</p>
                    <p className="mt-1 text-sm text-foreground">{step}</p>
                  </div>
                </div>
              )))}
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="roles">
          <Panel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Role login saya</h2>
                <p className="mt-1 text-sm text-muted">Password tidak ditampilkan di aplikasi. Admin mengatur reset password dari area sistem.</p>
              </div>
              <StatusBadge tone="good">{me.data.nama}</StatusBadge>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-muted dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-3">Username</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Scope</th>
                    <th className="px-3 py-3">Area kerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {guides.map((guide) => (
                    <tr key={guide.role} className="bg-background">
                      <td className="px-3 py-3 font-medium text-foreground">{guide.username}</td>
                      <td className="px-3 py-3 text-foreground">{ROLE_LABELS[guide.role]}</td>
                      <td className="px-3 py-3 text-muted">{guide.scope}</td>
                      <td className="px-3 py-3 text-foreground">{guide.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="controls">
          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <Panel>
              <div className="flex items-center gap-2">
                <MenuSquare className="h-4 w-4 text-red-700 dark:text-red-300" />
                <h2 className="text-lg font-semibold text-foreground">Menu yang muncul</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleMenus.map((item) => (
                  <span key={item.href} className="rounded-md border border-border bg-background px-2.5 py-1 text-sm text-foreground">
                    {item.label}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-lg font-semibold text-foreground">Batasan role</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {guides.flatMap((guide) => guide.controls.map((control) => (
                  <div key={`${guide.role}-${control}`} className="rounded-md border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-red-700 dark:text-red-300" />
                      <h3 className="font-semibold text-foreground">{ROLE_LABELS[guide.role]}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted">{control}</p>
                  </div>
                )))}
              </div>
            </Panel>
          </div>
        </Tabs.Content>

        {hasAnyRole(roles, ["CEO", "CMO_MANAGER", "PRODUCTION_CONTROLLER", "CFO", "SYSTEM_ADMIN"]) && (
          <Tabs.Content value="decisions">
            <Panel className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Keputusan owner yang sudah diterapkan</h2>
                <p className="mt-1 text-sm text-muted">Tab ini hanya tampil untuk role leadership dan system admin.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ownerDecisions.map(([status, body]) => (
                  <div key={body} className="rounded-md border border-border bg-background p-4">
                    <StatusBadge tone={status === "Sudah dikunci" ? "good" : "warn"}>{status}</StatusBadge>
                    <p className="mt-3 text-sm text-foreground">{body}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </Tabs.Content>
        )}

        {hasAnyRole(roles, ["CEO", "SYSTEM_ADMIN"]) && (
          <Tabs.Content value="next">
            <Panel className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Roadmap internal</h2>
                  <p className="mt-1 text-sm text-muted">Tab ini hanya tampil untuk Owner/CEO dan System Admin.</p>
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
        )}
      </Tabs.Root>
    </div>
  );
}
