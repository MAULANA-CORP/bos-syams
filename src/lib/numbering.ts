export function businessNumber(prefix: string, date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const tail = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${d}-${tail}`;
}
