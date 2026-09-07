"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { api, optionize } from "@/lib/client-api";
import { formatTanggal } from "@/lib/utils";

type AnyRow = { id: string; [key: string]: any };

function useLookups() {
  return useQuery({ queryKey: ["lookups"], queryFn: () => api<AnyRow>("/api/lookups") });
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Panel className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4" />
          {message}
        </div>
        {onRetry && <GhostButton onClick={onRetry}>Coba lagi</GhostButton>}
      </div>
    </Panel>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />)}
    </div>
  );
}

function DataTable({ rows, columns }: { rows: AnyRow[]; columns: { key: string; label: string; render?: (row: AnyRow) => React.ReactNode }[] }) {
  if (rows.length === 0) return <EmptyState title="Belum ada data">Tambahkan data pertama dari form di halaman ini.</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>{columns.map((c) => <th key={c.key} className="px-3 py-3 text-left font-medium text-muted">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              {columns.map((c) => <td key={c.key} className="px-3 py-3 text-foreground">{c.render ? c.render(row) : String(row[c.key] ?? "-")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TodayPage() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api<AnyRow[]>("/api/orders") });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<AnyRow[]>("/api/tasks") });
  const exceptions = useQuery({ queryKey: ["exceptions"], queryFn: () => api<AnyRow[]>("/api/exceptions") });
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => api<AnyRow[]>("/api/batches") });
  const loading = orders.isLoading || tasks.isLoading || exceptions.isLoading || batches.isLoading;
  const error = orders.error || tasks.error || exceptions.error || batches.error;

  return (
    <>
      <PageHeader title="TODAY" subtitle="Aksi yang perlu dikerjakan hari ini. Dashboard analisis dipisah supaya layar ini tetap operasional." />
      {error && <ErrorBox message={(error as Error).message} onRetry={() => { orders.refetch(); tasks.refetch(); exceptions.refetch(); batches.refetch(); }} />}
      {loading ? <SkeletonRows /> : (
        <div className="grid gap-4 lg:grid-cols-4">
          <Metric label="Order draft" value={orders.data?.filter((o) => o.status === "DRAFT").length ?? 0} />
          <Metric label="Task open" value={tasks.data?.filter((t) => ["OPEN", "IN_PROGRESS", "BLOCKED", "OVERDUE"].includes(t.status)).length ?? 0} />
          <Metric label="Exception review" value={exceptions.data?.filter((e) => ["SUBMITTED", "UNDER_REVIEW"].includes(e.status)).length ?? 0} />
          <Metric label="Batch planned" value={batches.data?.filter((b) => b.status === "PLANNED").length ?? 0} />
          <Panel className="lg:col-span-2">
            <h2 className="mb-3 font-semibold">Order terbaru</h2>
            <MiniList rows={orders.data ?? []} primary={(r) => r.nomor} secondary={(r) => `${r.buyer?.nama ?? "-"} · ${r.status}`} />
          </Panel>
          <Panel className="lg:col-span-2">
            <h2 className="mb-3 font-semibold">Task aktif</h2>
            <MiniList rows={(tasks.data ?? []).filter((t) => t.status !== "DONE")} primary={(r) => r.judul} secondary={(r) => `${r.status} · due ${formatTanggal(r.due)}`} />
          </Panel>
        </div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Panel>
  );
}

function MiniList({ rows, primary, secondary }: { rows: AnyRow[]; primary: (row: AnyRow) => string; secondary: (row: AnyRow) => string }) {
  if (rows.length === 0) return <EmptyState title="Kosong">Belum ada item yang perlu ditampilkan.</EmptyState>;
  return <div className="space-y-2">{rows.slice(0, 6).map((r) => <div key={r.id} className="rounded-md border border-border p-3"><p className="font-medium">{primary(r)}</p><p className="text-sm text-muted">{secondary(r)}</p></div>)}</div>;
}

export function BuyersPage() {
  const qc = useQueryClient();
  const buyers = useQuery({ queryKey: ["buyers"], queryFn: () => api<AnyRow[]>("/api/buyers") });
  const [form, setForm] = React.useState({ kode: "", nama: "", company: "", country: "", status: "PROSPECT", holdReason: "" });
  const mutation = useMutation({
    mutationFn: () => api("/api/buyers", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Buyer tersimpan"); setForm({ kode: "", nama: "", company: "", country: "", status: "PROSPECT", holdReason: "" }); qc.invalidateQueries({ queryKey: ["buyers"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <>
      <PageHeader title="Buyer" subtitle="Buyer status BLACKLIST diblokir server-side saat membuat Order baru." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel>
          <h2 className="mb-4 font-semibold">Tambah Buyer</h2>
          <FormGrid>
            <TextInput placeholder="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} />
            <TextInput placeholder="Nama buyer" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            <TextInput placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <TextInput placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <SearchableSelect label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v ?? "PROSPECT" })} options={["PROSPECT", "ACTIVE", "HOLD", "BLACKLIST"].map((s) => ({ value: s, label: s }))} />
            {form.status === "HOLD" && <TextArea placeholder="Hold reason" value={form.holdReason} onChange={(e) => setForm({ ...form, holdReason: e.target.value })} />}
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Buyer</Button>
          </FormGrid>
        </Panel>
        <Panel>
          {buyers.isLoading ? <SkeletonRows /> : buyers.error ? <ErrorBox message={(buyers.error as Error).message} onRetry={() => buyers.refetch()} /> : (
            <DataTable rows={buyers.data ?? []} columns={[
              { key: "kode", label: "Kode" },
              { key: "nama", label: "Nama" },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "BLACKLIST" ? "bad" : r.status === "HOLD" ? "warn" : "good"}>{r.status}</StatusBadge> },
              { key: "orders", label: "Order", render: (r) => r._count?.orders ?? 0 },
            ]} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function OrdersPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api<AnyRow[]>("/api/orders") });
  const [order, setOrder] = React.useState({ entityId: "", buyerId: "", tipe: "PRODUCTION", tanggalOrder: new Date().toISOString().slice(0, 10), currency: "IDR" });
  const [article, setArticle] = React.useState({ orderId: "", nama: "", garmentTypeId: "", colorId: "", qty: 0, businessPriority: 3, sizes: [{ sizeId: "", qty: 0 }] });
  const saveOrder = useMutation({
    mutationFn: () => api("/api/orders", { method: "POST", body: JSON.stringify(order) }),
    onSuccess: () => { toast.success("Order draft tersimpan"); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const saveArticle = useMutation({
    mutationFn: () => api("/api/articles", { method: "POST", body: JSON.stringify(article) }),
    onSuccess: () => { toast.success("Article tersimpan"); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const confirm = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/orders/${row.id}/confirm`, { method: "POST", body: JSON.stringify({ version: row.version }) }),
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <>
      <PageHeader title="Order & Article" subtitle="Order dibuat Draft. Confirm Order sengaja diblokir oleh pricing/CFO gate sampai Fase 2." />
      <div className="grid gap-4 xl:grid-cols-[360px_360px_1fr]">
        <Panel>
          <h2 className="mb-4 font-semibold">Buat Order</h2>
          <FormGrid>
            <SearchableSelect label="Entity" value={order.entityId} onChange={(v) => setOrder({ ...order, entityId: v ?? "" })} options={optionize(l.entities ?? [], (r) => r.nama, (r) => r.kode)} />
            <SearchableSelect label="Buyer" value={order.buyerId} onChange={(v) => setOrder({ ...order, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.status)} />
            <SearchableSelect label="Tipe" value={order.tipe} onChange={(v) => setOrder({ ...order, tipe: v ?? "PRODUCTION" })} options={["SAMPLE", "PRODUCTION", "SAMPLE_PRODUCTION"].map((s) => ({ value: s, label: s }))} />
            <TextInput type="date" value={order.tanggalOrder} onChange={(e) => setOrder({ ...order, tanggalOrder: e.target.value })} />
            <Button disabled={saveOrder.isPending} onClick={() => saveOrder.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Order</Button>
          </FormGrid>
        </Panel>
        <Panel>
          <h2 className="mb-4 font-semibold">Tambah Article</h2>
          <FormGrid>
            <SearchableSelect label="Order" value={article.orderId} onChange={(v) => setArticle({ ...article, orderId: v ?? "" })} options={optionize(orders.data ?? [], (r) => r.nomor, (r) => r.buyer?.nama)} />
            <TextInput placeholder="Nama Article" value={article.nama} onChange={(e) => setArticle({ ...article, nama: e.target.value })} />
            <SearchableSelect label="Garment Type" value={article.garmentTypeId} onChange={(v) => setArticle({ ...article, garmentTypeId: v ?? "" })} options={optionize(l.garmentTypes ?? [], (r) => r.nama, (r) => r.kode)} />
            <SearchableSelect label="Color" value={article.colorId} onChange={(v) => setArticle({ ...article, colorId: v ?? "" })} options={optionize(l.colors ?? [], (r) => r.nama, (r) => r.kode)} />
            <TextInput type="number" placeholder="Qty Article" value={article.qty} onChange={(e) => setArticle({ ...article, qty: Number(e.target.value) })} />
            {article.sizes.map((line, index) => (
              <div className="grid grid-cols-[1fr_96px] gap-2" key={index}>
                <SearchableSelect value={line.sizeId} onChange={(v) => {
                  const next = [...article.sizes]; next[index] = { ...line, sizeId: v ?? "" }; setArticle({ ...article, sizes: next });
                }} options={optionize(l.sizes ?? [], (r) => r.kode)} placeholder="Size" />
                <TextInput type="number" value={line.qty} onChange={(e) => {
                  const next = [...article.sizes]; next[index] = { ...line, qty: Number(e.target.value) }; setArticle({ ...article, sizes: next });
                }} />
              </div>
            ))}
            <GhostButton onClick={() => setArticle({ ...article, sizes: [...article.sizes, { sizeId: "", qty: 0 }] })}>Tambah size</GhostButton>
            <Button disabled={saveArticle.isPending} onClick={() => saveArticle.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Article</Button>
          </FormGrid>
        </Panel>
        <Panel>
          {orders.isLoading ? <SkeletonRows /> : orders.error ? <ErrorBox message={(orders.error as Error).message} onRetry={() => orders.refetch()} /> : (
            <DataTable rows={orders.data ?? []} columns={[
              { key: "nomor", label: "Nomor" },
              { key: "buyer", label: "Buyer", render: (r) => r.buyer?.nama ?? "-" },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "DRAFT" ? "warn" : "good"}>{r.status}</StatusBadge> },
              { key: "articles", label: "Article", render: (r) => r.articles?.length ?? 0 },
              { key: "aksi", label: "Aksi", render: (r) => <GhostButton onClick={() => confirm.mutate(r)}><Send className="mr-2 h-4 w-4" />Confirm</GhostButton> },
            ]} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function BatchesPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const batches = useQuery({ queryKey: ["batches"], queryFn: () => api<AnyRow[]>("/api/batches") });
  const [form, setForm] = React.useState({ articleId: "", plannedQty: 0, locationId: "" });
  const create = useMutation({
    mutationFn: () => api("/api/batches", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Batch tersimpan"); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const release = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/batches/${row.id}/release`, { method: "POST", body: JSON.stringify({ version: row.version }) }),
    onSuccess: () => { toast.success("Batch released"); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <>
      <PageHeader title="Batch" subtitle="Batch Release dipisah dari SPK Release dan hanya milik Production Controller." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel>
          <h2 className="mb-4 font-semibold">Buat Batch</h2>
          <FormGrid>
            <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
            <SearchableSelect label="Location" value={form.locationId} onChange={(v) => setForm({ ...form, locationId: v ?? "" })} options={optionize(l.locations ?? [], (r) => r.nama, (r) => r.tipe)} />
            <TextInput type="number" placeholder="Planned qty" value={form.plannedQty} onChange={(e) => setForm({ ...form, plannedQty: Number(e.target.value) })} />
            <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Batch</Button>
          </FormGrid>
        </Panel>
        <Panel>
          {batches.isLoading ? <SkeletonRows /> : batches.error ? <ErrorBox message={(batches.error as Error).message} onRetry={() => batches.refetch()} /> : (
            <DataTable rows={batches.data ?? []} columns={[
              { key: "nomor", label: "Nomor" },
              { key: "article", label: "Article", render: (r) => r.article?.nama ?? "-" },
              { key: "plannedQty", label: "Plan" },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "PLANNED" ? "warn" : "good"}>{r.status}</StatusBadge> },
              { key: "aksi", label: "Aksi", render: (r) => <GhostButton disabled={r.status !== "PLANNED"} onClick={() => release.mutate(r)}><CheckCircle2 className="mr-2 h-4 w-4" />Release</GhostButton> },
            ]} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function TasksPage() {
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<AnyRow[]>("/api/tasks") });
  return (
    <>
      <PageHeader title="Task" subtitle="Menutup task tidak mengubah state bisnis. Business action tetap harus dilakukan di modul asalnya." />
      <Panel>{tasks.isLoading ? <SkeletonRows /> : tasks.error ? <ErrorBox message={(tasks.error as Error).message} onRetry={() => tasks.refetch()} /> : <DataTable rows={tasks.data ?? []} columns={[
        { key: "judul", label: "Judul" },
        { key: "sourceEntitas", label: "Source" },
        { key: "assignee", label: "Owner", render: (r) => r.assignee?.nama ?? r.assigneeRole ?? "-" },
        { key: "due", label: "Due", render: (r) => formatTanggal(r.due) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "DONE" ? "good" : r.status === "BLOCKED" ? "bad" : "warn"}>{r.status}</StatusBadge> },
      ]} />}</Panel>
    </>
  );
}

export function ExceptionsPage() {
  const exceptions = useQuery({ queryKey: ["exceptions"], queryFn: () => api<AnyRow[]>("/api/exceptions") });
  return (
    <>
      <PageHeader title="Exception" subtitle="Typed exception saja. Tidak ada generic override endpoint." />
      <Panel>{exceptions.isLoading ? <SkeletonRows /> : exceptions.error ? <ErrorBox message={(exceptions.error as Error).message} onRetry={() => exceptions.refetch()} /> : <DataTable rows={exceptions.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "tipe", label: "Tipe" },
        { key: "masalah", label: "Masalah" },
        { key: "decisionOwnerRole", label: "Owner" },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" ? "good" : r.status === "REJECTED" ? "bad" : "warn"}>{r.status}</StatusBadge> },
      ]} />}</Panel>
    </>
  );
}

const masterResources = [
  "garment-types", "size-sets", "sizes", "colors", "locations", "process-catalog",
  "process-rates", "materials", "suppliers", "payment-terms", "carriers", "reject-categories", "system-configs",
];

export function MasterDataPage() {
  const [resource, setResource] = React.useState("garment-types");
  const rows = useQuery({ queryKey: ["master-data", resource], queryFn: () => api<AnyRow[]>(`/api/master-data/${resource}`) });
  return (
    <>
      <PageHeader title="Master Data" subtitle="Katalog admin-controlled. Nilai TBD tetap kosong sampai owner mengisi." />
      <Panel className="mb-4">
        <SearchableSelect value={resource} onChange={(v) => setResource(v ?? "garment-types")} options={masterResources.map((r) => ({ value: r, label: r }))} />
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <JsonTable rows={rows.data ?? []} />}</Panel>
    </>
  );
}

