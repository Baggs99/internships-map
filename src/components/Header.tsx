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
    <div className="flex flex-col items-center px-3 md:px-4 py-1.5 border-r border-white/20 last:border-0">
      <span className={`text-sm md:text-lg font-bold leading-tight ${isFiltered ? 'text-yale-gold-light' : 'text-white'}`}>
        {typeof value === 'number' ? formatCount(value) : value}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-200 font-medium mt-0.5">{label}</span>
    </div>
  );
}

export default function Header({ summary, totalSummary }: Props) {
  const isFiltered = summary.totalInternships !== totalSummary.totalInternships;

  return (
    <header className="bg-yale-blue shadow-md flex-shrink-0 z-10">
      <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 gap-2">

        {/* Branding */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs md:text-sm leading-none">Y</span>
          </div>
          <div className="min-w-0">
            {/* Desktop title */}
            <h1 className="hidden md:block text-white font-bold text-base leading-tight">
              Yale SOM Summer 2025 Internships
            </h1>
            {/* Mobile title — shorter */}
            <h1 className="md:hidden text-white font-bold text-sm leading-tight">
              Yale SOM Internships
            </h1>

            {/* Subtitle — desktop only */}
            <p className="hidden md:block text-blue-200 text-xs leading-tight mt-0.5">
              Explore where classmates are interning by city, employer &amp; industry
            </p>

            {/* Demo badge + hint */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded">
                ⚠ Demo — Fake Data
              </span>
              <span className="hidden md:inline text-blue-200 text-[11px] font-medium">
                🔍 Zoom in to explore where students are going!
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center bg-white/10 rounded-xl flex-shrink-0">
          <Stat label="Internships" value={summary.totalInternships} isFiltered={isFiltered} />
          <Stat label="Cities"      value={summary.totalCities}       isFiltered={isFiltered} />
          {/* Hide less-critical stats on small screens */}
          <Stat label="Employers"   value={summary.totalEmployers}    isFiltered={isFiltered} />
          <div className="hidden sm:block border-r border-white/20 h-full" />
          <div className="hidden sm:flex">
            <Stat label="Countries" value={summary.totalCountries} isFiltered={isFiltered} />
          </div>
        </div>

      </div>
    </header>
  );
}
