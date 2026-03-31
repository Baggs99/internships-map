import type { Location, FilterState } from '../types';

/** Returns locations that match all active filters.
 *
 * Search behaviour:
 *   - If the search term matches the city display name → include ALL people at
 *     that city (city-level match, don't filter the roster).
 *   - If the search term matches employer names only → include ONLY people
 *     whose employer matches (employer-level match, drill into the roster).
 *   - Dropdown filters (employer / industry / function) always narrow the roster.
 */
export function filterLocations(
  locations: Location[],
  filters: FilterState,
): Location[] {
  const searchLower = filters.search.toLowerCase().trim();

  return locations.reduce<Location[]>((acc, loc) => {
    // ── Geography filters ──────────────────────────────────────────
    if (filters.country && loc.country !== filters.country) return acc;
    if (filters.stateOrProvince && loc.stateOrProvince !== filters.stateOrProvince) return acc;

    // ── Determine how search applies to this location ──────────────
    const cityMatch = searchLower
      ? loc.displayName.toLowerCase().includes(searchLower)
      : true; // no search → all cities pass

    const employerSearchMatch = searchLower
      ? loc.people.some((p) => p.employer.toLowerCase().includes(searchLower))
      : false;

    // If there's a search term and neither city nor any employer matches → skip
    if (searchLower && !cityMatch && !employerSearchMatch) return acc;

    // ── Build the filtered people list ─────────────────────────────
    // Search narrows people only when the match came from employer names, not city name.
    const searchNarrowsPeople = searchLower && !cityMatch && employerSearchMatch;

    const filteredPeople = loc.people.filter((p) => {
      if (searchNarrowsPeople && !p.employer.toLowerCase().includes(searchLower))
        return false;
      if (filters.employer && p.employer !== filters.employer) return false;
      if (filters.industry && p.industry !== filters.industry) return false;
      if (filters.functionField && p.function !== filters.functionField) return false;
      if (filters.cohort && p.cohort !== filters.cohort) return false;
      return true;
    });

    // If any person-level filter is active and nothing survived, skip this city
    const personFiltersActive =
      searchNarrowsPeople ||
      filters.employer ||
      filters.industry ||
      filters.functionField ||
      filters.cohort;

    if (personFiltersActive && filteredPeople.length === 0) return acc;

    // ── minInterns check (against filtered count) ──────────────────
    const effectiveCount = personFiltersActive ? filteredPeople.length : loc.count;
    if (filters.minInterns > 1 && effectiveCount < filters.minInterns) return acc;

    // ── Rebuild location with narrowed people if needed ────────────
    if (personFiltersActive) {
      const employerCounts = new Map<string, number>();
      filteredPeople.forEach((p) =>
        employerCounts.set(p.employer, (employerCounts.get(p.employer) ?? 0) + 1),
      );
      const topEmployers = [...employerCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([e]) => e);

      acc.push({
        ...loc,
        count: filteredPeople.length,
        people: filteredPeople,
        topEmployers,
      });
    } else {
      acc.push(loc);
    }

    return acc;
  }, []);
}

/** Derive the set of filter option values from the full (unfiltered) dataset. */
export function buildFilterOptions(locations: Location[]) {
  const countries = [...new Set(locations.map((l) => l.country))]
    .filter(Boolean)
    .sort();

  const states = [...new Set(locations.map((l) => l.stateOrProvince))]
    .filter(Boolean)
    .sort();

  const employers = [
    ...new Set(locations.flatMap((l) => l.people.map((p) => p.employer))),
  ]
    .filter(Boolean)
    .sort();

  const industries = [
    ...new Set(locations.flatMap((l) => l.people.map((p) => p.industry))),
  ]
    .filter(Boolean)
    .sort();

  const functions = [
    ...new Set(locations.flatMap((l) => l.people.map((p) => p.function))),
  ]
    .filter(Boolean)
    .sort();

  // Cohorts — exclude "Unknown" from filter options if it's the only value
  const allCohorts = [
    ...new Set(locations.flatMap((l) => l.people.map((p) => p.cohort))),
  ].filter(Boolean);

  const hasRealCohorts = allCohorts.some((c) => c !== 'Unknown');
  const cohorts = (hasRealCohorts ? allCohorts : [])
    .filter((c) => c !== 'Unknown')
    .sort();

  return { countries, states, employers, industries, functions, cohorts };
}
