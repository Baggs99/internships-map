/**
 * Preprocessing script: reads the raw CSV, normalizes locations,
 * geocodes unique locations (via Nominatim or Google Geocoding API),
 * aggregates internship records by city, and writes public/data/internships.json.
 *
 * Usage: npm run process-data
 * The CSV file should be in the data/ folder. The script auto-discovers it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import {
  buildCohortLookup,
  matchCohort,
  createEmptyStats,
  printMatchStats,
  type CohortRecord,
} from './matchCohorts.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data');
const GEOCACHE_FILE = path.join(DATA_DIR, 'geocache.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'internships.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawRow {
  'First Name': string;
  'Last Name': string;
  Cohort?: string;           // present in some CSVs (e.g. dummy data)
  Employer: string;
  'Detailed Industry': string;
  'Detailed Function': string;
  'Job City': string;
  'US State / Canada Province': string;
  'Job Country': string;
}

interface NormalizedLocation {
  city: string;
  stateOrProvince: string;
  country: string;
  displayName: string;
  locationKey: string;
}

interface GeoCoords {
  lat: number;
  lng: number;
}

type GeoCache = Record<string, GeoCoords | null>;

interface Person {
  firstName: string;
  lastName: string;
  employer: string;
  industry: string;
  function: string;
  cohort: string;
  graduationYear?: number;
}

interface OutputLocation {
  id: string;
  city: string;
  stateOrProvince: string;
  country: string;
  displayName: string;
  lat: number;
  lng: number;
  count: number;
  topEmployers: string[];
  cohortBreakdown: Record<string, number>;
  people: Person[];
}

interface OutputData {
  summary: {
    totalInternships: number;
    totalCities: number;
    totalEmployers: number;
    totalCountries: number;
  };
  locations: OutputLocation[];
  meta: {
    generatedAt: string;
    sourceFile: string;
    ungeocodedLocations: string[];
  };
}

// ---------------------------------------------------------------------------
// Country normalization
// ---------------------------------------------------------------------------

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states': 'United States',
  'united states of america': 'United States',
  'united states (usa)': 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  england: 'United Kingdom',
  britain: 'United Kingdom',
  ca: 'Canada',
  canada: 'Canada',
  'hong kong s.a.r.': 'Hong Kong',
  'hong kong': 'Hong Kong',
  'hk': 'Hong Kong',
  'peoples republic of china': 'China',
  'p.r. china': 'China',
  'china mainland': 'China',
  'mainland china': 'China',
  'prc': 'China',
  'taiwan': 'Taiwan',
  'republic of china': 'Taiwan',
  brazil: 'Brazil',
  brasil: 'Brazil',
  france: 'France',
  germany: 'Germany',
  deutschland: 'Germany',
  japan: 'Japan',
  singapore: 'Singapore',
  australia: 'Australia',
  india: 'India',
  mexico: 'Mexico',
  méxico: 'Mexico',
  switzerland: 'Switzerland',
  sweden: 'Sweden',
  netherlands: 'Netherlands',
  'the netherlands': 'Netherlands',
  'south korea': 'South Korea',
  korea: 'South Korea',
  'united arab emirates': 'United Arab Emirates',
  uae: 'United Arab Emirates',
  israel: 'Israel',
  spain: 'Spain',
  italy: 'Italy',
  'saudi arabia': 'Saudi Arabia',
};

function normalizeCountry(raw: string): string {
  const clean = raw.trim();
  const lower = clean.toLowerCase();
  return COUNTRY_ALIASES[lower] ?? clean;
}

// US state name → abbreviation
const US_STATE_ABBREVS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY',
};

// Canadian province names → abbreviation
const CA_PROVINCE_ABBREVS: Record<string, string> = {
  alberta: 'AB', 'british columbia': 'BC', manitoba: 'MB', 'new brunswick': 'NB',
  'newfoundland and labrador': 'NL', 'nova scotia': 'NS', ontario: 'ON',
  'prince edward island': 'PE', quebec: 'QC', saskatchewan: 'SK',
  'northwest territories': 'NT', nunavut: 'NU', yukon: 'YT',
};

function abbreviateState(name: string, country: string): string {
  const lower = name.toLowerCase().trim();
  if (country === 'United States') return US_STATE_ABBREVS[lower] ?? name;
  if (country === 'Canada') return CA_PROVINCE_ABBREVS[lower] ?? name;
  return name;
}

// ---------------------------------------------------------------------------
// Location parsing: "New York - NY", "Paris - France", "Toronto - ON - Canada"
// ---------------------------------------------------------------------------

function parseJobCity(jobCity: string, stateCol: string, countryCol: string): NormalizedLocation {
  // The Job Country column is authoritative — never override it from city string parsing
  const country = normalizeCountry(countryCol) || 'Unknown';

  // Extract city: always use the first segment of "City - ST" or "City - Country" patterns
  const parts = jobCity.split(' - ').map((p) => p.trim()).filter(Boolean);
  const city = parts[0] || jobCity.trim();

  // State/province: the dedicated column is most reliable
  let stateOrProvince = '';
  if (stateCol && !stateCol.toLowerCase().includes('planning to work outside')) {
    stateOrProvince = abbreviateState(stateCol, country);
  }

  // Fallback: extract state from city string only for US/Canada, and only
  // if it looks like a genuine 2-letter state abbreviation (not "CA" → Canada ambiguity —
  // we already have the country from countryCol so this is unambiguous now)
  if (!stateOrProvince && parts.length >= 2 && (country === 'United States' || country === 'Canada')) {
    const candidate = parts[1];
    if (/^[A-Z]{2,3}$/.test(candidate)) {
      stateOrProvince = candidate;
    }
  }

  // Build display name
  let displayName: string;
  if (country === 'United States' || country === 'Canada') {
    displayName = stateOrProvince ? `${city}, ${stateOrProvince}` : city;
  } else {
    displayName = `${city}, ${country}`;
  }

  // Slug / location key
  const locationKey = [city, stateOrProvince, country]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return { city, stateOrProvince, country, displayName, locationKey };
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

function loadGeoCache(): GeoCache {
  if (fs.existsSync(GEOCACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(GEOCACHE_FILE, 'utf8')) as GeoCache;
    } catch {
      return {};
    }
  }
  return {};
}

function saveGeoCache(cache: GeoCache): void {
  fs.writeFileSync(GEOCACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Geocode using OpenStreetMap Nominatim (free, no key required). */
