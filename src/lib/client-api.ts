export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error ?? `Request gagal (${res.status})`;
    throw new Error(message);
  }
  return json.data as T;
}

export function optionize<T extends Record<string, any> & { id: string }>(rows: T[], label: (row: T) => string, hint?: (row: T) => string) {
  return rows.map((row) => ({ value: row.id, label: label(row), hint: hint?.(row) }));
}
