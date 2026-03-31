/**
 * Cohort matching logic.
 *
 * Matching order:
 *   1. Apply NAME_OVERRIDES (handle nickname/abbreviation mismatches)
 *   2. Exact normalized name match
 *   3. Fallback: same last name + same first initial (only if exactly 1 result)
 *   4. Ambiguous or no match → cohort = "Unknown"
 *
 * To handle a name mismatch, add an entry to NAME_OVERRIDES below.
 * Key   = normalized name as it appears in the INTERNSHIP dataset
 * Value = normalized name as it appears in the COHORT dataset
 */

import { normalizeName } from './normalizeName.js';

// ---------------------------------------------------------------------------
// Manual overrides — edit this when names differ between the two CSVs
// ---------------------------------------------------------------------------
export const NAME_OVERRIDES: Record<string, string> = {
  // Internship CSV name (normalized) → Cohort CSV name (normalized)

  // Goes by first name "Eric" in internship data; full name in cohort CSV
  "eric kim": "eric beomjoon kim",

  // Goes by middle name "Arisa" in internship data; cohort CSV uses first name "Rei"
  "arisa marshall": "rei marshall",

  // Compound last names truncated in internship CSV
  "juanita penuela": "juanita penuela avila",
  "mariana rivas": "mariana rivas herazo",

  // Cohort CSV has repeated last name ("Sanjanaa Subramanian Subramanian")
  "sanjanaa subramanian": "sanjanaa subramanian subramanian",

  // Uses Chinese given name "Xiaotong" in internship data; cohort CSV uses English name "Seline"
  "xiaotong sun": "seline sun",

  // Internship CSV lists English nickname "Daisy" as first name; cohort CSV uses just "Xiaoxiao Wu"
  "daisy xiaoxiao wu": "xiaoxiao wu",

  // Internship CSV uses English name "John"; cohort CSV uses Korean romanization "Joon"
  "john park": "joon park",
};

/**
 * Hardcoded cohort assignments for people not in the cohort CSV
 * (e.g. Silver Scholars on leave whose names don't appear in the active student list).
 * Key = normalized full name as it appears in the INTERNSHIP dataset.
 */
