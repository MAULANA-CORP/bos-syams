"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Banknote, CheckCircle2, CircleAlert, FileText, PackageCheck, Plus, Send, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { api, optionize } from "@/lib/client-api";
import { cn, formatRupiah, formatTanggal, formatTanggalJam } from "@/lib/utils";

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
  return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />)}</div>;
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

function GateBadge({ status }: { status: string }) {
  if (status === "CLEARED") return <StatusBadge tone="good">Payment clear</StatusBadge>;
  if (status === "CEO_EXCEPTION_RELEASED_OUTSTANDING") return <StatusBadge tone="warn">CEO release</StatusBadge>;
  if (status === "OUTSTANDING") return <StatusBadge tone="bad">Outstanding</StatusBadge>;
  return <StatusBadge tone="warn">{status || "UNVERIFIED"}</StatusBadge>;
}

function statusTone(status: string) {
  if (["PAID", "VERIFIED", "READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(status)) return "good" as const;
  if (["VOID", "REJECTED", "BLOCKED_BY_PAYMENT"].includes(status)) return "bad" as const;
  if (["PARTIALLY_PAID", "OUTSTANDING", "REPORTED", "EXCEPTION_RELEASED"].includes(status)) return "warn" as const;
  return "neutral" as const;
}

export function FinancePage() {
  return (
    <>
      <PageHeader title="Finance" subtitle="Fase 5: invoice, claim payment, verifikasi CFO, collection notes, dan status invoice sebagai sumber payment gate shipment." />
      <Tabs.Root defaultValue="invoices" className="space-y-4">
        <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2">
          {[
            { value: "invoices", label: "Invoice", icon: FileText },
            { value: "payments", label: "Payment", icon: Banknote },
            { value: "collection", label: "Collection", icon: ShieldCheck },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger key={value} value={value} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted", "data-[state=active]:bg-red-700 data-[state=active]:text-white dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-zinc-950")}>
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="invoices"><InvoiceTab /></Tabs.Content>
        <Tabs.Content value="payments"><PaymentTab /></Tabs.Content>
        <Tabs.Content value="collection"><CollectionTab /></Tabs.Content>
      </Tabs.Root>
    </>
  );
}

export function ShipmentsPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["shipments"], queryFn: () => api<AnyRow[]>("/api/shipments") });
  const [form, setForm] = React.useState({ orderId: "", packingJobId: "", carrierId: "", packedQty: "", scheduledAt: "", trackingNo: "", notes: "" });
  const [release, setRelease] = React.useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: () => api("/api/shipments", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Shipment tersimpan");
      setForm({ orderId: "", packingJobId: "", carrierId: "", packedQty: "", scheduledAt: "", trackingNo: "", notes: "" });
      invalidatePhase5(qc);
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const move = useMutation({
    mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/shipments/${row.id}/status`, { method: "POST", body: JSON.stringify({ status, version: row.version, trackingNo: row.trackingNo, reason: status }) }),
    onSuccess: () => { toast.success("Status shipment diperbarui"); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const exceptionRelease = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/shipments/${row.id}/exception-release`, { method: "POST", body: JSON.stringify({ exceptionId: release[row.id] ?? "", version: row.version, reason: "CEO release shipment outstanding" }) }),
    onSuccess: () => { toast.success("Shipment dilepas via exception CEO"); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  const goodsReady = (l.packingJobs ?? []).filter((row: AnyRow) => row.status === "GOODS_READY");
  return (
    <>
      <PageHeader title="Shipment / Logistics" subtitle="Fase 5: dokumen shipment, payment gate, status shipped/delivered, dan release outstanding hanya via exception CEO." />
      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Panel>
          <h2 className="mb-4 font-semibold">Buat Shipment</h2>
          <div className="grid gap-3">
            <SearchableSelect label="Order" value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v ?? "" })} options={optionize(l.orders ?? [], (r) => r.nomor, (r) => `${r.buyer?.nama ?? "-"} · ${r.status}`)} />
            <SearchableSelect label="Packing job" value={form.packingJobId} onChange={(v) => setForm({ ...form, packingJobId: v ?? "" })} options={optionize(goodsReady, (r) => r.nomor, (r) => `${r.packedQty}/${r.qtyToPack} pcs`)} />
            <SearchableSelect label="Carrier" value={form.carrierId} onChange={(v) => setForm({ ...form, carrierId: v ?? "" })} options={optionize(l.carriers ?? [], (r) => r.nama, (r) => r.kode)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput type="number" placeholder="Packed qty" value={form.packedQty} onChange={(e) => setForm({ ...form, packedQty: e.target.value })} />
              <TextInput type="date" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <TextInput placeholder="Tracking no" value={form.trackingNo} onChange={(e) => setForm({ ...form, trackingNo: e.target.value })} />
            <TextArea placeholder="Catatan shipment" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button disabled={create.isPending} onClick={() => create.mutate()}><Truck className="mr-2 h-4 w-4" />Buat Shipment</Button>
          </div>
        </Panel>
        <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
          { key: "nomor", label: "Nomor" },
          { key: "orderId", label: "Order", render: (r) => nameById(l.orders, r.orderId) },
          { key: "carrierId", label: "Carrier", render: (r) => nameById(l.carriers, r.carrierId) },
          { key: "packedQty", label: "Qty" },
          { key: "paymentGateStatus", label: "Gate", render: (r) => <GateBadge status={r.paymentGateStatus} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge> },
          { key: "aksi", label: "Aksi", render: (r) => (
            <div className="flex min-w-72 flex-wrap gap-2">
              <GhostButton disabled={!["READY_TO_SHIP", "EXCEPTION_RELEASED"].includes(r.status)} onClick={() => move.mutate({ row: r, status: "SHIPPED" })}><Send className="mr-2 h-4 w-4" />Ship</GhostButton>
              <GhostButton disabled={r.status !== "SHIPPED"} onClick={() => move.mutate({ row: r, status: "DELIVERED" })}><PackageCheck className="mr-2 h-4 w-4" />Deliver</GhostButton>
              <TextInput className="max-w-44" placeholder="Exception ID" value={release[r.id] ?? ""} onChange={(e) => setRelease({ ...release, [r.id]: e.target.value })} />
              <GhostButton disabled={r.status !== "BLOCKED_BY_PAYMENT"} onClick={() => exceptionRelease.mutate(r)}>CEO release</GhostButton>
            </div>
          ) },
        ]} />}</Panel>
      </div>
    </>
  );
}

function InvoiceTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["invoices"], queryFn: () => api<AnyRow[]>("/api/invoices") });
  const [form, setForm] = React.useState({ orderId: "", buyerId: "", currency: "IDR", amount: "", baseAmount: "", dueDate: "", issuedAt: new Date().toISOString().slice(0, 10), collectionNotes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/invoices", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Invoice issued"); setForm({ orderId: "", buyerId: "", currency: "IDR", amount: "", baseAmount: "", dueDate: "", issuedAt: new Date().toISOString().slice(0, 10), collectionNotes: "" }); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const voidIt = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/invoices/${row.id}/void`, { method: "POST", body: JSON.stringify({ version: row.version, reason: "Void invoice" }) }),
    onSuccess: () => { toast.success("Invoice void"); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Generate Invoice</h2>
        <div className="grid gap-3">
          <SearchableSelect label="Order" value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v ?? "" })} options={optionize(l.orders ?? [], (r) => r.nomor, (r) => `${r.buyer?.nama ?? "-"} · ${r.status}`)} />
          <SearchableSelect label="Buyer" value={form.buyerId} onChange={(v) => setForm({ ...form, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.kode)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <TextInput type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
            <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <TextArea placeholder="Collection notes" value={form.collectionNotes} onChange={(e) => setForm({ ...form, collectionNotes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Issue Invoice</Button>
        </div>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "orderId", label: "Order", render: (r) => nameById(l.orders, r.orderId) },
        { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) },
        { key: "amount", label: "Amount", render: (r) => `${r.currency} ${Number(r.amount).toLocaleString("id-ID")}` },
        { key: "dueDate", label: "Due", render: (r) => formatTanggal(r.dueDate) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => <GhostButton disabled={["PAID", "VOID"].includes(r.status)} onClick={() => voidIt.mutate(r)}><Ban className="mr-2 h-4 w-4" />Void</GhostButton> },
      ]} />}</Panel>
    </div>
  );
}

function PaymentTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["payments"], queryFn: () => api<AnyRow[]>("/api/payments") });
  const [form, setForm] = React.useState({ invoiceId: "", currency: "IDR", amount: "", reportedAt: new Date().toISOString().slice(0, 10), evidenceUrl: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/payments", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Payment claim REPORTED"); setForm({ invoiceId: "", currency: "IDR", amount: "", reportedAt: new Date().toISOString().slice(0, 10), evidenceUrl: "", notes: "" }); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const decision = useMutation({
    mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/payments/${row.id}/decision`, { method: "POST", body: JSON.stringify({ status, version: row.version, reason: status === "VERIFIED" ? "CFO verified payment" : "Payment evidence rejected" }) }),
    onSuccess: () => { toast.success("Payment decision tersimpan"); invalidatePhase5(qc); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Report Payment</h2>
        <div className="grid gap-3">
          <SearchableSelect label="Invoice" value={form.invoiceId} onChange={(v) => setForm({ ...form, invoiceId: v ?? "" })} options={optionize(l.invoices ?? [], (r) => r.nomor, (r) => `${r.currency} ${Number(r.amount).toLocaleString("id-ID")} · ${r.status}`)} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <TextInput type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <TextInput type="date" value={form.reportedAt} onChange={(e) => setForm({ ...form, reportedAt: e.target.value })} />
          <TextInput placeholder="Evidence URL" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} />
          <TextArea placeholder="Catatan transfer" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Banknote className="mr-2 h-4 w-4" />Report Payment</Button>
        </div>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "invoiceId", label: "Invoice", render: (r) => nameById(l.invoices, r.invoiceId) },
        { key: "amount", label: "Amount", render: (r) => `${r.currency} ${Number(r.amount).toLocaleString("id-ID")}` },
        { key: "reportedAt", label: "Reported", render: (r) => formatTanggalJam(r.reportedAt) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => (
          <div className="flex flex-wrap gap-2">
            <GhostButton disabled={r.status !== "REPORTED"} onClick={() => decision.mutate({ row: r, status: "VERIFIED" })}><CheckCircle2 className="mr-2 h-4 w-4" />Verify</GhostButton>
            <GhostButton disabled={r.status !== "REPORTED"} onClick={() => decision.mutate({ row: r, status: "REJECTED" })}>Reject</GhostButton>
          </div>
        ) },
      ]} />}</Panel>
    </div>
  );
}

