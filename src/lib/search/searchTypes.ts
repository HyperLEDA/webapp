import {
  formatCoordinateInspectHint,
  inspectCoordinateQuery,
  parseCoordinateQuery,
} from "../astronomy/parseCoordinateQuery";
import type { QuerySimpleData } from "../../clients/backend/types.gen";

export type SearchQueryParams = Omit<
  NonNullable<QuerySimpleData["query"]>,
  "page" | "page_size" | "catalogs"
>;

export type SearchTypePartial = {
  hint: string;
};

export type SearchType = {
  id: string;
  title: string;
  match: (query: string) => string | null;
  partialInspect?: (query: string) => SearchTypePartial | null;
  toQueryParams: (query: string) => SearchQueryParams;
};

function regexSearchType(opts: {
  id: string;
  title: string;
  patterns: RegExp[];
  formatSuggestion: (query: string) => string;
  toQueryParams: SearchType["toQueryParams"];
  partialInspect?: SearchType["partialInspect"];
}): SearchType {
  return {
    id: opts.id,
    title: opts.title,
    match: (query: string) => {
      if (!opts.patterns.some((pattern) => pattern.test(query))) {
        return null;
      }
      return opts.formatSuggestion(query);
    },
    partialInspect: opts.partialInspect,
    toQueryParams: opts.toQueryParams,
  };
}

const pgcSearchType = regexSearchType({
  id: "pgc",
  title: "PGC",
  patterns: [/^\d+$/],
  formatSuggestion: (query) => `Will search PGC: ${query}`,
  toQueryParams: (query) => ({ pgcs: [Number(query)] }),
});

const designationSearchType = regexSearchType({
  id: "designation",
  title: "Designation",
  patterns: [/^.+$/],
  formatSuggestion: (query) => `Will search designation containing: ${query}`,
  toQueryParams: (query) => ({ name: query }),
});

const coordinatesSearchType: SearchType = {
  id: "coordinates",
  title: "Coordinates",
  match: (query) => {
    const inspected = inspectCoordinateQuery(query);
    if (inspected.status !== "valid") {
      return null;
    }
    const hint = formatCoordinateInspectHint(inspected);
    if (!hint) {
      return null;
    }
    return `Will search around coordinates: ${hint}`;
  },
  partialInspect: (query) => {
    const inspected = inspectCoordinateQuery(query);
    if (inspected.status !== "partial") {
      return null;
    }
    const hint = formatCoordinateInspectHint(inspected);
    if (!hint) {
      return null;
    }
    return { hint };
  },
  toQueryParams: (query) => {
    const coordinateQuery = parseCoordinateQuery(query);
    if (!coordinateQuery) {
      throw new Error(`Invalid coordinate query: ${query}`);
    }
    return coordinateQuery.toQueryParams();
  },
};

export const SEARCH_TYPES: SearchType[] = [
  pgcSearchType,
  designationSearchType,
  coordinatesSearchType,
];

export function resolveEligibleSearchTypes(query: string): SearchType[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  return SEARCH_TYPES.filter((type) => type.match(trimmed) !== null);
}

export function inspectSearchTypes(query: string): {
  eligible: { type: SearchType; suggestion: string }[];
  partial: { type: SearchType; hint: string }[];
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { eligible: [], partial: [] };
  }

  const eligible: { type: SearchType; suggestion: string }[] = [];
  const partial: { type: SearchType; hint: string }[] = [];

  for (const type of SEARCH_TYPES) {
    const suggestion = type.match(trimmed);
    if (suggestion !== null) {
      eligible.push({ type, suggestion });
      continue;
    }
    const partialResult = type.partialInspect?.(trimmed) ?? null;
    if (partialResult) {
      partial.push({ type, hint: partialResult.hint });
    }
  }

  return { eligible, partial };
}
