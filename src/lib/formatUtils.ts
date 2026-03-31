/** Truncate a list to N items and append "and X others" if needed. */
export function formatEmployerList(employers: string[], max = 3): string {
  if (employers.length === 0) return '—';
  if (employers.length <= max) return employers.join(', ');
  const shown = employers.slice(0, max);
  const remaining = employers.length - max;
  return `${shown.join(', ')} +${remaining} more`;
}

/** Format a number with commas. */
export function formatCount(n: number): string {
  return n.toLocaleString();
}

/** Build a shareable text summary for clipboard copy. */
export function buildCitySummaryText(
  displayName: string,
  count: number,
  topEmployers: string[],
): string {
  const employerLine =
    topEmployers.length > 0 ? `Top employers: ${topEmployers.join(', ')}` : '';
  return [
    `Yale SOM Summer 2025 Internships — ${displayName}`,
    `${count} intern${count !== 1 ? 's' : ''}`,
    employerLine,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Group an array of people by their employer. */
export function groupByEmployer<T extends { employer: string }>(
  people: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const person of people) {
    const existing = map.get(person.employer) ?? [];
    existing.push(person);
    map.set(person.employer, existing);
  }
  return map;
}
