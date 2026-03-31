/**
 * Normalize a first+last name pair into a single lowercase, punctuation-free
 * string used as the matching key across both datasets.
 *
 * "Dan  Baglini"  → "dan baglini"
 * "O'Brien, Pat"  → "obrien pat"
 */
export function normalizeName(firstName: string, lastName: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // remove punctuation (apostrophes, hyphens, etc.)
      .replace(/\s+/g, ' ')    // collapse multiple spaces
      .trim();

  return `${clean(firstName)} ${clean(lastName)}`.trim();
}

/** Normalize a full "First Last" string (convenience wrapper). */
export function normalizeFullName(full: string): string {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ');
  return normalizeName(first, last);
}
