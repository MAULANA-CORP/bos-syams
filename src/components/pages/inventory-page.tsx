"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, ClipboardCheck, ClipboardList, PackagePlus, Plus, ReceiptText, Send, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { api, optionize } from "@/lib/client-api";
import { cn, formatTanggal } from "@/lib/utils";

type AnyRow = { id: string; [key: string]: any };

function useLookups() {
  return useQuery({ queryKey: ["lookups"], queryFn: () => api<AnyRow>("/api/lookups") });
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Panel className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
          <CircleAlert className="h-4 w-4" />
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

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3">{children}</div>;
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

export function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory & Purchasing" subtitle="Fase 4: material planning, PR ke PO ke GR, ledger stok, dan hard block stok negatif." />
      <Tabs.Root defaultValue="pr" className="space-y-4">
        <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2">
          {[
            { value: "pr", label: "PR", icon: ClipboardList },
            { value: "po", label: "PO", icon: ReceiptText },
            { value: "gr", label: "GR", icon: PackagePlus },
            { value: "issue", label: "Issue", icon: Send },
            { value: "opname", label: "Opname", icon: ClipboardCheck },
            { value: "ledger", label: "Ledger", icon: Warehouse },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger key={value} value={value} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted", "data-[state=active]:bg-red-700 data-[state=active]:text-white dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-zinc-950")}>
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="pr"><ProcurementRequestTab /></Tabs.Content>
        <Tabs.Content value="po"><PurchaseOrderTab /></Tabs.Content>
        <Tabs.Content value="gr"><GoodsReceiptTab /></Tabs.Content>
        <Tabs.Content value="issue"><InventoryIssueTab /></Tabs.Content>
        <Tabs.Content value="opname"><StockOpnameTab /></Tabs.Content>
        <Tabs.Content value="ledger"><InventoryLedgerTab /></Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function ProcurementRequestTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["procurement-requests"], queryFn: () => api<AnyRow[]>("/api/procurement-requests") });
  const [form, setForm] = React.useState({ articleId: "", materialId: "", qtyNeeded: "", uom: "", neededBy: "", approverRole: "WAREHOUSE_PURCHASING", reason: "" });
  const create = useMutation({
    mutationFn: () => api("/api/procurement-requests", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("PR tersimpan"); setForm({ articleId: "", materialId: "", qtyNeeded: "", uom: "", neededBy: "", approverRole: "WAREHOUSE_PURCHASING", reason: "" }); qc.invalidateQueries({ queryKey: ["procurement-requests"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const status = useMutation({
    mutationFn: ({ row, next }: { row: AnyRow; next: string }) => api(`/api/procurement-requests/${row.id}/status`, { method: "POST", body: JSON.stringify({ status: next, version: row.version, reason: next }) }),
    onSuccess: () => { toast.success("Status PR diperbarui"); qc.invalidateQueries({ queryKey: ["procurement-requests"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Material Planning / PR</h2>
        <FormGrid>
          <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
          <SearchableSelect label="Material" value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v ?? "" })} options={optionize(l.materials ?? [], (r) => r.nama, (r) => `${r.kode} · ${r.uom}`)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="number" placeholder="Qty needed" value={form.qtyNeeded} onChange={(e) => setForm({ ...form, qtyNeeded: e.target.value })} />
            <TextInput placeholder="UOM" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} />
          </div>
          <TextInput type="date" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />
          <TextArea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan PR</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "materialId", label: "Material", render: (r) => nameById(l.materials, r.materialId) },
        { key: "qtyNeeded", label: "Qty", render: (r) => `${r.qtyNeeded ?? "-"} ${r.uom ?? ""}` },
        { key: "neededBy", label: "Needed", render: (r) => formatTanggal(r.neededBy) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" ? "good" : r.status === "CANCELLED" ? "bad" : "warn"}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => <div className="flex flex-wrap gap-2"><GhostButton disabled={r.status !== "REQUESTED"} onClick={() => status.mutate({ row: r, next: "APPROVED" })}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</GhostButton><GhostButton disabled={r.status !== "REQUESTED"} onClick={() => status.mutate({ row: r, next: "CANCELLED" })}>Cancel</GhostButton></div> },
      ]} />}</Panel>
    </div>
  );
}

function PurchaseOrderTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["purchase-orders"], queryFn: () => api<AnyRow[]>("/api/purchase-orders") });
  const [form, setForm] = React.useState({ procurementRequestId: "", supplierId: "", currency: "IDR", total: "", orderedAt: new Date().toISOString().slice(0, 10), expectedAt: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/purchase-orders", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("PO tersimpan"); setForm({ procurementRequestId: "", supplierId: "", currency: "IDR", total: "", orderedAt: new Date().toISOString().slice(0, 10), expectedAt: "", notes: "" }); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); qc.invalidateQueries({ queryKey: ["procurement-requests"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  const approvedPr = (l.procurementRequests ?? []).filter((row: AnyRow) => row.status === "APPROVED");
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Purchase Order</h2>
        <FormGrid>
          <SearchableSelect label="Approved PR" value={form.procurementRequestId} onChange={(v) => setForm({ ...form, procurementRequestId: v ?? "" })} options={optionize(approvedPr, (r) => r.nomor, (r) => `${nameById(l.materials, r.materialId)} · ${r.qtyNeeded} ${r.uom}`)} />
          <SearchableSelect label="Supplier" value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v ?? "" })} options={optionize(l.suppliers ?? [], (r) => r.nama, (r) => r.kode)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <TextInput type="number" placeholder="Total" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="date" value={form.orderedAt} onChange={(e) => setForm({ ...form, orderedAt: e.target.value })} />
            <TextInput type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} />
          </div>
          <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Buat PO</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "supplierId", label: "Supplier", render: (r) => nameById(l.suppliers, r.supplierId) },
        { key: "total", label: "Total", render: (r) => r.total ? `${r.currency} ${Number(r.total).toLocaleString("id-ID")}` : "-" },
        { key: "expectedAt", label: "ETA", render: (r) => formatTanggal(r.expectedAt) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "RECEIVED" ? "good" : "warn"}>{r.status}</StatusBadge> },
      ]} />}</Panel>
    </div>
  );
}

function GoodsReceiptTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["goods-receipts"], queryFn: () => api<AnyRow[]>("/api/goods-receipts") });
  const [form, setForm] = React.useState({ purchaseOrderId: "", materialId: "", warehouseId: "", qtyReceived: "", uom: "", receivedAt: new Date().toISOString().slice(0, 10), notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/goods-receipts", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("GR tersimpan dan ledger stok bertambah"); setForm({ purchaseOrderId: "", materialId: "", warehouseId: "", qtyReceived: "", uom: "", receivedAt: new Date().toISOString().slice(0, 10), notes: "" }); qc.invalidateQueries({ queryKey: ["goods-receipts"] }); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); qc.invalidateQueries({ queryKey: ["inventory-ledger"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  const orderedPo = (l.purchaseOrders ?? []).filter((row: AnyRow) => row.status === "ORDERED");
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Goods Receipt</h2>
        <FormGrid>
          <SearchableSelect label="PO" value={form.purchaseOrderId} onChange={(v) => setForm({ ...form, purchaseOrderId: v ?? "" })} options={optionize(orderedPo, (r) => r.nomor, (r) => nameById(l.suppliers, r.supplierId))} />
          <SearchableSelect label="Material" value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v ?? "" })} options={optionize(l.materials ?? [], (r) => r.nama, (r) => `${r.kode} · ${r.uom}`)} />
          <SearchableSelect label="Warehouse" value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v ?? "" })} options={optionize(l.warehouses ?? [], (r) => r.nama, (r) => r.kode)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="number" placeholder="Qty received" value={form.qtyReceived} onChange={(e) => setForm({ ...form, qtyReceived: e.target.value })} />
            <TextInput placeholder="UOM" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} />
          </div>
          <TextInput type="date" value={form.receivedAt} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
          <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><PackagePlus className="mr-2 h-4 w-4" />Terima Barang</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "materialId", label: "Material", render: (r) => nameById(l.materials, r.materialId) },
        { key: "warehouseId", label: "Warehouse", render: (r) => nameById(l.warehouses, r.warehouseId) },
        { key: "qtyReceived", label: "Qty", render: (r) => `${r.qtyReceived ?? "-"} ${r.uom ?? ""}` },
        { key: "receivedAt", label: "Tanggal", render: (r) => formatTanggal(r.receivedAt) },
      ]} />}</Panel>
    </div>
  );
}

function InventoryIssueTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const [form, setForm] = React.useState({ materialId: "", warehouseId: "", qtyOut: "", sourceType: "ProductionIssue", sourceId: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/inventory-issues", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Issue material tersimpan"); setForm({ materialId: "", warehouseId: "", qtyOut: "", sourceType: "ProductionIssue", sourceId: "", notes: "" }); qc.invalidateQueries({ queryKey: ["inventory-ledger"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <Panel className="max-w-xl">
      <h2 className="mb-4 font-semibold">Issue Material</h2>
      <FormGrid>
        <SearchableSelect label="Material" value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v ?? "" })} options={optionize(l.materials ?? [], (r) => r.nama, (r) => `${r.kode} · ${r.uom}`)} />
        <SearchableSelect label="Warehouse" value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v ?? "" })} options={optionize(l.warehouses ?? [], (r) => r.nama, (r) => r.kode)} />
        <TextInput type="number" placeholder="Qty out" value={form.qtyOut} onChange={(e) => setForm({ ...form, qtyOut: e.target.value })} />
        <TextInput placeholder="Source ID" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} />
        <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button disabled={create.isPending} onClick={() => create.mutate()}><Send className="mr-2 h-4 w-4" />Issue Material</Button>
      </FormGrid>
    </Panel>
  );
}

function StockOpnameTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["stock-opnames"], queryFn: () => api<AnyRow[]>("/api/stock-opnames") });
  const [form, setForm] = React.useState({
    materialId: "",
    warehouseId: "",
    countedQty: "",
    evidenceUrl: "",
    reason: "",
    countedAt: new Date().toISOString().slice(0, 10),
  });
  const create = useMutation({
    mutationFn: () => api("/api/stock-opnames", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Stock opname submitted");
      setForm({ materialId: "", warehouseId: "", countedQty: "", evidenceUrl: "", reason: "", countedAt: new Date().toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const decision = useMutation({
    mutationFn: ({ row, next }: { row: AnyRow; next: string }) => api(`/api/stock-opnames/${row.id}/decision`, { method: "POST", body: JSON.stringify({ status: next, version: row.version, reason: next === "APPROVED" ? "Approved stock opname" : "Rejected stock opname" }) }),
    onSuccess: () => {
      toast.success("Keputusan stock opname tersimpan");
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const apply = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/stock-opnames/${row.id}/apply`, { method: "POST", body: JSON.stringify({ version: row.version, reason: "Apply stock opname adjustment" }) }),
    onSuccess: () => {
      toast.success("Adjustment stock opname applied");
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      qc.invalidateQueries({ queryKey: ["inventory-ledger"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Stock Opname</h2>
        <FormGrid>
          <SearchableSelect label="Material" value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v ?? "" })} options={optionize(l.materials ?? [], (r) => r.nama, (r) => `${r.kode} · ${r.uom}`)} />
          <SearchableSelect label="Warehouse" value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v ?? "" })} options={optionize(l.warehouses ?? [], (r) => r.nama, (r) => r.kode)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="number" placeholder="Counted qty" value={form.countedQty} onChange={(e) => setForm({ ...form, countedQty: e.target.value })} />
            <TextInput type="date" value={form.countedAt} onChange={(e) => setForm({ ...form, countedAt: e.target.value })} />
          </div>
          <TextInput placeholder="Evidence URL" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} />
          <TextArea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><ClipboardCheck className="mr-2 h-4 w-4" />Submit Opname</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "materialId", label: "Material", render: (r) => nameById(l.materials, r.materialId) },
        { key: "warehouseId", label: "Warehouse", render: (r) => nameById(l.warehouses, r.warehouseId) },
        { key: "systemQty", label: "System" },
        { key: "countedQty", label: "Counted" },
        { key: "differenceQty", label: "Diff" },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPLIED" ? "good" : r.status === "REJECTED" ? "bad" : r.status === "APPROVED" ? "warn" : "neutral"}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => (
          <div className="flex flex-wrap gap-2">
            <GhostButton disabled={r.status !== "SUBMITTED"} onClick={() => decision.mutate({ row: r, next: "APPROVED" })}>Approve</GhostButton>
            <GhostButton disabled={r.status !== "SUBMITTED"} onClick={() => decision.mutate({ row: r, next: "REJECTED" })}>Reject</GhostButton>
            <GhostButton disabled={r.status !== "APPROVED"} onClick={() => apply.mutate(r)}>Apply</GhostButton>
          </div>
        ) },
      ]} />}</Panel>
    </div>
  );
}

function InventoryLedgerTab() {
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["inventory-ledger"], queryFn: () => api<AnyRow[]>("/api/inventory-ledger") });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
      { key: "createdAt", label: "Waktu", render: (r) => formatTanggal(r.createdAt) },
      { key: "materialId", label: "Material", render: (r) => nameById(l.materials, r.materialId) },
      { key: "warehouseId", label: "Warehouse", render: (r) => nameById(l.warehouses, r.warehouseId) },
      { key: "movement", label: "Movement", render: (r) => <StatusBadge tone={r.movement === "GR" ? "good" : r.movement === "ISSUE" ? "warn" : "neutral"}>{r.movement}</StatusBadge> },
      { key: "qtyIn", label: "In" },
      { key: "qtyOut", label: "Out" },
      { key: "balanceAfter", label: "Balance" },
      { key: "sourceType", label: "Source" },
    ]} />}</Panel>
  );
}

function nameById(rows: AnyRow[] | undefined, id: string | null | undefined) {
  if (!id) return "-";
  const row = rows?.find((item) => item.id === id);
  return row?.nama ?? row?.nomor ?? id;
}
