import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { DropdownFilter } from "./DropdownFilter";
import { TextFilter } from "./TextFilter";

const SEARCH_DEBOUNCE_MS = 300;

const PAGE_SIZE_OPTIONS = [
  { value: "10" },
  { value: "25" },
  { value: "50" },
  { value: "100" },
];

interface SearchPageSizeFiltersProps {
  query: string | null;
  pageSize: number;
  onQueryChange: (query: string) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchPlaceholder: string;
  children?: ReactNode;
}

export function SearchPageSizeFilters({
  query,
  pageSize,
  onQueryChange,
  onPageSizeChange,
  searchPlaceholder,
  children,
}: SearchPageSizeFiltersProps): ReactElement {
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
    <div className="flex flex-wrap gap-4 mb-4">
      <TextFilter
        title="Search"
        value={localQuery}
        onChange={handleQueryChange}
        placeholder={searchPlaceholder}
      />
      {children}
      <DropdownFilter
        title="Page size"
        options={PAGE_SIZE_OPTIONS}
        value={pageSize.toString()}
        onChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
      />
    </div>
  );
}
