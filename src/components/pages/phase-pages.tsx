"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Factory, PackageCheck, Plus, ReceiptText, Send, ShieldCheck } from "lucide-react";
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

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export function PricingPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const quotations = useQuery({ queryKey: ["quotations"], queryFn: () => api<AnyRow[]>("/api/quotations") });
  const [form, setForm] = React.useState({
    buyerId: "",
    orderId: "",
    articleId: "",
    currency: "IDR",
    estimatedHpp: "",
    markupPercent: "",
    offeredPrice: "",
    validUntil: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: () => api("/api/quotations", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Quotation tersimpan");
      setForm({ buyerId: "", orderId: "", articleId: "", currency: "IDR", estimatedHpp: "", markupPercent: "", offeredPrice: "", validUntil: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const status = useMutation({
    mutationFn: ({ row, next }: { row: AnyRow; next: string }) => api(`/api/quotations/${row.id}/status`, { method: "POST", body: JSON.stringify({ status: next, version: row.version, reason: next }) }),
    onSuccess: () => {
      toast.success("Status quotation diperbarui");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const l = (lookups.data ?? {}) as AnyRow;

  return (
    <>
      <PageHeader title="Pricing & Quotation" subtitle="Fase 2: HPP, markup, minimum price, quotation, dan gate harga sebelum order confirmed." />
      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-red-700 dark:text-red-300" />
            <h2 className="font-semibold">Buat Quotation</h2>
          </div>
          <FormGrid>
            <SearchableSelect label="Buyer" value={form.buyerId} onChange={(v) => setForm({ ...form, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.status)} />
            <SearchableSelect label="Order" value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v ?? "" })} options={optionize(l.orders ?? [], (r) => r.nomor, (r) => `${r.buyer?.nama ?? "-"} · ${r.status}`)} />
            <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              <TextInput type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextInput type="number" placeholder="Estimated HPP" value={form.estimatedHpp} onChange={(e) => setForm({ ...form, estimatedHpp: e.target.value })} />
              <TextInput type="number" placeholder="Markup %" value={form.markupPercent} onChange={(e) => setForm({ ...form, markupPercent: e.target.value })} />
            </div>
            <TextInput type="number" placeholder="Offered price" value={form.offeredPrice} onChange={(e) => setForm({ ...form, offeredPrice: e.target.value })} />
            <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Quotation</Button>
          </FormGrid>
        </Panel>

        <Panel>
          {quotations.isLoading ? <SkeletonRows /> : quotations.error ? <ErrorBox message={(quotations.error as Error).message} onRetry={() => quotations.refetch()} /> : (
            <DataTable rows={quotations.data ?? []} columns={[
              { key: "nomor", label: "Nomor" },
              { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" ? "good" : r.status === "REJECTED" ? "bad" : r.status === "DRAFT" ? "warn" : "neutral"}>{r.status}</StatusBadge> },
              { key: "estimatedHpp", label: "Est. HPP", render: (r) => money(r.estimatedHpp) },
              { key: "minimumPrice", label: "Minimum", render: (r) => money(r.minimumPrice) },
              { key: "offeredPrice", label: "Offer", render: (r) => money(r.offeredPrice) },
              { key: "validUntil", label: "Valid", render: (r) => formatTanggal(r.validUntil) },
              {
                key: "aksi",
                label: "Aksi",
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    <GhostButton disabled={r.status !== "DRAFT"} onClick={() => status.mutate({ row: r, next: "SENT" })}><Send className="mr-2 h-4 w-4" />Send</GhostButton>
                    <GhostButton disabled={!["SENT", "DRAFT"].includes(r.status)} onClick={() => status.mutate({ row: r, next: "APPROVED" })}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</GhostButton>
                  </div>
                ),
              },
            ]} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function ProductionFlowPage() {
  return (
    <>
      <PageHeader title="Produksi, QC & Packing" subtitle="Fase 3: handoff antar proses, discrepancy, QC 100%, rework marker, dan packing hanya setelah QC PASS." />
      <Tabs.Root defaultValue="handoff" className="space-y-4">
        <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2">
          {[
            { value: "handoff", label: "Handoff", icon: Factory },
            { value: "qc", label: "QC", icon: ShieldCheck },
            { value: "packing", label: "Packing", icon: PackageCheck },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger key={value} value={value} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted", "data-[state=active]:bg-red-700 data-[state=active]:text-white dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-zinc-950")}>
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="handoff"><HandoffTab /></Tabs.Content>
        <Tabs.Content value="qc"><QcTab /></Tabs.Content>
        <Tabs.Content value="packing"><PackingTab /></Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function HandoffTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["production-handoffs"], queryFn: () => api<AnyRow[]>("/api/production-handoffs") });
  const [form, setForm] = React.useState({ batchId: "", fromProcess: "", toProcess: "", fromLocationId: "", toLocationId: "", qtySent: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/production-handoffs", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Handoff terkirim"); setForm({ batchId: "", fromProcess: "", toProcess: "", fromLocationId: "", toLocationId: "", qtySent: "", notes: "" }); qc.invalidateQueries({ queryKey: ["production-handoffs"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const receive = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/production-handoffs/${row.id}/receive`, { method: "POST", body: JSON.stringify({ qtyReceived: row.qtySent, version: row.version, notes: "Receive handoff" }) }),
    onSuccess: () => { toast.success("Handoff diterima"); qc.invalidateQueries({ queryKey: ["production-handoffs"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  const processOptions = optionize(l.processCatalog ?? [], (r) => r.nama, (r) => r.kode);
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Kirim Handoff</h2>
        <FormGrid>
          <SearchableSelect label="Batch" value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v ?? "" })} options={optionize(l.batches ?? [], (r) => r.nomor, (r) => `${r.article?.nama ?? "-"} · ${r.status}`)} />
          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect label="Dari proses" value={form.fromProcess} onChange={(v) => setForm({ ...form, fromProcess: v ?? "" })} options={processOptions} />
            <SearchableSelect label="Ke proses" value={form.toProcess} onChange={(v) => setForm({ ...form, toProcess: v ?? "" })} options={processOptions} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect label="Dari lokasi" value={form.fromLocationId} onChange={(v) => setForm({ ...form, fromLocationId: v ?? "" })} options={optionize(l.locations ?? [], (r) => r.nama, (r) => r.tipe)} />
            <SearchableSelect label="Ke lokasi" value={form.toLocationId} onChange={(v) => setForm({ ...form, toLocationId: v ?? "" })} options={optionize(l.locations ?? [], (r) => r.nama, (r) => r.tipe)} />
          </div>
          <TextInput type="number" placeholder="Qty sent" value={form.qtySent} onChange={(e) => setForm({ ...form, qtySent: e.target.value })} />
          <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Send className="mr-2 h-4 w-4" />Kirim Handoff</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "flow", label: "Flow", render: (r) => `${r.fromProcess ?? "-"} → ${r.toProcess ?? "-"}` },
        { key: "qtySent", label: "Sent" },
        { key: "qtyReceived", label: "Received", render: (r) => r.qtyReceived ?? "-" },
        { key: "discrepancyQty", label: "Diff", render: (r) => r.discrepancyQty ?? "-" },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "DISCREPANCY" ? "bad" : r.status === "RECEIVED" ? "good" : "warn"}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => <GhostButton disabled={r.status !== "SENT"} onClick={() => receive.mutate(r)}>Receive</GhostButton> },
      ]} />}</Panel>
    </div>
  );
}

function QcTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["qc-inspections"], queryFn: () => api<AnyRow[]>("/api/qc-inspections") });
  const [form, setForm] = React.useState({ batchId: "", articleId: "", sizeId: "", inspectedQty: "", passQty: "", rejectQty: "", rejectCategoryId: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/qc-inspections", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("QC tersimpan"); setForm({ batchId: "", articleId: "", sizeId: "", inspectedQty: "", passQty: "", rejectQty: "", rejectCategoryId: "", notes: "" }); qc.invalidateQueries({ queryKey: ["qc-inspections"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const decision = useMutation({
    mutationFn: ({ row, next }: { row: AnyRow; next: string }) => api(`/api/qc-inspections/${row.id}/decision`, { method: "POST", body: JSON.stringify({ status: next, version: row.version, notes: next }) }),
    onSuccess: () => { toast.success("Keputusan QC tersimpan"); qc.invalidateQueries({ queryKey: ["qc-inspections"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">QC Inspection</h2>
        <FormGrid>
          <SearchableSelect label="Batch" value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v ?? "" })} options={optionize(l.batches ?? [], (r) => r.nomor, (r) => `${r.article?.nama ?? "-"} · ${r.status}`)} />
          <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
          <SearchableSelect label="Size" value={form.sizeId} onChange={(v) => setForm({ ...form, sizeId: v ?? "" })} options={optionize(l.sizes ?? [], (r) => r.kode)} />
          <div className="grid grid-cols-3 gap-2">
            <TextInput type="number" placeholder="Inspect" value={form.inspectedQty} onChange={(e) => setForm({ ...form, inspectedQty: e.target.value })} />
            <TextInput type="number" placeholder="Pass" value={form.passQty} onChange={(e) => setForm({ ...form, passQty: e.target.value })} />
            <TextInput type="number" placeholder="Reject" value={form.rejectQty} onChange={(e) => setForm({ ...form, rejectQty: e.target.value })} />
          </div>
          <SearchableSelect label="Reject category" value={form.rejectCategoryId} onChange={(v) => setForm({ ...form, rejectCategoryId: v ?? "" })} options={optionize(l.rejectCategories ?? [], (r) => r.nama, (r) => r.kode)} />
          <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan QC</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "inspectedQty", label: "Inspect" },
        { key: "passQty", label: "Pass" },
        { key: "rejectQty", label: "Reject" },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "PASS" ? "good" : r.status === "REJECT" ? "bad" : "warn"}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => <div className="flex flex-wrap gap-2"><GhostButton onClick={() => decision.mutate({ row: r, next: "PASS" })}>Pass</GhostButton><GhostButton onClick={() => decision.mutate({ row: r, next: "REWORK" })}>Rework</GhostButton></div> },
      ]} />}</Panel>
    </div>
  );
}

function PackingTab() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["packing-jobs"], queryFn: () => api<AnyRow[]>("/api/packing-jobs") });
  const [form, setForm] = React.useState({ batchId: "", articleId: "", qtyToPack: "", labelCode: "", notes: "" });
  const create = useMutation({
    mutationFn: () => api("/api/packing-jobs", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Packing job tersimpan"); setForm({ batchId: "", articleId: "", qtyToPack: "", labelCode: "", notes: "" }); qc.invalidateQueries({ queryKey: ["packing-jobs"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const status = useMutation({
    mutationFn: ({ row, next }: { row: AnyRow; next: string }) => api(`/api/packing-jobs/${row.id}/status`, { method: "POST", body: JSON.stringify({ status: next, packedQty: row.qtyToPack, version: row.version, notes: next }) }),
    onSuccess: () => { toast.success("Status packing diperbarui"); qc.invalidateQueries({ queryKey: ["packing-jobs"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <h2 className="mb-4 font-semibold">Packing Job</h2>
        <FormGrid>
          <SearchableSelect label="Batch" value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v ?? "" })} options={optionize(l.batches ?? [], (r) => r.nomor, (r) => `${r.article?.nama ?? "-"} · ${r.status}`)} />
          <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
          <TextInput type="number" placeholder="Qty to pack" value={form.qtyToPack} onChange={(e) => setForm({ ...form, qtyToPack: e.target.value })} />
          <TextInput placeholder="Label code" value={form.labelCode} onChange={(e) => setForm({ ...form, labelCode: e.target.value })} />
          <TextArea placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Packing</Button>
        </FormGrid>
      </Panel>
      <Panel>{rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" },
        { key: "qtyToPack", label: "To pack" },
        { key: "packedQty", label: "Packed" },
        { key: "labelCode", label: "Label" },
        { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "GOODS_READY" ? "good" : r.status === "PACKED" ? "warn" : "neutral"}>{r.status}</StatusBadge> },
        { key: "aksi", label: "Aksi", render: (r) => <div className="flex flex-wrap gap-2"><GhostButton disabled={r.status !== "OPEN"} onClick={() => status.mutate({ row: r, next: "PACKED" })}>Packed</GhostButton><GhostButton disabled={r.status === "GOODS_READY"} onClick={() => status.mutate({ row: r, next: "GOODS_READY" })}>Goods ready</GhostButton></div> },
      ]} />}</Panel>
    </div>
  );
}
