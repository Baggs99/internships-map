interface Props {
  message?: string;
  sub?: string;
  onReset?: () => void;
}

export default function EmptyState({ message = 'No cities match your filters', sub, onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs text-yale-blue hover:underline font-medium"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
