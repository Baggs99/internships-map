import { useState, useMemo, useEffect, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import Header from './Header';
import FilterBar from './FilterBar';
import MapView from './MapView';
import Sidebar from './Sidebar';
import { useInternshipsData } from '../hooks/useInternshipsData';
import { filterLocations, buildFilterOptions } from '../lib/filterUtils';
import { sortLocations } from '../lib/sortUtils';
import type { FilterState, Summary } from '../types';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  country: '',
  stateOrProvince: '',
  employer: '',
  industry: '',
  functionField: '',
  cohort: '',
  minInterns: 1,
  sortBy: 'count',
};

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-3 border-yale-blue border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm font-medium">Loading internship data…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Could not load data</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{error}</p>
        <p className="text-xs text-gray-400">
          Make sure you have run <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">npm run process-data</code> first.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { data, loading, error } = useInternshipsData();
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredLocations = useMemo(() => {
    if (!data) return [];
    return sortLocations(filterLocations(data.locations, filters), filters.sortBy);
  }, [data, filters]);

  // Clear selection when filtered out
  useEffect(() => {
    if (selectedCityId && !filteredLocations.find((l) => l.id === selectedCityId)) {
      setSelectedCityId(null);
    }
  }, [filteredLocations, selectedCityId]);

  const filteredSummary = useMemo((): Summary => {
    const totalInternships = filteredLocations.reduce((s, l) => s + l.count, 0);
    const allEmployers = new Set(filteredLocations.flatMap((l) => l.people.map((p) => p.employer)));
    const allCountries = new Set(filteredLocations.map((l) => l.country));
    return {
      totalInternships,
      totalCities: filteredLocations.length,
      totalEmployers: allEmployers.size,
      totalCountries: allCountries.size,
    };
  }, [filteredLocations]);

  const filterOptions = useMemo(
    () => (data ? buildFilterOptions(data.locations) : { countries: [], states: [], employers: [], industries: [], functions: [], cohorts: [] }),
    [data],
  );

  const selectedCity = useMemo(
    () => filteredLocations.find((l) => l.id === selectedCityId) ?? null,
    [filteredLocations, selectedCityId],
  );

  const handleSelectCity = useCallback((id: string | null) => {
    setSelectedCityId(id);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? 'DEMO_MAP_ID';

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!data) return null;

  const hasActiveFilters =
    filters.search ||
    filters.country ||
    filters.stateOrProvince ||
    filters.employer ||
    filters.industry ||
    filters.functionField ||
    filters.cohort ||
    filters.minInterns > 1;

  return (
    <APIProvider apiKey={apiKey ?? ''} libraries={['marker']}>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        <Header summary={filteredSummary} totalSummary={data.summary} />
        <FilterBar
          filters={filters}
          options={filterOptions}
          hasActiveFilters={!!hasActiveFilters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />
        <div className="flex flex-1 overflow-hidden">
          <MapView
            locations={filteredLocations}
            selectedId={selectedCityId}
            mapId={mapId}
            onSelectCity={handleSelectCity}
          />
          <Sidebar
            locations={filteredLocations}
            selectedCity={selectedCity}
            onSelectCity={handleSelectCity}
            summary={filteredSummary}
          />
        </div>
      </div>
    </APIProvider>
  );
}
