# Yale SOM Summer 2025 Internships Map

An interactive web app that visualizes where Yale SOM classmates are interning during Summer 2025. Built with React, TypeScript, Vite, Tailwind CSS, and the Google Maps JavaScript API.

---

## What It Does

- Plots one marker per city on a Google Map, showing the number of interns
- Clusters nearby markers at low zoom levels
- Right-hand sidebar shows a ranked city list, top employers, and full classmate roster per city
- Filter by country, state/province, employer, industry, function, and intern count
- Search by city name or employer name
- Click any map marker or city card to see the full detail view for that city
- Active filters reflected in real time on both the map and the sidebar

---

## Setup

### 1. Prerequisites

- Node.js 18 or later (required for built-in `fetch` in the preprocessing script)
- A Google Maps JavaScript API key

### 2. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Maps JavaScript API**
4. (Optional but recommended) Enable **Geocoding API** if you want to use Google for geocoding instead of the free OpenStreetMap fallback
5. Create an API key under **Credentials**
6. Restrict the key to your domain in production

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here

# Optional — creates a custom-styled map and enables AdvancedMarkerElement
# Create a Map ID at: https://console.cloud.google.com/google/maps-apis/studio/maps
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here

# Optional — if you prefer Google Geocoding over the free Nominatim fallback
GOOGLE_GEOCODING_API_KEY=your_key_here
```

> **Note:** If you omit `VITE_GOOGLE_MAPS_MAP_ID`, the app uses `DEMO_MAP_ID` which is fine for development but does not support custom map styling.

### 4. Install Dependencies

```bash
npm install
```

---

## Data Pipeline

### Where to Place the CSV

Drop your CSV file in the `data/` folder. The preprocessing script will auto-discover it (it looks for any `.csv` file in `data/` containing "intern" in the name, or the first CSV it finds).

The CSV must have these columns (header row required):

| Column | Description |
|---|---|
| `First Name` | Classmate first name |
| `Last Name` | Classmate last name |
| `Employer` | Company / employer name |
| `Detailed Industry` | Industry category |
| `Detailed Function` | Job function |
| `Job City` | City and state, e.g. `New York - NY` or `Paris - France` |
| `US State / Canada Province` | Full state/province name, or "Planning to work outside of the US" |
| `Job Country` | Full country name, e.g. `United States (USA)`, `France`, `Canada` |

### Run the Preprocessing Script

```bash
npm run process-data
```

This script:
1. Reads the CSV from `data/`
2. Normalizes all location fields (city, state, country, display name)
3. Geocodes each unique location using **OpenStreetMap Nominatim** (free, no API key needed) by default, or Google Geocoding API if `GOOGLE_GEOCODING_API_KEY` is set
4. Caches geocoding results in `data/geocache.json` — re-running the script skips already-cached locations
5. Aggregates all internship records by city
6. Writes the final JSON to `public/data/internships.json`
7. Prints a summary to the console

#### Geocoding Cache

The cache at `data/geocache.json` stores `{ lat, lng }` per location key. If a location fails to geocode, `null` is stored — it will be retried on the next run only if you delete that entry or clear the cache.

To force a full re-geocode, delete `data/geocache.json` before running:

```bash
del data\geocache.json   # Windows
rm data/geocache.json    # Mac/Linux
npm run process-data
```

---

## Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. The `public/data/internships.json` file is included in the build automatically.

### Deploying to Render or Vercel

**Vercel:**
1. Push the project to GitHub
2. Import the repo in Vercel
3. Set `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID` as environment variables
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Make sure `public/data/internships.json` is committed (it's the preprocessed data)

**Render (Static Site):**
1. Push to GitHub
2. Create a new **Static Site** in Render
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in the Render dashboard

> **Important:** The `public/data/internships.json` file must be committed to the repo before deploying, since the hosting platforms don't run `npm run process-data` automatically. Run the preprocessing script locally first and commit the output.

---

## Project Structure

```
├── data/                        # Raw CSV and geocache (not committed to git)
│   └── geocache.json            # Auto-generated geocoding cache
├── public/
│   └── data/
│       └── internships.json     # Processed data consumed by the frontend
├── scripts/
│   └── processInternships.ts    # Data preprocessing pipeline
├── src/
│   ├── components/
│   │   ├── App.tsx              # Root component, state management
│   │   ├── Header.tsx           # Title bar + stats
│   │   ├── FilterBar.tsx        # All filter controls
│   │   ├── MapView.tsx          # Google Map + marker clustering
│   │   ├── Sidebar.tsx          # City list + overview
│   │   ├── CityCard.tsx         # Single city card in the list
│   │   ├── CityDetail.tsx       # Full city detail panel
│   │   ├── PersonRow.tsx        # Single classmate row
│   │   └── EmptyState.tsx       # Empty/no-results state
│   ├── hooks/
│   │   └── useInternshipsData.ts # Data fetching hook
│   ├── lib/
│   │   ├── filterUtils.ts       # Filter + buildFilterOptions logic
│   │   ├── sortUtils.ts         # Sort modes
│   │   └── formatUtils.ts       # Display helpers
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   ├── main.tsx
│   └── index.css
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Color Scheme

- **Yale Blue** `#00356B` — primary map markers, accents
- **Yale Gold** `#978D4F` — selected city marker
- **Light Blue** `#286DC0` — hover states

---

## Notes

- The preprocessing script requires Node.js 18+ for the built-in `fetch` API used to call Nominatim/Google Geocoding.
- Nominatim has a 1-request/second rate limit enforced by the script's `sleep(1100ms)` delay.
- If a location fails to geocode, that intern is excluded from the map (their row is preserved in the script's failure log).
- The `data/` folder is gitignored to avoid committing the raw CSV. The `public/data/internships.json` output file should be committed.
