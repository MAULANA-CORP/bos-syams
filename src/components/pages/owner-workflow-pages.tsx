"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, PauseCircle, PlayCircle, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { api, optionize } from "@/lib/client-api";
import { formatTanggal } from "@/lib/utils";

type AnyRow = { id: string; [key: string]: any };

function useLookups() {
  return useQuery({ queryKey: ["lookups"], queryFn: () => api<AnyRow>("/api/lookups") });
}

function Table({ rows, columns }: { rows: AnyRow[]; columns: { key: string; label: string; render?: (row: AnyRow) => React.ReactNode }[] }) {
  if (!rows.length) return <EmptyState title="Belum ada data">Data akan muncul setelah ada transaksi atau konfigurasi.</EmptyState>;
  return <div className="overflow-x-auto rounded-md border border-border"><table className="min-w-full divide-y divide-border text-sm"><thead className="bg-zinc-50 dark:bg-zinc-900"><tr>{columns.map((column) => <th key={column.key} className="px-3 py-3 text-left font-medium text-muted">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border bg-card">{rows.map((row) => <tr key={row.id} className="align-top">{columns.map((column) => <td key={column.key} className="px-3 py-3">{column.render ? column.render(row) : String(row[column.key] ?? "-")}</td>)}</tr>)}</tbody></table></div>;
}

function ErrorText({ error }: { error: unknown }) {
  return error ? <p className="text-sm text-red-700 dark:text-red-300">{(error as Error).message}</p> : null;
}

const reviewRoles = ["CMO_MANAGER", "PRODUCTION_CONTROLLER", "CFO"];

export function OrderChangesPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const requests = useQuery({ queryKey: ["order-change-requests"], queryFn: () => api<AnyRow[]>("/api/order-change-requests") });
  const [form, setForm] = React.useState({ orderId: "", jenis: "CHANGE", alasan: "", dampak: "", requestedChanges: "{}", disposition: "", financialTreatment: "TBD", reviewRoles });
  const create = useMutation({
    mutationFn: () => api("/api/order-change-requests", { method: "POST", body: JSON.stringify({ ...form, requestedChanges: JSON.parse(form.requestedChanges) }) }),
    onSuccess: () => { toast.success("Change Request tersimpan"); setForm({ orderId: "", jenis: "CHANGE", alasan: "", dampak: "", requestedChanges: "{}", disposition: "", financialTreatment: "TBD", reviewRoles }); qc.invalidateQueries({ queryKey: ["order-change-requests"] }); },
    onError: (error) => toast.error((error as Error).message),
  });
  const review = useMutation({
    mutationFn: ({ row, status }: { row: AnyRow; status: "APPROVED" | "REJECTED" }) => api(`/api/order-change-requests/${row.id}/review`, { method: "POST", body: JSON.stringify({ status, notes: status === "APPROVED" ? "Disetujui dari halaman Change Request" : "Ditolak dari halaman Change Request", version: row.version }) }),
    onSuccess: () => { toast.success("Review tersimpan"); qc.invalidateQueries({ queryKey: ["order-change-requests"] }); },
    onError: (error) => toast.error((error as Error).message),
  });
  const apply = useMutation({
    mutationFn: (row: AnyRow) => api(`/api/order-change-requests/${row.id}/apply`, { method: "POST", body: JSON.stringify({ version: row.version, reason: "Apply Change Request setelah approval domain" }) }),
    onSuccess: () => { toast.success("Perubahan diterapkan"); qc.invalidateQueries({ queryKey: ["order-change-requests"] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (error) => toast.error((error as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return <>
    <PageHeader title="Change Request" subtitle="Perubahan setelah release harus melalui impact review dan menyimpan jejak versi historis." />
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel><h2 className="mb-4 font-semibold">Ajukan perubahan</h2><div className="grid gap-3">
        <SearchableSelect label="Order" value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v ?? "" })} options={optionize(l.orders ?? [], (r) => `${r.nomor} · ${r.buyer?.nama ?? "-"}`, (r) => r.status)} />
        <SearchableSelect label="Jenis" value={form.jenis} onChange={(v) => setForm({ ...form, jenis: v ?? "CHANGE" })} options={[{ value: "CHANGE", label: "Change Order" }, { value: "CANCELLATION", label: "Cancellation" }]} />
        <TextArea placeholder="Alasan perubahan" value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
        <TextArea placeholder="Dampak customer, produksi, finance" value={form.dampak} onChange={(e) => setForm({ ...form, dampak: e.target.value })} />
        <TextArea placeholder='Field perubahan JSON, contoh: {"deadline":"2026-10-01","commercialValue":1000000}' value={form.requestedChanges} onChange={(e) => setForm({ ...form, requestedChanges: e.target.value })} />
        {form.jenis === "CANCELLATION" && <TextArea placeholder="Disposition WIP/material/packing/makloon" value={form.disposition} onChange={(e) => setForm({ ...form, disposition: e.target.value })} />}
        <SearchableSelect label="Perlakuan finansial" value={form.financialTreatment} onChange={(v) => setForm({ ...form, financialTreatment: v ?? "TBD" })} options={["NONE", "CHARGE", "REFUND", "CREDIT", "TBD"].map((value) => ({ value, label: value }))} />
        <div><p className="mb-2 text-sm font-medium">Reviewer domain</p><div className="grid gap-2">{reviewRoles.map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.reviewRoles.includes(role)} onChange={(e) => setForm({ ...form, reviewRoles: e.target.checked ? [...form.reviewRoles, role] : form.reviewRoles.filter((item) => item !== role) })} />{role}</label>)}</div></div>
        <Button disabled={create.isPending || !form.orderId} onClick={() => { try { JSON.parse(form.requestedChanges); create.mutate(); } catch { toast.error("Requested changes harus JSON yang valid"); } }}><Plus className="mr-2 h-4 w-4" />Simpan Request</Button>
        <ErrorText error={create.error} />
      </div></Panel>
      <Panel><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Daftar request</h2><p className="text-sm text-muted">Review CMO, COO/Production Controller, dan CFO berjalan per domain.</p></div><GhostButton onClick={() => requests.refetch()}><Send className="mr-2 h-4 w-4" />Refresh</GhostButton></div>
        {requests.isLoading ? <p className="text-sm text-muted">Memuat...</p> : requests.error ? <ErrorText error={requests.error} /> : <Table rows={requests.data ?? []} columns={[
          { key: "nomor", label: "Nomor" },
          { key: "order", label: "Order", render: (r) => <>{r.order?.nomor}<br /><span className="text-xs text-muted">{r.order?.buyer?.nama ?? "-"}</span></> },
          { key: "jenis", label: "Jenis" },
          { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "APPROVED" || r.status === "APPLIED" ? "good" : r.status === "REJECTED" ? "bad" : "warn"}>{r.status}</StatusBadge> },
          { key: "reviews", label: "Review", render: (r) => <div className="space-y-1">{(r.reviews ?? []).map((review: AnyRow) => <div key={review.id} className="text-xs">{review.role}: {review.status}</div>)}</div> },
          { key: "aksi", label: "Aksi", render: (r) => <div className="flex flex-wrap gap-2"><GhostButton disabled={r.status !== "APPROVED"} onClick={() => apply.mutate(r)}><CheckCircle2 className="mr-1 h-4 w-4" />Apply</GhostButton><GhostButton disabled={r.status === "APPROVED" || r.status === "REJECTED" || r.status === "APPLIED"} onClick={() => review.mutate({ row: r, status: "APPROVED" })}>Approve</GhostButton><GhostButton disabled={r.status === "APPROVED" || r.status === "REJECTED" || r.status === "APPLIED"} onClick={() => review.mutate({ row: r, status: "REJECTED" })}>Reject</GhostButton></div> },
        ]} />}
      </Panel>
    </div>
  </>;
}

const blankRule = { kode: "", nama: "", process: "", targetMinutes: 60, startTrigger: "", stopTrigger: "", warningThreshold: 80, ownerRole: "", workingCalendar: "BUSINESS", escalationRule: "" };

export function SlaPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rules = useQuery({ queryKey: ["sla-rules"], queryFn: () => api<AnyRow[]>("/api/sla-rules") });
  const instances = useQuery({ queryKey: ["sla-instances"], queryFn: () => api<AnyRow[]>("/api/sla-instances") });
  const delegations = useQuery({ queryKey: ["delegations"], queryFn: () => api<AnyRow[]>("/api/delegations") });
  const [tab, setTab] = React.useState("rules");
  const [rule, setRule] = React.useState(blankRule);
  const [delegation, setDelegation] = React.useState({ fromUserId: "", toUserId: "", scope: "", effectiveStart: new Date().toISOString().slice(0, 10), effectiveEnd: "", reason: "" });
  const createRule = useMutation({ mutationFn: () => api("/api/sla-rules", { method: "POST", body: JSON.stringify({ ...rule, targetMinutes: Number(rule.targetMinutes), warningThreshold: Number(rule.warningThreshold), active: true }) }), onSuccess: () => { toast.success("SLA rule tersimpan"); setRule(blankRule); qc.invalidateQueries({ queryKey: ["sla-rules"] }); }, onError: (e) => toast.error((e as Error).message) });
  const createDelegation = useMutation({ mutationFn: () => api("/api/delegations", { method: "POST", body: JSON.stringify(delegation) }), onSuccess: () => { toast.success("Delegasi tersimpan"); qc.invalidateQueries({ queryKey: ["delegations"] }); }, onError: (e) => toast.error((e as Error).message) });
  const toggleRule = useMutation({ mutationFn: (row: AnyRow) => api(`/api/sla-rules/${row.id}`, { method: "PATCH", body: JSON.stringify({ version: row.version, active: !row.active, reason: "Aktif/nonaktif dari SLA console" }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-rules"] }), onError: (e) => toast.error((e as Error).message) });
  const toggleDelegation = useMutation({ mutationFn: (row: AnyRow) => api(`/api/delegations/${row.id}`, { method: "PATCH", body: JSON.stringify({ version: row.version, isActive: !row.isActive, reason: "Aktif/nonaktif dari SLA console" }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["delegations"] }), onError: (e) => toast.error((e as Error).message) });
  const l = (lookups.data ?? {}) as AnyRow;
  return <><PageHeader title="SLA & Delegation" subtitle="SLA dikonfigurasi dan versioned. Breach memberi status WARNING/OVERDUE tanpa membuat CEO Exception otomatis." /><div className="mb-4 flex flex-wrap gap-2">{[{ id: "rules", label: "SLA Rules" }, { id: "instances", label: "Active Instances" }, { id: "delegations", label: "Delegation" }].map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-md border px-3 py-2 text-sm ${tab === item.id ? "border-red-700 bg-red-700 text-white" : "border-border text-muted"}`}>{item.label}</button>)}</div>
    {tab === "rules" && <div className="grid gap-4 xl:grid-cols-[390px_1fr]"><Panel><h2 className="mb-4 font-semibold">Tambah SLA Rule</h2><div className="grid gap-3">{([["kode", "Kode"], ["nama", "Nama"], ["process", "Process / activity"], ["startTrigger", "Start trigger"], ["stopTrigger", "Stop trigger"], ["ownerRole", "Owner role"], ["workingCalendar", "Working calendar"], ["escalationRule", "Escalation rule"]] as const).map(([key, placeholder]) => <TextInput key={key} placeholder={placeholder} value={rule[key]} onChange={(e) => setRule({ ...rule, [key]: e.target.value })} />)}<TextInput type="number" placeholder="Target duration (menit)" value={rule.targetMinutes} onChange={(e) => setRule({ ...rule, targetMinutes: Number(e.target.value) })} /><TextInput type="number" placeholder="Warning threshold (%)" value={rule.warningThreshold} onChange={(e) => setRule({ ...rule, warningThreshold: Number(e.target.value) })} /><Button disabled={createRule.isPending} onClick={() => createRule.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan SLA Rule</Button></div></Panel><Panel><Table rows={rules.data ?? []} columns={[{ key: "kode", label: "Kode" }, { key: "nama", label: "Nama" }, { key: "process", label: "Process" }, { key: "targetMinutes", label: "Target" }, { key: "version", label: "Version" }, { key: "active", label: "Status", render: (r) => <StatusBadge tone={r.active ? "good" : "warn"}>{r.active ? "ACTIVE" : "INACTIVE"}</StatusBadge> }, { key: "aksi", label: "Aksi", render: (r) => <GhostButton onClick={() => toggleRule.mutate(r)}>{r.active ? <PauseCircle className="mr-1 h-4 w-4" /> : <PlayCircle className="mr-1 h-4 w-4" />}{r.active ? "Nonaktifkan" : "Aktifkan"}</GhostButton> }]} /></Panel></div>}
    {tab === "instances" && <Panel><Table rows={instances.data ?? []} columns={[{ key: "sourceId", label: "Source" }, { key: "rule", label: "Rule", render: (r) => r.rule?.nama ?? "-" }, { key: "task", label: "Task", render: (r) => r.task?.judul ?? "-" }, { key: "owner", label: "Owner", render: (r) => r.owner?.nama ?? "-" }, { key: "dueAt", label: "Due", render: (r) => formatTanggal(r.dueAt) }, { key: "status", label: "Status", render: (r) => <StatusBadge tone={r.status === "OVERDUE" ? "bad" : r.status === "WARNING" ? "warn" : r.status === "COMPLETED" ? "good" : "neutral"}>{r.status}</StatusBadge> }]} /></Panel>}
    {tab === "delegations" && <div className="grid gap-4 xl:grid-cols-[390px_1fr]"><Panel><h2 className="mb-4 font-semibold">Tambah Delegasi</h2><div className="grid gap-3"><SearchableSelect label="Dari user" value={delegation.fromUserId} onChange={(v) => setDelegation({ ...delegation, fromUserId: v ?? "" })} options={optionize(l.users ?? [], (r) => r.nama, (r) => r.username)} /><SearchableSelect label="Ke user" value={delegation.toUserId} onChange={(v) => setDelegation({ ...delegation, toUserId: v ?? "" })} options={optionize(l.users ?? [], (r) => r.nama, (r) => r.username)} /><TextInput placeholder="Scope, contoh: ORDER_CHANGE:APPROVE" value={delegation.scope} onChange={(e) => setDelegation({ ...delegation, scope: e.target.value })} /><TextInput type="date" value={delegation.effectiveStart} onChange={(e) => setDelegation({ ...delegation, effectiveStart: e.target.value })} /><TextInput type="date" value={delegation.effectiveEnd} onChange={(e) => setDelegation({ ...delegation, effectiveEnd: e.target.value })} /><TextArea placeholder="Alasan delegasi" value={delegation.reason} onChange={(e) => setDelegation({ ...delegation, reason: e.target.value })} /><Button disabled={createDelegation.isPending} onClick={() => createDelegation.mutate()}><Plus className="mr-2 h-4 w-4" />Simpan Delegasi</Button></div></Panel><Panel><Table rows={delegations.data ?? []} columns={[{ key: "fromUser", label: "Dari", render: (r) => r.fromUser?.nama ?? "-" }, { key: "toUser", label: "Ke", render: (r) => r.toUser?.nama ?? "-" }, { key: "scope", label: "Scope" }, { key: "effectiveStart", label: "Periode", render: (r) => `${formatTanggal(r.effectiveStart)} - ${formatTanggal(r.effectiveEnd)}` }, { key: "isActive", label: "Status", render: (r) => <StatusBadge tone={r.isActive ? "good" : "warn"}>{r.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge> }, { key: "aksi", label: "Aksi", render: (r) => <GhostButton onClick={() => toggleDelegation.mutate(r)}>{r.isActive ? "Nonaktifkan" : "Aktifkan"}</GhostButton> }]} /></Panel></div>}
  </>;
}
