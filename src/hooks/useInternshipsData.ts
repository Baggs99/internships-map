import { useState, useEffect } from 'react';
import type { InternshipsData } from '../types';

interface UseInternshipsDataResult {
  data: InternshipsData | null;
  loading: boolean;
  error: string | null;
}

export function useInternshipsData(): UseInternshipsDataResult {
  const [data, setData] = useState<InternshipsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/internships.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load internship data (HTTP ${res.status}). ` +
              'Run "npm run process-data" to generate public/data/internships.json.',
          );
        }
        return res.json() as Promise<InternshipsData>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Unknown error loading data.';
        setError(message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