async function geocodeNominatim(query: string): Promise<GeoCoords | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'YaleSOMInternshipsMap/1.0 (educational use)',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) {
      console.warn(`  Nominatim HTTP ${res.status} for: ${query}`);
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.warn(`  Nominatim error for "${query}": ${String(e)}`);
    return null;
  }
}

/** Geocode using Google Geocoding API (requires GOOGLE_GEOCODING_API_KEY). */
async function geocodeGoogle(query: string, apiKey: string): Promise<GeoCoords | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status !== 'OK' || data.results.length === 0) {
      console.warn(`  Google Geocoding returned ${data.status} for: ${query}`);
      return null;
    }
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (e) {
    console.warn(`  Google Geocoding error for "${query}": ${String(e)}`);
    return null;
  }
}

async function geocodeLocation(
  loc: NormalizedLocation,
  cache: GeoCache,
  googleApiKey: string | undefined,
): Promise<GeoCoords | null> {
  if (loc.locationKey in cache) {
    return cache[loc.locationKey];
  }

  // Build a clear geocoding query
  const query = [loc.city, loc.stateOrProvince, loc.country]
    .filter(Boolean)
    .join(', ');

  console.log(`  Geocoding: ${query}`);

  let coords: GeoCoords | null = null;

  if (googleApiKey) {
    coords = await geocodeGoogle(query, googleApiKey);
    // Rate-limit: Google allows higher rates but let's be safe
    await sleep(200);
  } else {
    coords = await geocodeNominatim(query);
    // Nominatim: max 1 req/second required by usage policy
    await sleep(1100);
  }

  // If first attempt failed, try a simpler query (city + country only)
  if (!coords && loc.stateOrProvince) {
    const fallbackQuery = [loc.city, loc.country].filter(Boolean).join(', ');
    console.log(`  Retrying simpler query: ${fallbackQuery}`);
    if (googleApiKey) {
      coords = await geocodeGoogle(fallbackQuery, googleApiKey);
      await sleep(200);
    } else {
      coords = await geocodeNominatim(fallbackQuery);
      await sleep(1100);
    }
  }

  cache[loc.locationKey] = coords;
  return coords;
}