export const HARDCODED_COHORTS: Record<string, { cohort: string; graduationYear: number }> = {
  "jenny wang":             { cohort: "GOLD",   graduationYear: 2028 },
  "haider sultan":          { cohort: "RED",    graduationYear: 2028 },
  "sanket desai":           { cohort: "RED",    graduationYear: 2028 },
  "rachel a lee":           { cohort: "GREEN",  graduationYear: 2028 },
  "santiago navarro roby":  { cohort: "SILVER", graduationYear: 2028 },
  "nataliia nevinchana":    { cohort: "GOLD",   graduationYear: 2028 },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortRecord {
  firstName: string;
  lastName: string;
  cohort: string;
  graduationYear?: number;
  normalizedName: string;
}

export type MatchType = 'exact' | 'override' | 'fallback' | 'ambiguous' | 'none';

export interface MatchResult {
  cohort: string;
  graduationYear?: number;
  matchType: MatchType;
}

export interface MatchStats {
  total: number;
  exact: number;
  override: number;
  fallback: number;
  unmatched: number;
  ambiguous: number;
  unmatchedNames: string[];
  ambiguousNames: string[];
}

// ---------------------------------------------------------------------------
// Build lookup map from cohort CSV rows
// ---------------------------------------------------------------------------

interface RawCohortRow {
  'First Name': string;
  'Last Name': string;
  'Cohort': string;
  'Graduation Year'?: string;
}

export function buildCohortLookup(rows: RawCohortRow[]): Map<string, CohortRecord> {
  const map = new Map<string, CohortRecord>();

  for (const row of rows) {
    const firstName = (row['First Name'] ?? '').trim();
    const lastName = (row['Last Name'] ?? '').trim();
    const cohort = (row['Cohort'] ?? '').trim();
    const gradYearRaw = (row['Graduation Year'] ?? '').trim();
    const graduationYear = gradYearRaw ? parseInt(gradYearRaw, 10) : undefined;

    if (!firstName && !lastName) continue;

    const normalizedName = normalizeName(firstName, lastName);

    // If two rows have the same name, last one wins (log warning)
    if (map.has(normalizedName)) {
      console.warn(`  ⚠ Duplicate name in cohort data: "${firstName} ${lastName}"`);
    }

    map.set(normalizedName, { firstName, lastName, cohort, graduationYear, normalizedName });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Match a single internship record against the cohort lookup
// ---------------------------------------------------------------------------

export function createEmptyStats(): MatchStats {
  return {
    total: 0,
    exact: 0,
    override: 0,
    fallback: 0,
    unmatched: 0,
    ambiguous: 0,
    unmatchedNames: [],
    ambiguousNames: [],
  };
}

export function matchCohort(
  firstName: string,
  lastName: string,
  lookup: Map<string, CohortRecord>,
  stats: MatchStats,
): MatchResult {
  stats.total++;

  if (!firstName && !lastName) {
    stats.unmatched++;
    return { cohort: 'Unknown', matchType: 'none' };
  }

  // Step 0: Check hardcoded assignments (Silver Scholars on leave, etc.)
  const normalizedRaw = normalizeName(firstName, lastName);
  const hardcoded = HARDCODED_COHORTS[normalizedRaw];
  if (hardcoded) {
    stats.override++;
    return { cohort: hardcoded.cohort, graduationYear: hardcoded.graduationYear, matchType: 'override' };
  }

  // Step 1: Apply name override mapping
  const normalizedKey = NAME_OVERRIDES[normalizedRaw] ?? normalizedRaw;
  const usedOverride = normalizedKey !== normalizedRaw;

  // Step 2: Exact (or override) match
  const exactRecord = lookup.get(normalizedKey);
  if (exactRecord) {
    if (usedOverride) stats.override++;
    else stats.exact++;
    return {
      cohort: exactRecord.cohort,
      graduationYear: exactRecord.graduationYear,
      matchType: usedOverride ? 'override' : 'exact',
    };
  }

  // Step 3: Fallback — same last name token(s) + same first initial
  const keyParts = normalizedKey.split(' ');
  const firstInitial = keyParts[0]?.[0] ?? '';
  const lastNameKey = keyParts.slice(1).join(' ');

  const candidates = [...lookup.values()].filter((r) => {
    const rParts = r.normalizedName.split(' ');
    const rFirst = rParts[0]?.[0] ?? '';
    const rLast = rParts.slice(1).join(' ');
    return rLast === lastNameKey && rFirst === firstInitial;
  });

  if (candidates.length === 1) {
    stats.fallback++;
    return {
      cohort: candidates[0].cohort,
      graduationYear: candidates[0].graduationYear,
      matchType: 'fallback',
    };
  }

  if (candidates.length > 1) {
    stats.ambiguous++;
    stats.ambiguousNames.push(`${firstName} ${lastName}`);
    return { cohort: 'Unknown', matchType: 'ambiguous' };
  }

  // No match
  stats.unmatched++;
  stats.unmatchedNames.push(`${firstName} ${lastName}`);
  return { cohort: 'Unknown', matchType: 'none' };
}

// ---------------------------------------------------------------------------
// Print summary report
// ---------------------------------------------------------------------------

export function printMatchStats(stats: MatchStats): void {
  const matched = stats.exact + stats.override + stats.fallback;
  const matchRate = stats.total > 0 ? Math.round((matched / stats.total) * 100) : 0;

  console.log('\nCohort Matching Results:');
  console.log(`  Total records    : ${stats.total}`);
  console.log(`  Exact matches    : ${stats.exact}`);
  console.log(`  Override matches : ${stats.override}`);
  console.log(`  Fallback matches : ${stats.fallback}`);
  console.log(`  Unmatched        : ${stats.unmatched}`);
  console.log(`  Ambiguous        : ${stats.ambiguous}`);
  console.log(`  Match rate       : ${matchRate}%`);

  if (stats.unmatchedNames.length > 0) {
    console.log('\n  Unmatched names (add to NAME_OVERRIDES or check cohort CSV):');
    stats.unmatchedNames.forEach((n) => console.log(`    • ${n}`));
  }

  if (stats.ambiguousNames.length > 0) {
    console.log('\n  Ambiguous names (multiple possible matches — add to NAME_OVERRIDES):');
    stats.ambiguousNames.forEach((n) => console.log(`    • ${n}`));
  }
}
