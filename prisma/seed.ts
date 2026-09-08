/**
 * Seed BOS SYAMS — Fase 1-7
 *
 * Yang di-seed hanya data yang sudah TERKUNCI di dokumen keputusan owner:
 *   - Entity & Warehouse (Q0.2, satu masing-masing)
 *   - Process Catalog (Q1.4, sembilan proses)
 *   - Permission matrix (sheet 07_ROLE_PERMISSION)
 *   - Field policy (Q11.1)
 *   - Authority Matrix (Q10.3 — baris dibuat, threshold sengaja NULL)
 *   - System config placeholder untuk seluruh blocker terbuka
 *   - User demo untuk seluruh role internal Fase 1-7
 *
 * Yang TIDAK di-seed karena nilainya belum diberikan owner:
 *   size, garment type, warna, lokasi, carrier, supplier, material,
 *   reject category, process rate. Payment term default owner di-seed,
 *   sementara term khusus Buyer/Order tetap diisi saat konfigurasi.
 *
 * Aturan: jangan menambah data karangan ke file ini. Master data kosong adalah
 * kondisi yang benar sampai owner mengisi.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile?.(".env.local");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// ---------------------------------------------------------------------------
// Permission matrix — sumber: sheet 07_ROLE_PERMISSION
// SYSTEM_ADMIN sengaja tidak diberi APPROVE/EXECUTE bisnis apa pun (SEC-001).
// ---------------------------------------------------------------------------

type RoleCode =
  | "CEO" | "CMO_MANAGER" | "CMO_SUPPORT" | "PRODUCTION_CONTROLLER"
  | "PRODUCTION_USER" | "WAREHOUSE_PURCHASING" | "CFO" | "CHRO" | "QC" | "SYSTEM_ADMIN";

type Aksi = "VIEW" | "CREATE" | "EDIT" | "APPROVE" | "EXECUTE" | "OVERRIDE";

type Scope =
  | "ALL_COMPANY" | "DEPARTMENT" | "TEAM" | "ASSIGNED" | "PRODUCTION"
  | "INVENTORY" | "FINANCE" | "PEOPLE" | "QUALITY" | "CUSTOMER_OWN_DATA" | "SYSTEM";

const MODUL_BOS = [
  "BUYER", "ORDER", "ARTICLE", "BATCH",
  "QUOTATION", "PRODUCTION", "QC", "PACKING",
  "PROCUREMENT", "INVENTORY", "INVOICE", "PAYMENT", "SHIPMENT",
  "PORTAL", "CRM", "SAMPLE", "MAKLOON", "EMPLOYEE", "MANPOWER", "CONTROL_TOWER",
  "REVISION",
  "ORDER_CHANGE", "SLA_RULE", "DELEGATION",
  "MASTER_DATA", "TASK", "EXCEPTION", "AUDIT", "USER", "PERMISSION",
] as const;

interface AturanRole {
  role: RoleCode;
  scope: Scope;
  /** modul -> daftar aksi yang diizinkan */
  akses: Partial<Record<(typeof MODUL_BOS)[number], Aksi[]>>;
}