function CollectionTab() {
  const lookups = useLookups();
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => api<AnyRow[]>("/api/invoices") });
  const l = (lookups.data ?? {}) as AnyRow;
  const rows = (invoices.data ?? []).filter((row) => !["PAID", "VOID"].includes(row.status));
  const outstanding = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Panel className="h-fit">
        <p className="text-xs font-medium uppercase text-muted">Open AR</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{formatRupiah(outstanding)}</p>
        <p className="mt-1 text-sm text-muted">{rows.length} invoice belum paid atau belum void.</p>
      </Panel>
      <Panel>{invoices.isLoading ? <SkeletonRows /> : invoices.error ? <ErrorBox message={(invoices.error as Error).message} onRetry={() => invoices.refetch()} /> : <DataTable rows={rows} columns={[
        { key: "nomor", label: "Invoice" },
        { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) },
        { key: "dueDate", label: "Due", render: (r) => formatTanggal(r.dueDate) },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge> },
        { key: "collectionNotes", label: "Collection notes", render: (r) => r.collectionNotes ?? "-" },
      ]} />}</Panel>
    </div>
  );
}

function invalidatePhase5(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["lookups"] });
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["payments"] });
  qc.invalidateQueries({ queryKey: ["shipments"] });
}

function nameById(rows: AnyRow[] | undefined, id: string | null | undefined) {
  if (!id) return "-";
  const row = rows?.find((item) => item.id === id);
  return row?.nama ?? row?.nomor ?? row?.kode ?? id;
}
