"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CheckCircle2, CircleAlert, Factory, HandCoins, LockKeyhole, PackageCheck, Plus, Send, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, optionize } from "@/lib/client-api";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

type AnyRow = { id: string; [key: string]: any };

function useLookups() {
  return useQuery({ queryKey: ["lookups"], queryFn: () => api<AnyRow>("/api/lookups") });
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Panel className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200"><CircleAlert className="h-4 w-4" />{message}</div>
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
            <tr key={row.id} className="align-top">{columns.map((c) => <td key={c.key} className="px-3 py-3 text-foreground">{c.render ? c.render(row) : String(row[c.key] ?? "-")}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tone(status: string) {
  if (["APPROVED", "WON", "SENT", "RECEIVED", "CLOSED", "ACTIVE", "PAID", "DELIVERED"].includes(status)) return "good" as const;
  if (["REJECTED", "INACTIVE", "LOST"].includes(status)) return "bad" as const;
  if (["OPEN", "REQUESTED", "PLANNED", "IN_PROGRESS", "OUTSTANDING", "REPORTED"].includes(status)) return "warn" as const;
  return "neutral" as const;
}

export function PortalAdminPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const accounts = useQuery({ queryKey: ["portal-accounts"], queryFn: () => api<AnyRow[]>("/api/portal-accounts") });
  const tickets = useQuery({ queryKey: ["portal-tickets-admin"], queryFn: () => api<AnyRow[]>("/api/portal-tickets") });
  const [form, setForm] = React.useState({ buyerId: "", email: "", password: "", portalRole: "VIEWER" });
  const create = useMutation({
    mutationFn: () => api("/api/portal-accounts", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Portal account dibuat"); setForm({ buyerId: "", email: "", password: "", portalRole: "VIEWER" }); qc.invalidateQueries({ queryKey: ["portal-accounts"] }); qc.invalidateQueries({ queryKey: ["lookups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const ticketStatus = useMutation({
    mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/portal-tickets/${row.id}/status`, { method: "POST", body: JSON.stringify({ status, version: row.version }) }),
    onSuccess: () => { toast.success("Ticket status updated"); qc.invalidateQueries({ queryKey: ["portal-tickets-admin"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <>
      <PageHeader title="Portal Admin" subtitle="Fase 6: invite-only customer portal account, selalu terikat Buyer ID." />
      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Panel>
          <h2 className="mb-4 font-semibold">Buat akun portal</h2>
          <div className="grid gap-3">
            <SearchableSelect label="Buyer" value={form.buyerId} onChange={(v) => setForm({ ...form, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.kode)} />
            <TextInput placeholder="customer@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextInput type="password" placeholder="Password awal" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <SearchableSelect label="Portal role" value={form.portalRole} onChange={(v) => setForm({ ...form, portalRole: v ?? "VIEWER" })} options={["APPROVER", "FINANCE", "SHIPPING", "VIEWER"].map((r) => ({ value: r, label: r }))} />
            <Button disabled={create.isPending} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Create Portal Account</Button>
          </div>
        </Panel>
        <Panel>{accounts.isLoading ? <SkeletonRows /> : accounts.error ? <ErrorBox message={(accounts.error as Error).message} onRetry={() => accounts.refetch()} /> : <DataTable rows={accounts.data ?? []} columns={[
          { key: "email", label: "Email" },
          { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) },
          { key: "portalRole", label: "Role", render: (r) => <StatusBadge>{r.portalRole}</StatusBadge> },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge tone={r.isActive ? "good" : "bad"}>{r.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge> },
        ]} />}</Panel>
      </div>
      <Panel className="mt-4">
        <h2 className="mb-4 font-semibold">Ticket dari portal</h2>
        {tickets.isLoading ? <SkeletonRows /> : tickets.error ? <ErrorBox message={(tickets.error as Error).message} onRetry={() => tickets.refetch()} /> : <DataTable rows={tickets.data ?? []} columns={[
          { key: "nomor", label: "Nomor" },
          { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) },
          { key: "subject", label: "Subject" },
          { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
          { key: "aksi", label: "Aksi", render: (r) => <div className="flex gap-2"><GhostButton disabled={r.status !== "OPEN"} onClick={() => ticketStatus.mutate({ row: r, status: "IN_PROGRESS" })}>In progress</GhostButton><GhostButton disabled={r.status === "CLOSED"} onClick={() => ticketStatus.mutate({ row: r, status: "CLOSED" })}>Close</GhostButton></div> },
        ]} />}
      </Panel>
    </>
  );
}

export function CustomerPortalLoginPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({ email: "", password: "" });
  const login = useMutation({
    mutationFn: () => api("/api/portal/login", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("Portal login berhasil"); router.push("/portal"); router.refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-sm font-semibold text-red-700 dark:text-red-300">SYAMS CUSTOMER PORTAL</p><h1 className="text-2xl font-semibold">Buyer login</h1></div>
          <ThemeToggle />
        </div>
        <Panel>
          <div className="grid gap-4">
            <TextInput placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextInput type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button disabled={login.isPending} onClick={() => login.mutate()}><LockKeyhole className="mr-2 h-4 w-4" />Enter portal</Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

export function CustomerPortalPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => api<AnyRow>("/api/portal/dashboard"), retry: false });
  const [ticket, setTicket] = React.useState({ orderId: "", subject: "", message: "" });
  const [payment, setPayment] = React.useState({ invoiceId: "", amount: "", evidenceUrl: "", notes: "" });
  const createTicket = useMutation({
    mutationFn: () => api("/api/portal/tickets", { method: "POST", body: JSON.stringify(ticket) }),
    onSuccess: () => { toast.success("Ticket sent"); setTicket({ orderId: "", subject: "", message: "" }); qc.invalidateQueries({ queryKey: ["portal-dashboard"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const reportPayment = useMutation({
    mutationFn: () => api("/api/portal/payments", { method: "POST", body: JSON.stringify(payment) }),
    onSuccess: () => { toast.success("Payment evidence reported"); setPayment({ invoiceId: "", amount: "", evidenceUrl: "", notes: "" }); qc.invalidateQueries({ queryKey: ["portal-dashboard"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const sampleDecision = useMutation({
    mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/portal/samples/${row.id}/decision`, { method: "POST", body: JSON.stringify({ status, version: row.version, notes: status }) }),
    onSuccess: () => { toast.success("Sample decision sent"); qc.invalidateQueries({ queryKey: ["portal-dashboard"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  React.useEffect(() => { if ((dash.error as any)?.status === 401) router.push("/portal/login"); }, [dash.error, router]);
  if (dash.isLoading) return <main className="min-h-screen bg-background p-6 text-foreground"><SkeletonRows /></main>;
  if (dash.error) return <main className="min-h-screen bg-background p-6 text-foreground"><ErrorBox message={(dash.error as Error).message} /></main>;
  const data = (dash.data ?? {}) as AnyRow;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div><p className="text-xs font-medium uppercase text-muted">Syams Customer Portal</p><h1 className="text-xl font-semibold">{data.buyer?.nama ?? "Buyer"}</h1></div>
          <ThemeToggle />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel>
            <h2 className="mb-3 font-semibold">Send ticket</h2>
            <div className="grid gap-3">
              <SearchableSelect label="Order" value={ticket.orderId} onChange={(v) => setTicket({ ...ticket, orderId: v ?? "" })} options={optionize(data.orders ?? [], (r) => r.nomor, (r) => r.status)} />
              <TextInput placeholder="Subject" value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} />
              <TextArea placeholder="Message" value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })} />
              <Button onClick={() => createTicket.mutate()}><Ticket className="mr-2 h-4 w-4" />Send Ticket</Button>
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold">Payment evidence</h2>
            <div className="grid gap-3">
              <SearchableSelect label="Invoice" value={payment.invoiceId} onChange={(v) => setPayment({ ...payment, invoiceId: v ?? "" })} options={optionize(data.invoices ?? [], (r) => r.nomor, (r) => `${r.currency} ${Number(r.amount).toLocaleString("id-ID")} · ${r.status}`)} />
              <TextInput type="number" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
              <TextInput placeholder="Evidence URL" value={payment.evidenceUrl} onChange={(e) => setPayment({ ...payment, evidenceUrl: e.target.value })} />
              <TextArea placeholder="Notes" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
              <Button onClick={() => reportPayment.mutate()}><HandCoins className="mr-2 h-4 w-4" />Report Payment</Button>
            </div>
          </Panel>
        </div>
        <Tabs.Root defaultValue="orders" className="space-y-4">
          <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2">
            {["orders", "samples", "invoices", "shipments", "tickets"].map((tab) => <Tabs.Trigger key={tab} value={tab} className={tabClass}>{tab}</Tabs.Trigger>)}
          </Tabs.List>
          <Tabs.Content value="orders"><PortalTable rows={data.orders ?? []} cols={["nomor", "tipe", "status", "deadline"]} /></Tabs.Content>
          <Tabs.Content value="samples"><Panel><DataTable rows={data.sampleApprovals ?? []} columns={[
            { key: "nomor", label: "Sample" }, { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
            { key: "aksi", label: "Decision", render: (r) => <div className="flex gap-2"><GhostButton disabled={!["REQUESTED", "SENT"].includes(r.status)} onClick={() => sampleDecision.mutate({ row: r, status: "APPROVED" })}>Approve</GhostButton><GhostButton disabled={!["REQUESTED", "SENT"].includes(r.status)} onClick={() => sampleDecision.mutate({ row: r, status: "REJECTED" })}>Reject</GhostButton></div> },
          ]} /></Panel></Tabs.Content>
          <Tabs.Content value="invoices"><PortalTable rows={data.invoices ?? []} cols={["nomor", "currency", "amount", "dueDate", "status"]} /></Tabs.Content>
          <Tabs.Content value="shipments"><PortalTable rows={data.shipments ?? []} cols={["nomor", "packedQty", "trackingNo", "status"]} /></Tabs.Content>
          <Tabs.Content value="tickets"><PortalTable rows={data.tickets ?? []} cols={["nomor", "subject", "status"]} /></Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}

function PortalTable({ rows, cols }: { rows: AnyRow[]; cols: string[] }) {
  return <Panel><DataTable rows={rows} columns={cols.map((key) => ({ key, label: key, render: (r) => key.toLowerCase().includes("date") || key === "deadline" ? formatTanggal(r[key]) : key === "status" ? <StatusBadge tone={tone(r[key])}>{r[key]}</StatusBadge> : String(r[key] ?? "-") }))} /></Panel>;
}

export function CrmPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["crm-pipelines"], queryFn: () => api<AnyRow[]>("/api/crm-pipelines") });
  const [form, setForm] = React.useState({ buyerId: "", title: "", stage: "LEAD", nextFollowUp: "", ownerId: "", notes: "" });
  const create = useMutation({ mutationFn: () => api("/api/crm-pipelines", { method: "POST", body: JSON.stringify(form) }), onSuccess: () => { toast.success("CRM pipeline dibuat"); setForm({ buyerId: "", title: "", stage: "LEAD", nextFollowUp: "", ownerId: "", notes: "" }); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const updateStage = useMutation({ mutationFn: ({ row, stage }: { row: AnyRow; stage: string }) => api(`/api/crm-pipelines/${row.id}`, { method: "PATCH", body: JSON.stringify({ stage, version: row.version, reason: `Move to ${stage}` }) }), onSuccess: () => { toast.success("Stage updated"); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const l = (lookups.data ?? {}) as AnyRow;
  return (
    <>
      <PageHeader title="CMO Pipeline / CRM" subtitle="Fase 7: lead, follow-up, negotiation, won/lost pipeline untuk commercial." />
      <TwoCol form={<>
        <SearchableSelect label="Buyer" value={form.buyerId} onChange={(v) => setForm({ ...form, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.kode)} />
        <TextInput placeholder="Opportunity title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <SearchableSelect label="Stage" value={form.stage} onChange={(v) => setForm({ ...form, stage: v ?? "LEAD" })} options={crmStages.map((s) => ({ value: s, label: s }))} />
        <TextInput type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
        <TextArea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Create Pipeline</Button>
      </>} table={rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
        { key: "nomor", label: "Nomor" }, { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) }, { key: "title", label: "Title" },
        { key: "stage", label: "Stage", render: (r) => <StatusBadge tone={tone(r.stage)}>{r.stage}</StatusBadge> }, { key: "nextFollowUp", label: "Follow up", render: (r) => formatTanggal(r.nextFollowUp) },
        { key: "aksi", label: "Move", render: (r) => <div className="flex flex-wrap gap-2">{crmStages.slice(1).map((s) => <GhostButton key={s} onClick={() => updateStage.mutate({ row: r, stage: s })}>{s}</GhostButton>)}</div> },
      ]} />} />
    </>
  );
}

export function SamplesPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["sample-approvals"], queryFn: () => api<AnyRow[]>("/api/sample-approvals") });
  const [form, setForm] = React.useState({ articleId: "", buyerId: "", sentAt: "", notes: "" });
  const create = useMutation({ mutationFn: () => api("/api/sample-approvals", { method: "POST", body: JSON.stringify(form) }), onSuccess: () => { toast.success("Sample approval dibuat"); setForm({ articleId: "", buyerId: "", sentAt: "", notes: "" }); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const move = useMutation({ mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/sample-approvals/${row.id}/status`, { method: "POST", body: JSON.stringify({ status, version: row.version, notes: status }) }), onSuccess: () => { toast.success("Sample status updated"); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const l = (lookups.data ?? {}) as AnyRow;
  return <><PageHeader title="Sample Approval" subtitle="Fase 7: sample request/sent dan approval buyer via back office atau Customer Portal." /><TwoCol form={<>
    <SearchableSelect label="Article" value={form.articleId} onChange={(v) => setForm({ ...form, articleId: v ?? "" })} options={optionize(l.articles ?? [], (r) => `${r.kode} · ${r.nama}`, (r) => `${r.qty} pcs`)} />
    <SearchableSelect label="Buyer" value={form.buyerId} onChange={(v) => setForm({ ...form, buyerId: v ?? "" })} options={optionize(l.buyers ?? [], (r) => r.nama, (r) => r.kode)} />
    <TextInput type="date" value={form.sentAt} onChange={(e) => setForm({ ...form, sentAt: e.target.value })} />
    <TextArea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    <Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Create Sample</Button>
  </>} table={rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
    { key: "nomor", label: "Nomor" }, { key: "articleId", label: "Article", render: (r) => nameById(l.articles, r.articleId) }, { key: "buyerId", label: "Buyer", render: (r) => nameById(l.buyers, r.buyerId) },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
    { key: "aksi", label: "Aksi", render: (r) => <div className="flex gap-2"><GhostButton onClick={() => move.mutate({ row: r, status: "SENT" })}>Sent</GhostButton><GhostButton onClick={() => move.mutate({ row: r, status: "APPROVED" })}>Approve</GhostButton><GhostButton onClick={() => move.mutate({ row: r, status: "REJECTED" })}>Reject</GhostButton></div> },
  ]} />} /></>;
}

export function MakloonPage() {
  const qc = useQueryClient();
  const lookups = useLookups();
  const rows = useQuery({ queryKey: ["makloon-jobs"], queryFn: () => api<AnyRow[]>("/api/makloon-jobs") });
  const [form, setForm] = React.useState({ batchId: "", supplierId: "", processId: "", unitPrice: "", total: "", qtySent: "", dueDate: "", notes: "" });
  const [receiveQty, setReceiveQty] = React.useState<Record<string, string>>({});
  const create = useMutation({ mutationFn: () => api("/api/makloon-jobs", { method: "POST", body: JSON.stringify(form) }), onSuccess: () => { toast.success("Makloon job dibuat"); setForm({ batchId: "", supplierId: "", processId: "", unitPrice: "", total: "", qtySent: "", dueDate: "", notes: "" }); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const move = useMutation({ mutationFn: ({ row, status }: { row: AnyRow; status: string }) => api(`/api/makloon-jobs/${row.id}/status`, { method: "POST", body: JSON.stringify({ status, qtyReceived: Number(receiveQty[row.id] ?? row.qtySent), version: row.version, notes: status }) }), onSuccess: () => { toast.success("Makloon status updated"); setReceiveQty({}); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  const l = (lookups.data ?? {}) as AnyRow;
  return <><PageHeader title="Makloon" subtitle="Fase 7: external process job, sent/received/closed, cost field hanya CFO/CEO." /><TwoCol form={<>
    <SearchableSelect label="Batch" value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v ?? "" })} options={optionize(l.batches ?? [], (r) => r.nomor, (r) => r.status)} />
    <SearchableSelect label="Supplier" value={form.supplierId} onChange={(v) => setForm({ ...form, supplierId: v ?? "" })} options={optionize(l.suppliers ?? [], (r) => r.nama, (r) => r.kode)} />
    <SearchableSelect label="Process" value={form.processId} onChange={(v) => setForm({ ...form, processId: v ?? "" })} options={optionize(l.processCatalog ?? [], (r) => r.nama, (r) => r.kode)} />
    <div className="grid grid-cols-2 gap-2"><TextInput type="number" placeholder="Qty sent" value={form.qtySent} onChange={(e) => setForm({ ...form, qtySent: e.target.value })} /><TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
    <div className="grid grid-cols-2 gap-2"><TextInput type="number" placeholder="Unit price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /><TextInput type="number" placeholder="Total" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></div>
    <TextArea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    <Button onClick={() => create.mutate()}><Factory className="mr-2 h-4 w-4" />Create Makloon</Button>
  </>} table={rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[
    { key: "nomor", label: "Nomor" }, { key: "batchId", label: "Batch", render: (r) => nameById(l.batches, r.batchId) }, { key: "supplierId", label: "Supplier", render: (r) => nameById(l.suppliers, r.supplierId) },
    { key: "qtySent", label: "Sent" }, { key: "qtyReceived", label: "Received" }, { key: "total", label: "Total", render: (r) => r.total === null ? "-" : formatRupiah(r.total) },
    { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
    { key: "aksi", label: "Aksi", render: (r) => <div className="flex min-w-56 gap-2"><TextInput className="w-24" type="number" value={receiveQty[r.id] ?? String(r.qtySent)} onChange={(e) => setReceiveQty({ ...receiveQty, [r.id]: e.target.value })} /><GhostButton onClick={() => move.mutate({ row: r, status: "SENT" })}>Sent</GhostButton><GhostButton onClick={() => move.mutate({ row: r, status: "RECEIVED" })}>Receive</GhostButton><GhostButton onClick={() => move.mutate({ row: r, status: "CLOSED" })}>Close</GhostButton></div> },
  ]} />} /></>;
}

export function PeoplePage() {
  return (
    <>
      <PageHeader title="CHRO / People" subtitle="Fase 7: employee data dan manpower planning." />
      <Tabs.Root defaultValue="employees" className="space-y-4">
        <Tabs.List className="flex gap-2 overflow-x-auto rounded-md border border-border bg-card p-2"><Tabs.Trigger value="employees" className={tabClass}>Employees</Tabs.Trigger><Tabs.Trigger value="manpower" className={tabClass}>Manpower</Tabs.Trigger></Tabs.List>
        <Tabs.Content value="employees"><EmployeesTab /></Tabs.Content>
        <Tabs.Content value="manpower"><ManpowerTab /></Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function EmployeesTab() {
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["employees"], queryFn: () => api<AnyRow[]>("/api/employees") });
  const [form, setForm] = React.useState({ nik: "", nama: "", departemen: "", roleTitle: "", salaryLevel: "", status: "ACTIVE" });
  const create = useMutation({ mutationFn: () => api("/api/employees", { method: "POST", body: JSON.stringify(form) }), onSuccess: () => { toast.success("Employee dibuat"); setForm({ nik: "", nama: "", departemen: "", roleTitle: "", salaryLevel: "", status: "ACTIVE" }); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  return <TwoCol form={<><TextInput placeholder="NIK" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /><TextInput placeholder="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /><TextInput placeholder="Departemen" value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })} /><TextInput placeholder="Role title" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} /><TextInput placeholder="Salary level" value={form.salaryLevel} onChange={(e) => setForm({ ...form, salaryLevel: e.target.value })} /><Button onClick={() => create.mutate()}><UsersRound className="mr-2 h-4 w-4" />Create Employee</Button></>} table={rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[{ key: "nik", label: "NIK" }, { key: "nama", label: "Nama" }, { key: "departemen", label: "Dept" }, { key: "roleTitle", label: "Role" }, { key: "salaryLevel", label: "Salary" }, { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> }]} />} />;
}

function ManpowerTab() {
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["manpower-plans"], queryFn: () => api<AnyRow[]>("/api/manpower-plans") });
  const [form, setForm] = React.useState({ tanggal: new Date().toISOString().slice(0, 10), departemen: "", plannedPeople: "", actualPeople: "", notes: "" });
  const create = useMutation({ mutationFn: () => api("/api/manpower-plans", { method: "POST", body: JSON.stringify(form) }), onSuccess: () => { toast.success("Manpower plan dibuat"); setForm({ tanggal: new Date().toISOString().slice(0, 10), departemen: "", plannedPeople: "", actualPeople: "", notes: "" }); invalidate67(qc); }, onError: (e) => toast.error((e as Error).message) });
  return <TwoCol form={<><TextInput type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /><TextInput placeholder="Departemen" value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })} /><TextInput type="number" placeholder="Planned people" value={form.plannedPeople} onChange={(e) => setForm({ ...form, plannedPeople: e.target.value })} /><TextInput type="number" placeholder="Actual people" value={form.actualPeople} onChange={(e) => setForm({ ...form, actualPeople: e.target.value })} /><TextArea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><Button onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Create Plan</Button></>} table={rows.isLoading ? <SkeletonRows /> : rows.error ? <ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : <DataTable rows={rows.data ?? []} columns={[{ key: "tanggal", label: "Tanggal", render: (r) => formatTanggal(r.tanggal) }, { key: "departemen", label: "Dept" }, { key: "plannedPeople", label: "Plan" }, { key: "actualPeople", label: "Actual" }, { key: "notes", label: "Notes" }]} />} />;
}

export function ControlTowerPage() {
  const rows = useQuery({ queryKey: ["control-tower"], queryFn: () => api<AnyRow>("/api/control-tower") });
  if (rows.isLoading) return <><PageHeader title="CEO Control Tower" /><SkeletonRows /></>;
  if (rows.error) return <><PageHeader title="CEO Control Tower" /><ErrorBox message={(rows.error as Error).message} onRetry={() => rows.refetch()} /></>;
  const data = (rows.data ?? {}) as AnyRow;
  return (
    <>
      <PageHeader title="CEO Control Tower" subtitle="Fase 7: ringkasan owner untuk order, AR, shipment, exception, CRM, dan manpower." />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Open task" value={data.openTasks ?? 0} icon={<BriefcaseBusiness className="h-5 w-5" />} />
        <Metric title="Open AR" value={formatRupiah(data.openAr ?? 0)} icon={<HandCoins className="h-5 w-5" />} />
        <Metric title="Invoice open" value={data.invoiceCount ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel><h2 className="mb-3 font-semibold">Exception waiting</h2><DataTable rows={data.exceptions ?? []} columns={[{ key: "nomor", label: "Nomor" }, { key: "tipe", label: "Type" }, { key: "status", label: "Status", render: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> }]} /></Panel>
        <Panel><h2 className="mb-3 font-semibold">CRM follow up</h2><DataTable rows={data.crmFollowUps ?? []} columns={[{ key: "nomor", label: "Nomor" }, { key: "title", label: "Title" }, { key: "stage", label: "Stage" }, { key: "nextFollowUp", label: "Next", render: (r) => formatTanggal(r.nextFollowUp) }]} /></Panel>
      </div>
    </>
  );
}

function TwoCol({ form, table }: { form: React.ReactNode; table: React.ReactNode }) {
  return <div className="grid gap-4 xl:grid-cols-[390px_1fr]"><Panel><div className="grid gap-3">{form}</div></Panel><Panel>{table}</Panel></div>;
}

function Metric({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return <Panel><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase text-muted">{title}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div><div className="rounded-md border border-border p-3 text-red-700 dark:text-red-300">{icon}</div></div></Panel>;
}

const tabClass = cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted", "data-[state=active]:bg-red-700 data-[state=active]:text-white dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-zinc-950");
const crmStages = ["LEAD", "QUALIFIED", "QUOTATION", "NEGOTIATION", "WON", "LOST"];

function invalidate67(qc: ReturnType<typeof useQueryClient>) {
  ["lookups", "crm-pipelines", "sample-approvals", "makloon-jobs", "employees", "manpower-plans", "control-tower"].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

function nameById(rows: AnyRow[] | undefined, id: string | null | undefined) {
  if (!id) return "-";
  const row = rows?.find((item) => item.id === id);
  return row?.nama ?? row?.nomor ?? row?.kode ?? row?.title ?? id;
}
