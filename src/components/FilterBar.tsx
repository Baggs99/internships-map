import type { FilterState, FilterOptions } from '../types';

interface Props {
  filters: FilterState;
  options: FilterOptions;
  hasActiveFilters: boolean;
  onChange: (f: FilterState) => void;
  onReset: () => void;
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function FilterSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs bg-white border border-gray-200 rounded-lg px-2.5 pr-7 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yale-blue/30 focus:border-yale-blue appearance-none cursor-pointer min-w-0 max-w-[160px]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px' }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default function FilterBar({ filters, options, hasActiveFilters, onChange, onReset }: Props) {
  const update = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search city or employer…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yale-blue/30 focus:border-yale-blue w-32 md:w-48"
          />
        </div>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        <FilterSelect
          label="All Countries"
          value={filters.country}
          options={options.countries}
          onChange={(v) => update('country', v)}
        />

        <FilterSelect
          label="All States/Provinces"
          value={filters.stateOrProvince}
          options={options.states}
          onChange={(v) => update('stateOrProvince', v)}
        />

        <FilterSelect
          label="All Employers"
          value={filters.employer}
          options={options.employers}
          onChange={(v) => update('employer', v)}
        />

        <FilterSelect
          label="All Industries"
          value={filters.industry}
          options={options.industries}
          onChange={(v) => update('industry', v)}
        />

        <FilterSelect
          label="All Functions"
          value={filters.functionField}
          options={options.functions}
          onChange={(v) => update('functionField', v)}
        />

        {options.cohorts.length > 0 && (
          <FilterSelect
            label="All Cohorts"
            value={filters.cohort}
            options={options.cohorts}
            onChange={(v) => update('cohort', v)}
          />
        )}

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* 2+ Interns toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
          <div
            onClick={() => update('minInterns', filters.minInterns === 1 ? 2 : 1)}
            className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${filters.minInterns >= 2 ? 'bg-yale-blue' : 'bg-gray-200'}`}
            style={{ height: '18px', width: '32px' }}
          >
            <span
              className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${filters.minInterns >= 2 ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-xs text-gray-600 whitespace-nowrap">2+ interns only</span>
        </label>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Sort */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-400">Sort:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => update('sortBy', e.target.value as FilterState['sortBy'])}
            className="h-8 text-xs bg-white border border-gray-200 rounded-lg px-2.5 pr-7 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yale-blue/30 focus:border-yale-blue appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px' }}
          >
            <option value="count">Most Interns</option>
            <option value="alpha">Alphabetical</option>
            <option value="diversity">Employer Diversity</option>
            <option value="cohort">By Cohort</option>
          </select>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <>
            <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              {filters.search && (
                <Chip label={`"${filters.search}"`} onRemove={() => update('search', '')} />
              )}
              {filters.country && (
                <Chip label={filters.country} onRemove={() => update('country', '')} />
              )}
              {filters.stateOrProvince && (
                <Chip label={filters.stateOrProvince} onRemove={() => update('stateOrProvince', '')} />
              )}
              {filters.employer && (
                <Chip label={filters.employer} onRemove={() => update('employer', '')} />
              )}
              {filters.industry && (
                <Chip label={filters.industry} onRemove={() => update('industry', '')} />
              )}
              {filters.functionField && (
                <Chip label={filters.functionField} onRemove={() => update('functionField', '')} />
              )}
              {filters.cohort && (
                <Chip label={`Cohort: ${filters.cohort}`} onRemove={() => update('cohort', '')} />
              )}
              {filters.minInterns >= 2 && (
                <Chip label="2+ interns" onRemove={() => update('minInterns', 1)} />
              )}
              <button
                onClick={onReset}
                className="text-xs text-red-400 hover:text-red-600 font-medium px-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-yale-blue/10 text-yale-blue text-xs font-medium px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-yale-blue-dark leading-none">
        ×
      </button>
    </span>
  );
}
