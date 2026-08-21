import { useEffect, useRef, useState } from "react";

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
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const dependencyKey = JSON.stringify(dependencies);

  useEffect(() => {
    setLoading(true);
    setError(null);
    async function fetchData(): Promise<void> {
      try {
        const result = await fetcherRef.current();
        setData(result);
      } catch (err) {
        setError(`${err}`);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [dependencyKey]);

  return { data, loading, error };
}
