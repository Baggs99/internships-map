/**
 * Maps cohort names to Tailwind-compatible inline color values.
 * Yale SOM cohorts are named after colors, so we use those colors directly
 * where possible. Unknown/unmatched cohorts get a neutral gray.
 *
 * Add or edit entries here as needed when new cohort names are encountered.
 */

interface CohortStyle {
  bg: string;
  text: string;
  border: string;
}

const COHORT_COLOR_MAP: Record<string, CohortStyle> = {
  Silver:  { bg: '#9CA3AF', text: '#fff', border: '#6B7280' },
  Blue:    { bg: '#3B82F6', text: '#fff', border: '#2563EB' },
  Green:   { bg: '#10B981', text: '#fff', border: '#059669' },
  Gold:    { bg: '#D97706', text: '#fff', border: '#B45309' },
  Red:     { bg: '#EF4444', text: '#fff', border: '#DC2626' },
  Orange:  { bg: '#F97316', text: '#fff', border: '#EA580C' },
  Purple:  { bg: '#8B5CF6', text: '#fff', border: '#7C3AED' },
  Indigo:  { bg: '#6366F1', text: '#fff', border: '#4F46E5' },
  Teal:    { bg: '#14B8A6', text: '#fff', border: '#0D9488' },
  Pink:    { bg: '#EC4899', text: '#fff', border: '#DB2777' },
  Yellow:  { bg: '#EAB308', text: '#fff', border: '#CA8A04' },
  Black:   { bg: '#1F2937', text: '#fff', border: '#111827' },
  White:   { bg: '#F9FAFB', text: '#374151', border: '#D1D5DB' },
  Unknown: { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB' },
};

const FALLBACK_COLORS: CohortStyle[] = [
  { bg: '#6366F1', text: '#fff', border: '#4F46E5' },
  { bg: '#0EA5E9', text: '#fff', border: '#0284C7' },
  { bg: '#D946EF', text: '#fff', border: '#C026D3' },
  { bg: '#84CC16', text: '#fff', border: '#65A30D' },
];

const assignedFallbacks = new Map<string, CohortStyle>();

export function getCohortStyle(cohort: string): CohortStyle {
  // Normalize to Title Case so "BLUE", "blue", "Blue" all match
  const key = cohort.charAt(0).toUpperCase() + cohort.slice(1).toLowerCase();
  if (COHORT_COLOR_MAP[key]) return COHORT_COLOR_MAP[key];

  // Deterministically assign a fallback color for unknown cohort names
  if (!assignedFallbacks.has(cohort)) {
    const idx = assignedFallbacks.size % FALLBACK_COLORS.length;
    assignedFallbacks.set(cohort, FALLBACK_COLORS[idx]);
  }
  return assignedFallbacks.get(cohort)!;
}

/** Sort cohort names with "Unknown" always last. */
export function sortCohorts(cohorts: string[]): string[] {
  return [...cohorts].sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return a.localeCompare(b);
  });
}