const MATRIKS: AturanRole[] = [
  {
    // CEO melihat semua, memutuskan exception, tidak mengerjakan transaksi harian.
    role: "CEO",
    scope: "ALL_COMPANY",
    akses: {
      BUYER: ["VIEW"], ORDER: ["VIEW"], ARTICLE: ["VIEW"], BATCH: ["VIEW"],
      QUOTATION: ["VIEW", "APPROVE", "OVERRIDE"],
      PRODUCTION: ["VIEW"], QC: ["VIEW"], PACKING: ["VIEW"],
      PROCUREMENT: ["VIEW", "APPROVE", "OVERRIDE"], INVENTORY: ["VIEW", "APPROVE", "OVERRIDE"],
      INVOICE: ["VIEW", "APPROVE", "OVERRIDE"], PAYMENT: ["VIEW", "APPROVE"], SHIPMENT: ["VIEW", "APPROVE", "OVERRIDE"],
      PORTAL: ["VIEW"], CRM: ["VIEW"], SAMPLE: ["VIEW", "APPROVE"], MAKLOON: ["VIEW", "APPROVE", "OVERRIDE"],
      EMPLOYEE: ["VIEW"], MANPOWER: ["VIEW"], CONTROL_TOWER: ["VIEW"],
      REVISION: ["VIEW", "CREATE", "EDIT"],
      ORDER_CHANGE: ["VIEW", "APPROVE", "EXECUTE"], SLA_RULE: ["VIEW", "CREATE", "EDIT"], DELEGATION: ["VIEW", "CREATE", "EDIT"],
      MASTER_DATA: ["VIEW"], TASK: ["VIEW"], AUDIT: ["VIEW"],
      EXCEPTION: ["VIEW", "APPROVE", "OVERRIDE"],
    },
  },
  {
    // Customer truth dan business priority (OPS-001).
    // EXECUTE pada ORDER = tombol SPK Release (Q5.1, authority event pertama).
    role: "CMO_MANAGER",
    scope: "DEPARTMENT",
    akses: {
      BUYER: ["VIEW", "CREATE", "EDIT"],
      ORDER: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      ARTICLE: ["VIEW", "CREATE", "EDIT"],
      QUOTATION: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      BATCH: ["VIEW"], PROCUREMENT: ["VIEW"], INVENTORY: ["VIEW"],
      INVOICE: ["VIEW"], PAYMENT: ["VIEW"], SHIPMENT: ["VIEW", "CREATE"],
      PORTAL: ["VIEW", "CREATE", "EDIT"], CRM: ["VIEW", "CREATE", "EDIT", "EXECUTE"], SAMPLE: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      MAKLOON: ["VIEW"],
      REVISION: ["VIEW", "CREATE", "EDIT"],
      ORDER_CHANGE: ["VIEW", "CREATE", "EDIT"], SLA_RULE: ["VIEW"],
      MASTER_DATA: ["VIEW"], TASK: ["VIEW", "CREATE", "EDIT"],
      EXCEPTION: ["VIEW", "CREATE"],
    },
  },
  {
    role: "CMO_SUPPORT",
    scope: "TEAM",
    akses: {
      BUYER: ["VIEW", "CREATE", "EDIT"],
      ORDER: ["VIEW"], ARTICLE: ["VIEW"],
      QUOTATION: ["VIEW", "CREATE", "EDIT"],
      INVOICE: ["VIEW"], SHIPMENT: ["VIEW"],
      PORTAL: ["VIEW"], CRM: ["VIEW", "CREATE", "EDIT"], SAMPLE: ["VIEW", "CREATE", "EDIT"],
      REVISION: ["VIEW", "CREATE", "EDIT"],
      ORDER_CHANGE: ["VIEW", "CREATE", "EDIT"], SLA_RULE: ["VIEW"],
      MASTER_DATA: ["VIEW"], TASK: ["VIEW", "CREATE", "EDIT"],
    },
  },
  {
    // Production feasibility dan execution (OPS-001).
    // EXECUTE pada BATCH = Batch Release (Q5.1, authority event kedua).
    role: "PRODUCTION_CONTROLLER",
    scope: "PRODUCTION",
    akses: {
      BUYER: ["VIEW"], ORDER: ["VIEW"], ARTICLE: ["VIEW"],
      BATCH: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      PRODUCTION: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      QC: ["VIEW"], PACKING: ["VIEW"],
      PROCUREMENT: ["VIEW", "CREATE"], INVENTORY: ["VIEW"],
      SHIPMENT: ["VIEW"],
      SAMPLE: ["VIEW"], MAKLOON: ["VIEW", "CREATE", "EDIT", "EXECUTE"], MANPOWER: ["VIEW"],
      REVISION: ["VIEW", "CREATE", "EDIT"],
      ORDER_CHANGE: ["VIEW", "APPROVE", "EXECUTE"], SLA_RULE: ["VIEW"],
      MASTER_DATA: ["VIEW"], TASK: ["VIEW", "CREATE", "EDIT"],
      EXCEPTION: ["VIEW", "CREATE"],
    },
  },
  {
    role: "PRODUCTION_USER",
    scope: "ASSIGNED",
    akses: {
      ORDER: ["VIEW"], ARTICLE: ["VIEW"],
      BATCH: ["VIEW", "EXECUTE"],
      PRODUCTION: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      INVENTORY: ["VIEW"],
      SHIPMENT: ["VIEW"],
      MAKLOON: ["VIEW", "EXECUTE"],
      TASK: ["VIEW", "EDIT"],
    },
  },
  {
    role: "WAREHOUSE_PURCHASING",
    scope: "INVENTORY",
    akses: {
      ORDER: ["VIEW"], ARTICLE: ["VIEW"], BATCH: ["VIEW"],
      PRODUCTION: ["VIEW"], PACKING: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      PROCUREMENT: ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE"],
      INVENTORY: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      INVOICE: ["VIEW"], PAYMENT: ["VIEW"], SHIPMENT: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      PORTAL: ["VIEW"], SAMPLE: ["VIEW"], MAKLOON: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      MASTER_DATA: ["VIEW", "CREATE", "EDIT"],
      TASK: ["VIEW", "EDIT"], EXCEPTION: ["VIEW", "CREATE"],
    },
  },
  {
    // Financial truth (FIN-002). Fase 5 mengaktifkan invoice, payment, dan shipment gate.
    role: "CFO",
    scope: "FINANCE",
    akses: {
      BUYER: ["VIEW", "EDIT"], ORDER: ["VIEW", "EDIT"], ARTICLE: ["VIEW"],
      BATCH: ["VIEW"],
      QUOTATION: ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE", "OVERRIDE"],
      PROCUREMENT: ["VIEW", "APPROVE"], INVENTORY: ["VIEW", "APPROVE"],
      INVOICE: ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE"],
      PAYMENT: ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE"],
      SHIPMENT: ["VIEW", "APPROVE"],
      PORTAL: ["VIEW"], CRM: ["VIEW"], SAMPLE: ["VIEW", "APPROVE"], MAKLOON: ["VIEW", "CREATE", "EDIT", "APPROVE"],
      CONTROL_TOWER: ["VIEW"],
      ORDER_CHANGE: ["VIEW", "APPROVE"], SLA_RULE: ["VIEW"],
      MASTER_DATA: ["VIEW", "CREATE", "EDIT"],
      TASK: ["VIEW", "EDIT"],
      EXCEPTION: ["VIEW", "CREATE", "APPROVE"],
    },
  },
  {
    role: "CHRO",
    scope: "PEOPLE",
    akses: {
      EMPLOYEE: ["VIEW", "CREATE", "EDIT"],
      MANPOWER: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      CONTROL_TOWER: ["VIEW"],
      SLA_RULE: ["VIEW", "CREATE", "EDIT"],
      TASK: ["VIEW", "EDIT"],
      EXCEPTION: ["VIEW", "CREATE"],
    },
  },
  {
    // Otoritas PASS/REJECT (QC-001). Modul QC menyusul di Fase 3.
    role: "QC",
    scope: "QUALITY",
    akses: {
      ORDER: ["VIEW"], ARTICLE: ["VIEW"], BATCH: ["VIEW"],
      PRODUCTION: ["VIEW"], QC: ["VIEW", "CREATE", "EDIT", "EXECUTE"],
      PACKING: ["VIEW"],
      SHIPMENT: ["VIEW"],
      SAMPLE: ["VIEW"],
      MASTER_DATA: ["VIEW"], TASK: ["VIEW", "EDIT"],
      EXCEPTION: ["VIEW", "CREATE"],
    },
  },
  {
    // SEC-001 — role teknis. Kelola user, role, konfigurasi.
    // TIDAK punya APPROVE/EXECUTE/OVERRIDE pada modul bisnis mana pun.
    role: "SYSTEM_ADMIN",
    scope: "SYSTEM",
    akses: {
      USER: ["VIEW", "CREATE", "EDIT"],
      PERMISSION: ["VIEW", "EDIT"],
      MASTER_DATA: ["VIEW", "CREATE", "EDIT"],
      PORTAL: ["VIEW"],
      AUDIT: ["VIEW"],
    },
  },
];

