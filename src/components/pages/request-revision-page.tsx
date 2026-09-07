"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ClipboardCheck, ImagePlus, Paperclip, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button, EmptyState, GhostButton, PageHeader, Panel, StatusBadge, TextArea, TextInput } from "@/components/ui/primitives";
import { formatTanggal } from "@/lib/utils";

type ChecklistItem = { id: string; label: string; isDone: boolean; sortOrder: number };
type RevisionRow = {
  id: string;
  nomor: string;
  judul: string;
  modul: string;
  deskripsi: string;
  prioritas: string;
  status: "OPEN" | "DONE";
  imageData?: string | null;
  imageName?: string | null;
  version: number;
  createdAt: string;
  requestedBy: { nama: string; username: string; roles: { role: string }[] };
  checklist: ChecklistItem[];
};

type ImageAttachment = { data: string; name: string; mime: string };

const initialChecklist = [
  "Perubahan sudah terlihat di halaman yang diminta",
  "Alur utama dan validasi sudah berjalan",
  "Hak akses role terkait sudah sesuai",
  "Tampilan desktop dan HP sudah dicek",
];

export function RequestRevisionPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<"OPEN" | "DONE">("OPEN");
  const [form, setForm] = React.useState({ judul: "", modul: "", deskripsi: "", prioritas: "MEDIUM" });
  const [checklist, setChecklist] = React.useState(initialChecklist);
  const [newChecklist, setNewChecklist] = React.useState("");
  const [image, setImage] = React.useState<ImageAttachment | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const rows = useQuery({
    queryKey: ["revision-requests", filter],
    queryFn: () => api<RevisionRow[]>(`/api/revision-requests?status=${filter}`),
  });

  const create = useMutation({
    mutationFn: () => api("/api/revision-requests", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        checklist,
        imageData: image?.data ?? null,
        imageName: image?.name ?? null,
        imageMime: image?.mime ?? null,
      }),
    }),
    onSuccess: () => {
      toast.success("Request revision tersimpan");
      setForm({ judul: "", modul: "", deskripsi: "", prioritas: "MEDIUM" });
      setChecklist(initialChecklist);
      setImage(null);
      qc.invalidateQueries({ queryKey: ["revision-requests"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  function addChecklist() {
    const label = newChecklist.trim();
    if (!label) return;
    if (checklist.length >= 20) {
      toast.error("Checklist maksimal 20 item");
      return;
    }
    setChecklist((current) => [...current, label]);
    setNewChecklist("");
  }

  async function readImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ data: String(reader.result), name: file.name || "pasted-image.png", mime: file.type });
    reader.readAsDataURL(file);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const pastedImage = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    const file = pastedImage?.getAsFile();
    if (file) {
      event.preventDefault();
      void readImage(file);
    }
  }

  return (
    <>
      <PageHeader
        title="Request Revision"
        subtitle="Catat usulan perbaikan aplikasi untuk developer, lalu verifikasi hasilnya lewat checklist."
        action={<div className="flex items-center gap-2 text-sm text-muted"><ClipboardCheck className="h-4 w-4 text-red-700 dark:text-red-300" />Owner & Operations</div>}
      />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">Usulan baru</h2><p className="mt-1 text-sm text-muted">Tuliskan hasil yang diharapkan.</p></div>
            <StatusBadge tone="warn">Draft</StatusBadge>
          </div>
          <div className="grid gap-3">
            <TextInput placeholder="Judul revisi" value={form.judul} onChange={(event) => setForm({ ...form, judul: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput placeholder="Modul / halaman" value={form.modul} onChange={(event) => setForm({ ...form, modul: event.target.value })} />
              <SearchableSelect label="Prioritas" value={form.prioritas} onChange={(value) => setForm({ ...form, prioritas: value ?? "MEDIUM" })} options={["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => ({ value, label: value }))} />
            </div>
            <TextArea placeholder="Jelaskan kondisi sekarang, perubahan yang diharapkan, dan langkah untuk mengetesnya." value={form.deskripsi} onChange={(event) => setForm({ ...form, deskripsi: event.target.value })} />

            <div className="rounded-md border border-border p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-medium">Checklist verifikasi</p><p className="text-xs text-muted">Item ini dicentang setelah revisi diperiksa.</p></div><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
              <div className="space-y-2">
                {checklist.map((item, index) => <div className="flex items-center gap-2" key={`${item}-${index}`}><Check className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 flex-1 text-sm text-foreground">{item}</span><button type="button" title="Hapus checklist" aria-label={`Hapus checklist ${index + 1}`} onClick={() => setChecklist((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-zinc-100 hover:text-red-700 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button></div>)}
              </div>
              <div className="mt-3 flex gap-2"><TextInput placeholder="Tambah item checklist" value={newChecklist} onChange={(event) => setNewChecklist(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklist(); } }} /><GhostButton type="button" title="Tambah checklist" aria-label="Tambah checklist" onClick={addChecklist}><Plus className="h-4 w-4" /></GhostButton></div>
            </div>

            <div tabIndex={0} onPaste={handlePaste} title="Tempel screenshot dari clipboard dengan Ctrl+V" className="rounded-md border border-dashed border-border p-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-950">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ImagePlus className="h-4 w-4 text-red-700 dark:text-red-300" /><span className="text-sm font-medium">Lampiran tampilan</span></div><GhostButton type="button" onClick={() => fileInput.current?.click()}><Paperclip className="mr-2 h-4 w-4" />Pilih gambar</GhostButton></div>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImage(file); event.target.value = ""; }} />
              {image ? <div className="relative mt-3 overflow-hidden rounded-md border border-border"><Image src={image.data} alt={image.name} width={1000} height={600} unoptimized className="max-h-56 w-full object-contain bg-zinc-100 dark:bg-zinc-900" /><button type="button" title="Hapus gambar" aria-label="Hapus gambar" onClick={() => setImage(null)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/70 text-white"><X className="h-4 w-4" /></button></div> : <p className="mt-3 text-xs text-muted">Tempel gambar di area ini atau pilih file gambar.</p>}
            </div>
            <Button disabled={create.isPending || checklist.length === 0} onClick={() => create.mutate()}><Plus className="mr-2 h-4 w-4" />Kirim Request Revision</Button>
          </div>
        </Panel>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">Daftar revisi</h2><p className="mt-1 text-sm text-muted">Pilih status untuk melihat pekerjaan yang belum atau sudah diverifikasi.</p></div>
            <div className="flex gap-2" role="tablist" aria-label="Filter request revision">
              <button type="button" role="tab" aria-selected={filter === "OPEN"} onClick={() => setFilter("OPEN")} className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${filter === "OPEN" ? "border-red-700 bg-red-700 text-white" : "border-border bg-card text-muted"}`}><ClipboardCheck className="h-4 w-4" />Belum diperbaiki</button>
              <button type="button" role="tab" aria-selected={filter === "DONE"} onClick={() => setFilter("DONE")} className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${filter === "DONE" ? "border-emerald-700 bg-emerald-700 text-white" : "border-border bg-card text-muted"}`}><CheckCircle2 className="h-4 w-4" />Done</button>
            </div>
          </div>
          {rows.isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />)}</div> : rows.error ? <Panel className="border-red-300 bg-red-50 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{(rows.error as Error).message}</Panel> : rows.data?.length ? <div className="space-y-3">{rows.data.map((row) => <RevisionCard key={row.id} row={row} onUpdated={() => qc.invalidateQueries({ queryKey: ["revision-requests"] })} />)}</div> : <Panel><EmptyState title={filter === "OPEN" ? "Belum ada request terbuka" : "Belum ada request yang Done"}>Request revision dari owner dan tim operasional akan muncul di sini.</EmptyState></Panel>}
        </section>
      </div>
    </>
  );
}

function RevisionCard({ row, onUpdated }: { row: RevisionRow; onUpdated: () => void }) {
  const [pending, setPending] = React.useState(false);
  const update = async (payload: { status?: "OPEN" | "DONE"; checklist?: { id: string; isDone: boolean }[]; reason: string }) => {
    setPending(true);
    try {
      await api(`/api/revision-requests/${row.id}`, { method: "PATCH", body: JSON.stringify({ ...payload, version: row.version }) });
      toast.success(payload.status === "DONE" ? "Request ditandai Done" : "Checklist diperbarui");
      onUpdated();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const doneCount = row.checklist.filter((item) => item.isDone).length;
  const allDone = doneCount === row.checklist.length;
  const priorityTone = row.prioritas === "URGENT" || row.prioritas === "HIGH" ? "bad" : row.prioritas === "MEDIUM" ? "warn" : "neutral";
  return (
    <Panel className={row.status === "DONE" ? "border-emerald-200 dark:border-emerald-900" : "border-border"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted">{row.nomor}</span><StatusBadge tone={priorityTone}>{row.prioritas}</StatusBadge><StatusBadge tone={row.status === "DONE" ? "good" : "warn"}>{row.status === "DONE" ? "DONE" : "BELUM DIPERBAIKI"}</StatusBadge></div><h3 className="mt-2 text-lg font-semibold text-foreground">{row.judul}</h3><p className="mt-1 text-xs text-muted">{row.modul} · {row.requestedBy.nama} · {formatTanggal(row.createdAt)}</p></div>
        {row.status === "DONE" ? <GhostButton disabled={pending} onClick={() => update({ status: "OPEN", reason: "Request perlu direvisi kembali" })}><RotateCcw className="mr-2 h-4 w-4" />Buka kembali</GhostButton> : <Button disabled={pending || !allDone} title={!allDone ? "Selesaikan checklist terlebih dahulu" : "Tandai request selesai"} onClick={() => update({ status: "DONE", reason: "Checklist verifikasi selesai" })}><CheckCircle2 className="mr-2 h-4 w-4" />Tandai Done</Button>}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{row.deskripsi}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="rounded-md border border-border p-3"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-medium">Checklist verifikasi</p><span className="text-xs text-muted">{doneCount}/{row.checklist.length}</span></div><div className="space-y-2">{row.checklist.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={item.isDone} disabled={pending || row.status === "DONE"} onChange={(event) => update({ checklist: row.checklist.map((current) => ({ id: current.id, isDone: current.id === item.id ? event.target.checked : current.isDone })), reason: `Checklist: ${item.label}` })} className="mt-0.5 h-4 w-4 accent-red-700" /><span className={item.isDone ? "text-muted line-through" : "text-foreground"}>{item.label}</span></label>)}</div></div>
        {row.imageData ? <div className="overflow-hidden rounded-md border border-border"><Image src={row.imageData} alt={row.judul} width={1000} height={600} unoptimized className="h-full max-h-48 w-full object-contain bg-zinc-100 dark:bg-zinc-900" /></div> : <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border text-center text-xs text-muted">Tidak ada lampiran gambar</div>}
      </div>
    </Panel>
  );
}