function JsonTable({ rows }: { rows: AnyRow[] }) {
  if (rows.length === 0) return <EmptyState title="Belum ada master data">Ini valid untuk placeholder PRD yang masih menunggu owner.</EmptyState>;
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);
  return <DataTable rows={rows} columns={keys.map((key) => ({ key, label: key, render: (r) => typeof r[key] === "object" ? JSON.stringify(r[key]) : String(r[key] ?? "-") }))} />;
}

export function AdminPage() {
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => api<AnyRow[]>("/api/admin/users") });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => api<AnyRow[]>("/api/audit") });
  return (
    <>
      <PageHeader title="Admin" subtitle="System Admin mengelola teknis, tapi tetap bukan business authority." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">User</h2>
          {users.isLoading ? <SkeletonRows /> : users.error ? <ErrorBox message={(users.error as Error).message} onRetry={() => users.refetch()} /> : <DataTable rows={users.data ?? []} columns={[
            { key: "nama", label: "Nama" },
            { key: "username", label: "Username" },
            { key: "roles", label: "Role", render: (r) => r.roles?.map((x: AnyRow) => x.role).join(", ") ?? "-" },
          ]} />}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Audit Trail</h2>
          {audit.isLoading ? <SkeletonRows /> : audit.error ? <ErrorBox message={(audit.error as Error).message} onRetry={() => audit.refetch()} /> : <DataTable rows={audit.data ?? []} columns={[
            { key: "createdAt", label: "Waktu", render: (r) => formatTanggal(r.createdAt) },
            { key: "aksi", label: "Aksi" },
            { key: "entitasType", label: "Entitas" },
            { key: "actor", label: "Actor", render: (r) => r.actor?.nama ?? r.actorId },
          ]} />}
        </Panel>
      </div>
    </>
  );
}

export function ReportsPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Analysis-first view. Metric Fase 2-7 tetap placeholder sampai modul sumber datanya aktif." />
      <Panel>
        <EmptyState title="Dashboard analisis belum aktif">TODAY sudah tersedia untuk operasi harian Fase 1.</EmptyState>
      </Panel>
    </>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3">{children}</div>;
}