// ---------------------------------------------------------------------------
// Field policy — Q11.1
// Enforcement ada di lib/rbac.ts. Tabel ini yang menjadi sumbernya.
// ---------------------------------------------------------------------------

const FIELD_POLICY: {
  entitas: string; field: string; allowedRoles: RoleCode[]; catatan: string;
}[] = [
  { entitas: "Article", field: "estimatedHpp", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1 — HPP hanya CFO dan CEO" },
  { entitas: "Article", field: "actualHpp", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1" },
  { entitas: "Quotation", field: "estimatedHpp", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1" },
  { entitas: "Quotation", field: "markup", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1" },
  { entitas: "Order", field: "fxRate", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1 — FX termasuk field sensitif" },
  { entitas: "MakloonJob", field: "unitPrice", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1 — makloon cost" },
  { entitas: "MakloonJob", field: "total", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1" },
  { entitas: "Material", field: "avgCost", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1 — internal cost" },
  { entitas: "Material", field: "lastPrice", allowedRoles: ["CFO", "CEO"], catatan: "Q11.1 — internal cost" },
  { entitas: "Employee", field: "salaryLevel", allowedRoles: ["CHRO", "CEO", "CFO"], catatan: "Q9.5" },
  { entitas: "Invoice", field: "collectionNotes", allowedRoles: ["CFO", "CMO_MANAGER", "CEO"], catatan: "Q11.1" },
];

// ---------------------------------------------------------------------------
// Authority Matrix — Q10.3
// Baris dibuat supaya routing approval jalan. batasNominal SENGAJA NULL:
// selama NULL, kode tidak boleh memakai angka apa pun (TBD-02).
// ---------------------------------------------------------------------------

const AUTHORITY: { decisionType: string; approverRole: RoleCode }[] = [
  { decisionType: "SHIPMENT_OUTSTANDING", approverRole: "CEO" },
  { decisionType: "PRICE_BELOW_MINIMUM", approverRole: "CFO" },
  { decisionType: "PRICE_BELOW_MINIMUM", approverRole: "CEO" },
  { decisionType: "NEW_BUYER_CONTRACT", approverRole: "CEO" },
  { decisionType: "MAJOR_INVENTORY_ADJUSTMENT", approverRole: "CFO" },
  { decisionType: "MAJOR_INVENTORY_ADJUSTMENT", approverRole: "CEO" },
  { decisionType: "CUSTOMER_RISK_COMPENSATION", approverRole: "CEO" },
  { decisionType: "CRITICAL_PEOPLE_ISSUE", approverRole: "CEO" },
  { decisionType: "CROSS_DEPT_DEADLOCK", approverRole: "CEO" },
  { decisionType: "INVESTMENT_EXPANSION", approverRole: "CEO" },
  { decisionType: "MAJOR_CASH_PURCHASE", approverRole: "CEO" },
];

// ---------------------------------------------------------------------------
// System config — angka yang sudah dikonfirmasi owner diisi; sisanya tetap NULL.
// value NULL berarti belum diputuskan owner. Kode WAJIB memeriksa NULL dan
// menolak beroperasi, bukan memakai default diam-diam.
// ---------------------------------------------------------------------------

const CONFIG: { key: string; tipe: string; deskripsi: string; qidRef: string; value?: string }[] = [
  {
    key: "PRICING_MARKUP_MODE",
    tipe: "ENUM",
    deskripsi: "Cara menghitung harga minimum. MARKUP_ON_COST = HPP x (1+p). MARGIN_ON_PRICE = HPP / (1-p). PRI-002 dan Q3.3 belum menyebut yang mana.",
    qidRef: "B-01 / PRI-002 / Q3.3",
    value: "MARKUP_ON_COST",
  },
  {
    key: "PRICING_MARKUP_PERCENT",
    tipe: "NUMBER",
    deskripsi: "Acuan referensi internal Finance: HPP x 1,30. Harga jual final tetap manual dan configurable.",
    qidRef: "B-01 / PRI-002",
    value: "30",
  },
  {
    key: "REVENUE_RECOGNITION_TRIGGER",
    tipe: "ENUM",
    deskripsi: "Titik pengakuan Recognized Revenue: ON_INVOICE, ON_SHIPMENT, atau ON_DELIVERY. Q3.6 mewajibkan metric disimpan tapi tidak mendefinisikan trigger.",
    qidRef: "B-03 / Q3.6",
  },
  {
    key: "AUDIT_RETENTION_MONTHS",
    tipe: "NUMBER",
    deskripsi: "Lama retensi audit trail. Q11.3 melarang hard-code angka tahun tanpa policy legal.",
    qidRef: "Q11.3",
  },
  {
    key: "EVIDENCE_RETENTION_MONTHS",
    tipe: "NUMBER",
    deskripsi: "Lama retensi file evidence.",
    qidRef: "Q11.3",
  },
  {
    key: "INVENTORY_COSTING_METHOD",
    tipe: "ENUM",
    deskripsi: "Metode valuasi stok. Q1.6 merekomendasikan MOVING_AVERAGE tapi meminta CFO mengunci sebelum Actual HPP dipakai sebagai financial truth.",
    qidRef: "Q1.6",
  },
  {
    key: "BATCH_MERGE_CROSS_ARTICLE",
    tipe: "BOOLEAN",
    deskripsi: "Boleh tidaknya merge batch lintas Article. Sementara sistem menolak (false) sampai owner memutuskan.",
    qidRef: "B-10 / Q5.6",
    value: "false",
  },
  {
    key: "QC_REWORK_MAX_CYCLE",
    tipe: "NUMBER",
    deskripsi: "Maksimum siklus rework sebelum wajib disposition decision. Q7.5 menetapkan default 2 dan meminta nilai ini configurable.",
    qidRef: "Q7.5",
    value: "2",
  },
  {
    key: "QUOTATION_VALIDITY_DAYS",
    tipe: "NUMBER",
    deskripsi: "Masa berlaku quotation. Q3.5 menetapkan default 14 hari dan configurable.",
    qidRef: "Q3.5",
    value: "14",
  },
  {
    key: "ATTACHMENT_MAX_MB",
    tipe: "NUMBER",
    deskripsi: "Batas ukuran file attachment. Q11.9 menetapkan default 10 MB dan configurable.",
    qidRef: "Q11.9",
    value: "10",
  },
  {
    key: "BASE_CURRENCY",
    tipe: "STRING",
    deskripsi: "Base currency pelaporan. Q0.3 mengunci IDR.",
    qidRef: "Q0.3",
    value: "IDR",
  },
  {
    key: "FX_RATE_SOURCE",
    tipe: "ENUM",
    deskripsi: "Sumber FX rate: MANUAL_CFO atau API. Belum ditentukan owner.",
    qidRef: "Gap 3.4 no.1",
  },
];

const SEEDED_USERS: {
  username: string;
  nama: string;
  departemen: string;
  passwordEnv?: string;
  defaultPassword: string;
  roles: { role: RoleCode; scope: Scope }[];
}[] = [
  {
    username: "owner",
    nama: "Owner / CEO Syams",
    departemen: "Owner",
    passwordEnv: "SEED_OWNER_PASSWORD",
    defaultPassword: "owner123",
    roles: [{ role: "CEO", scope: "ALL_COMPANY" }],
  },
  {
    username: "cmo",
    nama: "CMO Manager",
    departemen: "Commercial",
    defaultPassword: "cmo123",
    roles: [{ role: "CMO_MANAGER", scope: "DEPARTMENT" }],
  },
  {
    username: "cmo_support",
    nama: "CMO Support",
    departemen: "Commercial",
    defaultPassword: "support123",
    roles: [{ role: "CMO_SUPPORT", scope: "TEAM" }],
  },
  {
    username: "coo",
    nama: "COO / Production Controller",
    departemen: "Production",
    defaultPassword: "coo123",
    roles: [{ role: "PRODUCTION_CONTROLLER", scope: "PRODUCTION" }],
  },
  {
    username: "production",
    nama: "Production User",
    departemen: "Production",
    defaultPassword: "prod123",
    roles: [{ role: "PRODUCTION_USER", scope: "ASSIGNED" }],
  },
  {
    username: "warehouse",
    nama: "Inventory / Purchasing",
    departemen: "Inventory",
    defaultPassword: "wh123",
    roles: [{ role: "WAREHOUSE_PURCHASING", scope: "INVENTORY" }],
  },
  {
    username: "cfo",
    nama: "Finance / CFO",
    departemen: "Finance",
    defaultPassword: "cfo123",
    roles: [{ role: "CFO", scope: "FINANCE" }],
  },
  {
    username: "chro",
    nama: "CHRO",
    departemen: "People",
    defaultPassword: "chro123",
    roles: [{ role: "CHRO", scope: "PEOPLE" }],
  },
  {
    username: "qc",
    nama: "Quality Control",
    departemen: "Quality",
    defaultPassword: "qc123",
    roles: [{ role: "QC", scope: "QUALITY" }],
  },
  {
    username: "admin",
    nama: "System Admin",
    departemen: "IT",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    defaultPassword: "admin123",
    roles: [{ role: "SYSTEM_ADMIN", scope: "SYSTEM" }],
  },
  {
    username: "lutfi",
    nama: "Lutfi Multi Role",
    departemen: "Commercial / Inventory",
    defaultPassword: "lutfi123",
    roles: [
      { role: "CMO_MANAGER", scope: "DEPARTMENT" },
      { role: "WAREHOUSE_PURCHASING", scope: "INVENTORY" },
    ],
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seed BOS Syams — Fase 1-7\n");

  // --- Entity & Warehouse (Q0.2) ---
  const entity = await prisma.entity.upsert({
    where: { kode: "SYAMS" },
    update: {},
    create: { kode: "SYAMS", nama: "Syams Garment Manufacturer" },
  });
  await prisma.warehouse.upsert({
    where: { kode: "WH-UTAMA" },
    update: {},
    create: { entityId: entity.id, kode: "WH-UTAMA", nama: "Gudang Utama" },
  });
  console.log("  Entity + Warehouse siap");

  // --- Process Catalog (Q1.4) ---
  const PROSES = [
    { kode: "CUTTING", nama: "Cutting", urutan: 1 },
    { kode: "SORTING", nama: "Sorting", urutan: 2 },
    { kode: "PRINTING", nama: "Printing", urutan: 3 },
    { kode: "EMBROIDERY", nama: "Embroidery", urutan: 4 },
    { kode: "SEWING", nama: "Sewing", urutan: 5 },
    { kode: "ACCESSORIES", nama: "Accessories", urutan: 6 },
    { kode: "QC", nama: "Quality Control", urutan: 7 },
    { kode: "PACKING", nama: "Packing", urutan: 8 },
    { kode: "SHIPMENT", nama: "Shipment", urutan: 9 },
  ] as const;

  for (const p of PROSES) {
    await prisma.processCatalog.upsert({
      where: { kode: p.kode },
      update: { nama: p.nama, urutan: p.urutan },
      create: p,
    });
  }
  console.log(`  Process Catalog: ${PROSES.length} proses`);

  // --- Permission matrix (sheet 07) ---
  let jumlahPermission = 0;
  for (const aturan of MATRIKS) {
    for (const modul of MODUL_BOS) {
      const aksiDiizinkan = aturan.akses[modul] ?? [];
      const semuaAksi: Aksi[] = ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE", "OVERRIDE"];
      for (const aksi of semuaAksi) {
        await prisma.permission.upsert({
          where: { role_modul_aksi: { role: aturan.role, modul, aksi } },
          update: { allowed: aksiDiizinkan.includes(aksi), scope: aturan.scope },
          create: {
            role: aturan.role,
            modul,
            aksi,
            scope: aturan.scope,
            allowed: aksiDiizinkan.includes(aksi),
          },
        });
        jumlahPermission++;
      }
    }
  }
  console.log(`  Permission: ${jumlahPermission} baris`);

  // --- Field policy (Q11.1) ---
  for (const fp of FIELD_POLICY) {
    await prisma.fieldPolicy.upsert({
      where: { entitas_field: { entitas: fp.entitas, field: fp.field } },
      update: { allowedRoles: fp.allowedRoles, catatan: fp.catatan },
      create: fp,
    });
  }
  console.log(`  Field policy: ${FIELD_POLICY.length} field sensitif`);

  // --- Authority matrix (Q10.3) — threshold sengaja NULL ---
  for (const a of AUTHORITY) {
    await prisma.authorityMatrix.upsert({
      where: {
        decisionType_approverRole: {
          decisionType: a.decisionType as never,
          approverRole: a.approverRole,
        },
      },
      update: {},
      create: {
        decisionType: a.decisionType as never,
        approverRole: a.approverRole,
        batasNominal: null,
      },
    });
  }
  console.log(`  Authority matrix: ${AUTHORITY.length} baris, semua threshold NULL (TBD-02)`);

  // --- System config ---
  for (const c of CONFIG) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: { deskripsi: c.deskripsi, qidRef: c.qidRef },
      create: {
        key: c.key,
        value: c.value ?? null,
        tipe: c.tipe as never,
        deskripsi: c.deskripsi,
        qidRef: c.qidRef,
      },
    });
  }
  const kosong = CONFIG.filter((c) => c.value === undefined).length;
  console.log(`  System config: ${CONFIG.length} kunci, ${kosong} masih kosong menunggu owner`);

  await prisma.paymentTerm.upsert({
    where: { kode: "DP50_BALANCE50" },
    update: {
      nama: "50% DP / 50% Balance",
      dpPersen: 50,
      dueBasis: "MILESTONE",
      dpTrigger: "BEFORE_PRODUCTION_RELEASE",
      balanceTrigger: "BEFORE_SHIPMENT_RELEASE",
      keterangan: "Default operasional owner. Term khusus Buyer/Order tetap diperbolehkan.",
    },
    create: {
      kode: "DP50_BALANCE50",
      nama: "50% DP / 50% Balance",
      dpPersen: 50,
      dueBasis: "MILESTONE",
      dpTrigger: "BEFORE_PRODUCTION_RELEASE",
      balanceTrigger: "BEFORE_SHIPMENT_RELEASE",
      keterangan: "Default operasional owner. Term khusus Buyer/Order tetap diperbolehkan.",
    },
  });
  console.log("  Payment term default: DP50_BALANCE50 (50% DP / 50% balance milestone)");

  // --- User demo seluruh role internal Fase 1-7 ---
  for (const seedUser of SEEDED_USERS) {
    const password = process.env[seedUser.passwordEnv ?? ""] || seedUser.defaultPassword;
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: { nama: seedUser.nama, departemen: seedUser.departemen },
      create: {
        nama: seedUser.nama,
        username: seedUser.username,
        passwordHash: await bcrypt.hash(password, 10),
        departemen: seedUser.departemen,
        mustChangePassword: true,
      },
    });

    for (const role of seedUser.roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: role.role } },
        update: { scope: role.scope },
        create: { userId: user.id, role: role.role, scope: role.scope },
      });
    }
  }
  console.log(`  User demo: ${SEEDED_USERS.length} akun untuk seluruh role internal Fase 1-7`);

  console.log("\nSelesai.");
  console.log("Login owner: owner / " + (process.env.SEED_OWNER_PASSWORD ? "(dari SEED_OWNER_PASSWORD)" : "owner123"));
  console.log("Login admin: admin / " + (process.env.SEED_ADMIN_PASSWORD ? "(dari SEED_ADMIN_PASSWORD)" : "admin123"));
  console.log("Daftar login lengkap ada di menu Panduan > Role & Login.");
  console.log("Ganti password setelah login pertama.\n");
  console.log("Master data sengaja kosong: size, garment type, warna, lokasi,");
  console.log("carrier, supplier, material, reject category, process rate.");
  console.log("Isi lewat menu Master Data setelah owner memberikan daftarnya.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
