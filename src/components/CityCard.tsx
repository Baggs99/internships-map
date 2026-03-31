import type { Location } from '../types';
import { formatEmployerList } from '../lib/formatUtils';

interface Props {
  location: Location;
  isSelected: boolean;
  onClick: () => void;
}

export default function CityCard({ location, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3.5 border transition-all duration-150 group ${
        isSelected
          ? 'border-yale-blue bg-yale-blue/5 shadow-md ring-1 ring-yale-blue/30'
          : 'border-gray-100 bg-white hover:border-yale-blue/30 hover:shadow-card-hover shadow-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold leading-tight truncate ${
                isSelected ? 'text-yale-blue' : 'text-gray-800 group-hover:text-yale-blue'
              } transition-colors`}
            >
              {location.displayName}
            </span>
            {location.country !== 'United States' && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {location.country}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate leading-relaxed">
            {formatEmployerList(location.topEmployers)}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              isSelected
                ? 'bg-yale-blue text-white'
                : 'bg-yale-blue/10 text-yale-blue group-hover:bg-yale-blue group-hover:text-white'
            } transition-colors`}
          >
            {location.count}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">intern{location.count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </button>
  );
}
