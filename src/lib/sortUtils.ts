import type { Location, SortMode } from '../types';
// Location is used inside the cohort sort case above

export function sortLocations(locations: Location[], mode: SortMode): Location[] {
  const copy = [...locations];

  switch (mode) {
    case 'count':
      return copy.sort((a, b) => b.count - a.count);

    case 'alpha':
      return copy.sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );

    case 'diversity':
      // Sort by number of distinct employers (descending), break ties by count
      return copy.sort((a, b) => {
        const aDiversity = new Set(a.people.map((p) => p.employer)).size;
        const bDiversity = new Set(b.people.map((p) => p.employer)).size;
        if (bDiversity !== aDiversity) return bDiversity - aDiversity;
        return b.count - a.count;
      });

    case 'cohort':
      // Group cities by their dominant cohort (most interns), then alpha within group
      return copy.sort((a, b) => {
        const dominantCohort = (loc: Location) => {
          const breakdown = loc.cohortBreakdown;
          const sorted = Object.entries(breakdown).sort((x, y) => y[1] - x[1]);
          // Ignore "Unknown" as the dominant cohort if a real one exists
          const top = sorted.find(([c]) => c !== 'Unknown') ?? sorted[0];
          return top?.[0] ?? 'Unknown';
        };
        const ca = dominantCohort(a);
        const cb = dominantCohort(b);
        if (ca !== cb) return ca.localeCompare(cb);
        return b.count - a.count;
      });

    default:
      return copy;
  }
}
