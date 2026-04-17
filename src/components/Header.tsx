import type { Summary } from '../types';
import { formatCount } from '../lib/formatUtils';

interface Props {
  summary: Summary;
  totalSummary: Summary;
}

interface StatProps {
  label: string;
  value: string | number;
  isFiltered?: boolean;
}

function Stat({ label, value, isFiltered }: StatProps) {
  return (
    <div className="flex flex-col items-center px-4 py-1.5 border-r border-white/20 last:border-0">
      <span className={`text-lg font-bold leading-tight ${isFiltered ? 'text-yale-gold-light' : 'text-white'}`}>
        {typeof value === 'number' ? formatCount(value) : value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-blue-200 font-medium mt-0.5">{label}</span>
    </div>
  );
}

export default function Header({ summary, totalSummary }: Props) {
  const isFiltered = summary.totalInternships !== totalSummary.totalInternships;

  return (
    <header className="bg-yale-blue shadow-md flex-shrink-0 z-10">
      <div className="flex items-center justify-between px-5 py-3">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm leading-none">Y</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">
              Yale SOM Summer 2025 Internships
            </h1>
            <p className="text-blue-200 text-xs leading-tight mt-0.5">
              Explore where classmates are interning by city, employer &amp; industry
            </p>
            <p className="text-blue-300/60 text-[10px] leading-tight mt-0.5">
              Demo - Fake data
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center bg-white/10 rounded-xl">
          <Stat label="Internships" value={summary.totalInternships} isFiltered={isFiltered} />
          <Stat label="Cities" value={summary.totalCities} isFiltered={isFiltered} />
          <Stat label="Employers" value={summary.totalEmployers} isFiltered={isFiltered} />
          <Stat label="Countries" value={summary.totalCountries} isFiltered={isFiltered} />
        </div>
      </div>
    </header>
  );
}
