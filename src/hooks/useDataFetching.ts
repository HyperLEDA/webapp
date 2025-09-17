import { useEffect, useState } from "react";

interface UseDataFetchingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useDataFetching<T>(
  fetcher: () => Promise<T>,
  dependencies: React.DependencyList = [],
): UseDataFetchingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const result = await fetcher();
        setData(result);
      } catch (err) {
        setError(`${err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, dependencies);

  return { data, loading, error };
}
