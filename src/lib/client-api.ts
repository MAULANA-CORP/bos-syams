export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const csrf = typeof document === "undefined" ? undefined : document.cookie.split("; ").find((item) => item.startsWith("bos_syams_csrf="))?.split("=").slice(1).join("=");
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error ?? `Request gagal (${res.status})`;
    const error = new Error(message) as Error & { status?: number; type?: string };
    error.status = res.status;
    error.type = json?.type;
    throw error;
  }
  return json.data as T;
}

export function optionize<T extends Record<string, any> & { id: string }>(rows: T[], label: (row: T) => string, hint?: (row: T) => string) {
  return rows.map((row) => ({ value: row.id, label: label(row), hint: hint?.(row) }));
}
