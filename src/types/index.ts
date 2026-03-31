export interface Person {
  firstName: string;
  lastName: string;
  employer: string;
  industry: string;
  function: string;
  cohort: string;
  graduationYear?: number;
}

export interface Location {
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

export interface Summary {
  totalInternships: number;
  totalCities: number;
  totalEmployers: number;
  totalCountries: number;
}

export interface InternshipsData {
  summary: Summary;
  locations: Location[];
}

export type SortMode = 'count' | 'alpha' | 'diversity' | 'cohort';

export interface FilterState {
  search: string;
  country: string;
  stateOrProvince: string;
  employer: string;
  industry: string;
  functionField: string;
  cohort: string;
  minInterns: number;
  sortBy: SortMode;
}

export interface FilterOptions {
  countries: string[];
  states: string[];
  employers: string[];
  industries: string[];
  functions: string[];
  cohorts: string[];
}
