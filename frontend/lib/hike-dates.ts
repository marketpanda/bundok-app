export function suggestedFinishDate(start: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return "";
  const timestamp = Date.parse(start + "T00:00:00Z");
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== start) return "";
  const next = new Date(timestamp + 86_400_000).toISOString().slice(0, 10);
  return next <= today ? next : "";
}
