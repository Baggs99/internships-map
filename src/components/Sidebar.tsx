import type { Location, Summary } from '../types';
import CityCard from './CityCard';
import CityDetail from './CityDetail';
import EmptyState from './EmptyState';

interface Props {
  locations: Location[];
  selectedCity: Location | null;
  onSelectCity: (id: string | null) => void;
  summary: Summary;
}

function OverviewSection({ locations, summary }: { locations: Location[]; summary: Summary }) {
  const topCities = locations.slice(0, 3);

  return (
    <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
        Top Internship Cities
      </h2>
      {topCities.length === 0 ? (
        <p className="text-xs text-gray-400">No cities to show</p>
      ) : (
        <div className="space-y-2">
          {topCities.map((city, i) => (
            <div key={city.id} className="flex items-center gap-2.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  i === 0
                    ? 'bg-yale-gold text-white'
                    : i === 1
                      ? 'bg-yale-blue/70 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate block">
                  {city.displayName}
                </span>
              </div>
              <span className="text-xs font-semibold text-yale-blue flex-shrink-0">
                {city.count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mini summary bar */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <MiniStat value={summary.totalInternships} label="Total" />
        <MiniStat value={summary.totalCities} label="Cities" />
        <MiniStat value={summary.totalEmployers} label="Employers" />
        <MiniStat value={summary.totalCountries} label="Countries" />
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-bold text-yale-blue">{value}</span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function Sidebar({ locations, selectedCity, onSelectCity, summary }: Props) {
  if (selectedCity) {
    return (
      <aside className="w-full md:w-96 flex flex-col bg-white md:border-l border-gray-200 overflow-hidden shadow-sidebar flex-shrink-0">
        <CityDetail city={selectedCity} onClose={() => onSelectCity(null)} />
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-96 flex flex-col bg-white md:border-l border-gray-200 overflow-hidden shadow-sidebar flex-shrink-0">
      {/* Overview */}
      <OverviewSection locations={locations} summary={summary} />

      {/* City count header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            All Cities
          </h3>
          <span className="text-xs text-gray-400">{locations.length} cities</span>
        </div>
      </div>

      {/* Scrollable city list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-4 space-y-2">
        {locations.length === 0 ? (
          <EmptyState
            message="No cities match your filters"
            sub="Try adjusting the search or filters above"
          />
        ) : (
          locations.map((loc) => (
            <div key={loc.id}>
              <CityCard
                location={loc}
                isSelected={false}
                onClick={() => onSelectCity(loc.id)}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
