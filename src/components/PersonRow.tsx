import type { Person } from '../types';
import { getCohortStyle } from '../lib/cohortColors';

interface Props {
  person: Person;
  showEmployer?: boolean;
}

export default function PersonRow({ person, showEmployer = true }: Props) {
  const initials = `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-yale-blue/10 text-yale-blue flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-gray-800">
            {person.firstName} {person.lastName}
          </span>
          {showEmployer && (
            <span className="text-xs text-gray-400 truncate">· {person.employer}</span>
          )}
          {person.cohort && person.cohort !== 'Unknown' && (() => {
            const style = getCohortStyle(person.cohort);
            return (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: style.bg, color: style.text }}
              >
                {person.cohort}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {person.industry && (
            <span className="text-[10px] text-gray-400">{person.industry}</span>
          )}
          {person.industry && person.function && (
            <span className="text-[10px] text-gray-300">·</span>
          )}
          {person.function && (
            <span className="text-[10px] text-gray-400">{person.function}</span>
          )}
        </div>
      </div>
    </div>
  );
}
