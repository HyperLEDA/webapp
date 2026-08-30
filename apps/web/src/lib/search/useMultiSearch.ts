import { useEffect, useState } from "react";
import { querySimple } from "@leda/lib/clients/backend";
import { QuerySimpleResponse } from "@leda/lib/clients/backend";
import { backendClient } from "@leda/lib/clients";
import { describeUnknownError } from "@leda/lib/tap";
import { resolveEligibleSearchTypes, SearchType } from "./searchTypes";

export type SearchSectionState =
  | { id: string; title: string; status: "loading" }
  | {
      id: string;
      title: string;
      status: "success";
      results: QuerySimpleResponse;
    }
  | { id: string; title: string; status: "empty" }
  | { id: string; title: string; status: "error"; message: string };

export type UseMultiSearchResult = {
  sections: SearchSectionState[];
  pageError: string | null;
};

async function fetchSearchTypeResult(
  type: SearchType,
  query: string,
  page: number,
  pageSize: number,
): Promise<Exclude<SearchSectionState, { status: "loading" }>> {
  const response = await querySimple({
    client: backendClient,
    query: {
      ...type.toQueryParams(query.trim()),
      page,
      page_size: pageSize,
    },
  });

  if (response.error) {
    return {
      id: type.id,
      title: type.title,
      status: "error",
      message: describeUnknownError(response.error),
    };
  }

  const results = response.data.data;
  if (results.objects.length === 0) {
    return {
      id: type.id,
      title: type.title,
      status: "empty",
    };
  }

  return {
    id: type.id,
    title: type.title,
    status: "success",
    results,
  };
}

export function useMultiSearch(
  query: string,
  page: number,
  pageSize: number,
): UseMultiSearchResult {
  const [sections, setSections] = useState<SearchSectionState[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSections([]);
      setPageError("Empty query");
      return;
    }

    const eligibleTypes = resolveEligibleSearchTypes(trimmed);
    if (eligibleTypes.length === 0) {
      setSections([]);
      setPageError(`No search types matched query ${query}`);
      return;
    }

    setPageError(null);
    setSections(
      eligibleTypes.map((type) => ({
        id: type.id,
        title: type.title,
        status: "loading" as const,
      })),
    );

    let cancelled = false;

    function fetchAndApply(type: SearchType): void {
      void fetchSearchTypeResult(type, trimmed, page, pageSize).then(
        (result) => {
          if (cancelled) {
            return;
          }
          setSections((current) =>
            current.map((section) =>
              section.id === type.id ? result : section,
            ),
          );
        },
      );
    }

    eligibleTypes.forEach(fetchAndApply);

    return () => {
      cancelled = true;
    };
  }, [query, page, pageSize]);

  return { sections, pageError };
}
