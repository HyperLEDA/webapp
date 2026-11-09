import { ReactElement, useEffect, useRef, useState } from "react";
import { TextFilter } from "./TextFilter";

const SEARCH_DEBOUNCE_MS = 300;

interface SearchFilterProps {
  query: string | null;
  onQueryChange: (query: string) => void;
  placeholder: string;
}

export function SearchFilter({
  query,
  onQueryChange,
  placeholder,
}: SearchFilterProps): ReactElement {
  const [localQuery, setLocalQuery] = useState<string>(query || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(query ?? "");
  }, [query]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  function handleQueryChange(value: string): void {
    setLocalQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onQueryChange(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <TextFilter
      title="Search"
      value={localQuery}
      onChange={handleQueryChange}
      placeholder={placeholder}
    />
  );
}
