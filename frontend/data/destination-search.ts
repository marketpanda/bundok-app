/** Match common hiking names regardless of Mt/Mount, punctuation, or accents. */
export function normalizeDestinationSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(?:mount|mt)\b\.?\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function matchesDestinationSearch(values: string[], query: string): boolean {
  const terms = normalizeDestinationSearch(query).split(" ").filter(Boolean);
  const text = normalizeDestinationSearch(values.join(" "));
  return terms.every((term) => text.includes(term));
}