// ---------------------------------------------------------------------------
// Slug builder
// ---------------------------------------------------------------------------

function makeId(loc: NormalizedLocation): string {
  return loc.locationKey;
}

// ---------------------------------------------------------------------------
// CSV pre-processing — strip leading rows that are all-empty (e.g. ,,,,,,,,,)
// before passing to csv-parse so the real header row is first
// ---------------------------------------------------------------------------

function stripLeadingEmptyLines(raw: string): string {
  const lines = raw.split('\n');
  const firstReal = lines.findIndex((l) => l.replace(/[,\s]/g, '').length > 0);
  return firstReal > 0 ? lines.slice(firstReal).join('\n') : raw;
}

// ---------------------------------------------------------------------------
// CSV discovery
// ---------------------------------------------------------------------------

function findCsvFile(): string {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'));
  if (files.length === 0) {
    const rootCsvs = fs.readdirSync(ROOT).filter((f) => f.endsWith('.csv'));
    if (rootCsvs.length > 0) return path.join(ROOT, rootCsvs[0]);
    throw new Error(`No CSV file found in ${DATA_DIR} or ${ROOT}`);
  }
  // Prefer a file with "intern" in the name
  const internFile = files.find((f) => f.toLowerCase().includes('intern'));
  return path.join(DATA_DIR, internFile ?? files[0]);
}

/** Find cohort CSV — looks for a file with "cohort" (case-insensitive) in the name,
 *  but NOT the internship file. Returns null if not found. */
