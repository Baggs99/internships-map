import { useState } from 'react';
import type { Location } from '../types';
import { groupByEmployer, buildCitySummaryText } from '../lib/formatUtils';
import { getCohortStyle, sortCohorts } from '../lib/cohortColors';
import PersonRow from './PersonRow';

interface Props {
  city: Location;
  onClose: () => void;
}

export default function CityDetail({ city, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<'employer' | 'name'>('employer');

  const handleCopy = async () => {
    const text = buildCitySummaryText(city.displayName, city.count, city.topEmployers);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const employerGroups = groupByEmployer(city.people);
  const sortedEmployers = [...employerGroups.keys()].sort((a, b) => {
    // Sort by count descending, then alpha
    const countDiff = (employerGroups.get(b)?.length ?? 0) - (employerGroups.get(a)?.length ?? 0);
    return countDiff !== 0 ? countDiff : a.localeCompare(b);
  });

  const sortedPeople = [...city.people].sort((a, b) =>
    sortBy === 'name'
      ? a.lastName.localeCompare(b.lastName)
      : a.employer.localeCompare(b.employer) || a.lastName.localeCompare(b.lastName),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-gray-900 leading-tight">{city.displayName}</h2>
              {city.stateOrProvince && city.country !== 'United States' && (
                <span className="text-xs text-gray-400">{city.stateOrProvince}</span>
              )}
              {city.country !== 'United States' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  {city.country}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-semibold text-yale-blue">{city.count}</span> intern{city.count !== 1 ? 's' : ''} ·{' '}
              {sortedEmployers.length} employer{sortedEmployers.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCopy}
              title="Copy summary"
              className="p-1.5 rounded-lg text-gray-400 hover:text-yale-blue hover:bg-yale-blue/10 transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              title="Back to all cities"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cohort breakdown pills — only shown when real cohort data exists */}
        {Object.keys(city.cohortBreakdown).some((c) => c !== 'Unknown') && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="text-[10px] text-gray-400 self-center uppercase tracking-wide mr-0.5">Cohorts:</span>
            {sortCohorts(Object.keys(city.cohortBreakdown)).map((cohort) => {
              if (cohort === 'Unknown') return null;
              const style = getCohortStyle(cohort);
              const count = city.cohortBreakdown[cohort] ?? 0;
              return (
                <span
                  key={cohort}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                >
                  {cohort}
                  <span style={{ opacity: 0.75, fontWeight: 400 }}>{count}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Employer summary pills */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {sortedEmployers.slice(0, 5).map((emp) => (
            <span
              key={emp}
              className="inline-flex items-center gap-1 text-xs bg-yale-blue/8 text-yale-blue px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(0,53,107,0.08)' }}
            >
              {emp}
              <span className="text-yale-blue/60 font-normal">
                {employerGroups.get(emp)?.length ?? 0}
              </span>
            </span>
          ))}
          {sortedEmployers.length > 5 && (
            <span className="text-xs text-gray-400 self-center">+{sortedEmployers.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Sort toggle */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Classmates</span>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setSortBy('employer')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${sortBy === 'employer' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            By Employer
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${sortBy === 'name' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            By Name
          </button>
        </div>
      </div>

      {/* Scrollable people list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {sortBy === 'employer' ? (
          <div className="px-4 pb-4">
            {sortedEmployers.map((employer) => {
              const people = employerGroups.get(employer) ?? [];
              return (
                <div key={employer} className="mt-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">{employer}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {people.length}
                    </span>
                  </div>
                  <div className="pl-1 border-l-2 border-gray-100 space-y-0.5">
                    {people.map((p, i) => (
                      <PersonRow key={i} person={p} showEmployer={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 pb-4 divide-y divide-gray-50">
            {sortedPeople.map((p, i) => (
              <PersonRow key={i} person={p} showEmployer />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