function findCohortCsvFile(): string | null {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'));
  const cohortFile = files.find(
    (f) => f.toLowerCase().includes('cohort') && !f.toLowerCase().includes('intern'),
  );
  return cohortFile ? path.join(DATA_DIR, cohortFile) : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Load env from .env if present
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) process.env[match[1]] = match[2].trim();
    }
  }

  // Use only the dedicated geocoding key — not the frontend Maps key
  const googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  const geocoderName = googleApiKey ? 'Google Geocoding API' : 'OpenStreetMap Nominatim (free)';

  console.log('\n========================================');
  console.log('  Yale SOM Internships — Data Processor');
  console.log('========================================');
  console.log(`Geocoder: ${geocoderName}\n`);

  // Ensure output dirs exist
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find and parse CSV
  const csvFile = findCsvFile();
  console.log(`Reading CSV: ${path.relative(ROOT, csvFile)}`);
  const rawText = fs.readFileSync(csvFile, 'utf8');
  // Strip any leading all-comma/blank rows (some exports add 2 empty rows before the header)
  const cleanedText = stripLeadingEmptyLines(rawText);
  const rows = parse(cleanedText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,  // Strip UTF-8 BOM that Excel often adds to CSV files
  }) as RawRow[];

  console.log(`Raw rows: ${rows.length}`);

  // Load cohort CSV (optional — gracefully skipped if not present)
  let cohortLookup = new Map<string, CohortRecord>();
  const cohortFile = findCohortCsvFile();
  if (cohortFile) {
    console.log(`Cohort CSV: ${path.relative(ROOT, cohortFile)}`);
    const cohortRaw = fs.readFileSync(cohortFile, 'utf8');
    const rawCohortRows = parse(cohortRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Array<Record<string, string>>;

    // Normalize to a standard shape regardless of whether the CSV uses
    // a single "Name" column or split "First Name"/"Last Name" columns.
    const cohortRows = rawCohortRows.map((row) => {
      let firstName = (row['First Name'] ?? '').trim();
      let lastName = (row['Last Name'] ?? '').trim();

      if (!firstName && !lastName && row['Name']) {
        // Split "John Smith" → first="John", last="Smith"
        // "Daisy Xiaoxiao Wu" → first="Daisy", last="Xiaoxiao Wu"
        const parts = row['Name'].trim().split(/\s+/);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }

      // Support both "Graduation Year" and "Class" column names
      const graduationYear =
        row['Graduation Year'] ?? row['Class'] ?? '';

      return {
        'First Name': firstName,
        'Last Name': lastName,
        Cohort: (row['Cohort'] ?? '').trim(),
        'Graduation Year': graduationYear,
      };
    });

    cohortLookup = buildCohortLookup(cohortRows);
    console.log(`Cohort records loaded: ${cohortLookup.size}`);
  } else {
    console.log('No cohort CSV found in data/ — all cohorts will be "Unknown".');
    console.log('To add cohorts: place a CSV with "cohort" in the filename in the data/ folder.');
  }

  const matchStats = createEmptyStats();

  // Load geocache
  const geoCache = loadGeoCache();
  const cachedCount = Object.keys(geoCache).length;
  if (cachedCount > 0) console.log(`Geocache: ${cachedCount} cached locations`);

  // Normalize each row's location and collect unique locations
  const skippedRows: string[] = [];
  const locationMap = new Map<string, NormalizedLocation>();
  const rowData: Array<{ person: Person; locKey: string }> = [];

  for (const row of rows) {
    const firstName = (row['First Name'] ?? '').trim();
    const lastName = (row['Last Name'] ?? '').trim();
    const employer = (row['Employer'] ?? '').trim();
    const industry = (row['Detailed Industry'] ?? '').trim();
    const func = (row['Detailed Function'] ?? '').trim();
    const jobCity = (row['Job City'] ?? '').trim();
    const stateCol = (row['US State / Canada Province'] ?? '').trim();
    const countryCol = (row['Job Country'] ?? '').trim();

    if (!firstName && !lastName && !employer) {
      skippedRows.push('(empty row)');
      continue;
    }

    if (!jobCity && !stateCol && !countryCol) {
      skippedRows.push(`${firstName} ${lastName} — no location data`);
      continue;
    }

    const loc = parseJobCity(jobCity, stateCol, countryCol);
    locationMap.set(loc.locationKey, loc);

    // If the CSV already has a Cohort column, use it directly and skip matching
    const inlineCohort = (row['Cohort'] ?? '').trim();
    let cohort: string;
    let graduationYear: number | undefined;

    if (inlineCohort) {
      // Normalize to Title Case (e.g. "GREEN" → "Green")
      cohort = inlineCohort.charAt(0).toUpperCase() + inlineCohort.slice(1).toLowerCase();
      matchStats.total++;
      matchStats.exact++;
    } else {
      const cohortResult = matchCohort(firstName, lastName, cohortLookup, matchStats);
      cohort = cohortResult.cohort;
      graduationYear = cohortResult.graduationYear;
    }

    rowData.push({
      person: {
        firstName,
        lastName,
        employer,
        industry,
        function: func,
        cohort,
        ...(graduationYear !== undefined ? { graduationYear } : {}),
      },
      locKey: loc.locationKey,
    });
  }

  const uniqueLocations = [...locationMap.values()];
  console.log(`Unique locations to geocode: ${uniqueLocations.length}`);
  if (skippedRows.length > 0) {
    console.log(`Skipped rows (${skippedRows.length}):`);
    skippedRows.forEach((r) => console.log(`  • ${r}`));
  }

  // Geocode all unique locations
  console.log('\nGeocoding…');
  let successCount = 0;
  let failCount = 0;
  const ungeocodedLocations: string[] = [];

  for (const loc of uniqueLocations) {
    const cached = geoCache[loc.locationKey];
    if (cached !== undefined) {
      // already in cache (may be null = known failure)
      if (cached) successCount++;
      else {
        failCount++;
        ungeocodedLocations.push(loc.displayName);
      }
      continue;
    }
    const coords = await geocodeLocation(loc, geoCache, googleApiKey);
    if (coords) {
      successCount++;
      console.log(`  ✓ ${loc.displayName} → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    } else {
      failCount++;
      ungeocodedLocations.push(loc.displayName);
      console.warn(`  ✗ FAILED: ${loc.displayName}`);
    }
    // Save cache incrementally (so we don't lose work if interrupted)
    saveGeoCache(geoCache);
  }

  console.log(`\nGeocoding results: ${successCount} succeeded, ${failCount} failed`);

  // Aggregate people by location
  const locationDataMap = new Map<
    string,
    { loc: NormalizedLocation; people: Person[]; coords: GeoCoords }
  >();

  for (const { person, locKey } of rowData) {
    const loc = locationMap.get(locKey)!;
    const coords = geoCache[locKey];
    if (!coords) continue; // skip un-geocodeable locations

    const existing = locationDataMap.get(locKey);
    if (existing) {
      existing.people.push(person);
    } else {
      locationDataMap.set(locKey, { loc, people: [person], coords });
    }
  }

  // Build output locations
  const outputLocations: OutputLocation[] = [];

  for (const [, { loc, people, coords }] of locationDataMap) {
    const employerCounts = new Map<string, number>();
    for (const p of people) {
      employerCounts.set(p.employer, (employerCounts.get(p.employer) ?? 0) + 1);
    }
    const topEmployers = [...employerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([e]) => e);

    // Cohort breakdown: { "Silver": 5, "Blue": 3, ... }
    const cohortBreakdown: Record<string, number> = {};
    for (const p of people) {
      cohortBreakdown[p.cohort] = (cohortBreakdown[p.cohort] ?? 0) + 1;
    }

    outputLocations.push({
      id: makeId(loc),
      city: loc.city,
      stateOrProvince: loc.stateOrProvince,
      country: loc.country,
      displayName: loc.displayName,
      lat: coords.lat,
      lng: coords.lng,
      count: people.length,
      topEmployers,
      cohortBreakdown,
      people: people.sort((a, b) => a.lastName.localeCompare(b.lastName)),
    });
  }

  // Sort by count descending
  outputLocations.sort((a, b) => b.count - a.count);

  // Summary stats
  const allEmployers = new Set(outputLocations.flatMap((l) => l.people.map((p) => p.employer)));
  const allCountries = new Set(outputLocations.map((l) => l.country));
  const totalInternships = outputLocations.reduce((s, l) => s + l.count, 0);

  const output: OutputData = {
    summary: {
      totalInternships,
      totalCities: outputLocations.length,
      totalEmployers: allEmployers.size,
      totalCountries: allCountries.size,
    },
    locations: outputLocations,
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFile: path.basename(csvFile),
      ungeocodedLocations,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');
  console.log(`Total internships mapped : ${totalInternships}`);
  console.log(`Unique cities            : ${outputLocations.length}`);
  console.log(`Unique employers         : ${allEmployers.size}`);
  console.log(`Countries represented    : ${allCountries.size}`);
  if (ungeocodedLocations.length > 0) {
    console.log(`\n⚠ Ungeocoded locations (${ungeocodedLocations.length}):`);
    ungeocodedLocations.forEach((l) => console.log(`  • ${l}`));
  }
  // Print cohort matching report
  if (cohortFile) printMatchStats(matchStats);

  console.log(`\nOutput written to: ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
