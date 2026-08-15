import { ReactElement, useEffect, useRef } from "react";
import {
  NavigateFunction,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { MdMyLocation } from "react-icons/md";
import { SearchBar } from "../components/ui/Searchbar";
import { CommonTable, Column } from "../components/ui/CommonTable";
import { Loading } from "../components/core/Loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/ErrorPage";
import { useDataFetching } from "../hooks/useDataFetching";
import { querySimple } from "@hyperleda/lib/clients/backend";
import { PgcObject, QuerySimpleResponse } from "@hyperleda/lib/clients/backend";
import { Link } from "../components/core/Link";
import { Declination, RightAscension } from "../components/core/Astronomy";
import { AladinViewer, AladinViewerHandle } from "../components/core/Aladin";
import { Button } from "@hyperleda/lib/ui";
import { Pagination } from "../components/ui/Pagination";
import { backendClient } from "@hyperleda/lib/clients";
import {
  resolveEligibleSearchTypes,
  SearchType,
} from "../lib/search/searchTypes";

const MIN_ALADIN_FOV_DEG = 0.05;
const ALADIN_FOV_PADDING = 1.4;

function searchHandler(navigate: NavigateFunction) {
  return function f(query: string) {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };
}

function pageChangeHandler(
  navigate: NavigateFunction,
  query: string,
  pageSize: number,
  newPage: number,
) {
  navigate(
    `/query?q=${encodeURIComponent(query)}&page=${newPage}&pagesize=${pageSize}`,
  );
}

type SkySource = {
  ra: number;
  dec: number;
  label: string;
  id: number;
};

type SkyView = {
  ra: number;
  dec: number;
  fov: number;
};

type SearchSection = {
  id: string;
  title: string;
  results: QuerySimpleResponse;
};

type MultiSearchResults = {
  sections: SearchSection[];
};

function objectsToSkySources(objects: PgcObject[]): SkySource[] {
  return objects.flatMap((object) => {
    const equatorial = object.catalogs.coordinates?.equatorial;
    if (equatorial?.ra === undefined || equatorial?.dec === undefined) {
      return [];
    }

    return [
      {
        ra: equatorial.ra,
        dec: equatorial.dec,
        label: object.catalogs.designation?.name || `PGC ${object.pgc}`,
        id: object.pgc,
      },
    ];
  });
}

function skyViewForSources(sources: SkySource[]): SkyView | null {
  if (sources.length === 0) {
    return null;
  }

  const ra =
    sources.reduce((sum, source) => sum + source.ra, 0) / sources.length;
  const dec =
    sources.reduce((sum, source) => sum + source.dec, 0) / sources.length;

  if (sources.length === 1) {
    return { ra, dec, fov: MIN_ALADIN_FOV_DEG };
  }

  const raSpan =
    Math.max(...sources.map((source) => source.ra)) -
    Math.min(...sources.map((source) => source.ra));
  const decSpan =
    Math.max(...sources.map((source) => source.dec)) -
    Math.min(...sources.map((source) => source.dec));
  const fov =
    Math.max(raSpan, decSpan, MIN_ALADIN_FOV_DEG) * ALADIN_FOV_PADDING;

  return { ra, dec, fov };
}

function resultTableColumns(): Column[] {
  return [
    { name: "", width: "fit" },
    {
      name: "PGC",
      renderCell: (value: React.ReactElement | string | number) => (
        <Link href={`/object/${value}`}>{value}</Link>
      ),
    },
    { name: "Name" },
    { name: "Type" },
    { name: "Velocity" },
    {
      name: "RA",
      renderCell: (value: React.ReactElement | string | number) =>
        typeof value === "number" ? <RightAscension value={value} /> : value,
    },
    {
      name: "Dec",
      renderCell: (value: React.ReactElement | string | number) =>
        typeof value === "number" ? <Declination value={value} /> : value,
    },
  ];
}

function objectsToTableData(
  objects: PgcObject[],
  onLocate: (ra: number, dec: number) => void,
) {
  return objects.map((object) => {
    const equatorial = object.catalogs.coordinates?.equatorial;
    const hasCoords =
      equatorial?.ra !== undefined && equatorial?.dec !== undefined;

    return {
      "": hasCoords ? (
        <Button
          type="button"
          transparent
          hoverText="Locate"
          onClick={(event) => {
            event.stopPropagation();
            onLocate(equatorial.ra, equatorial.dec);
          }}
        >
          <MdMyLocation className="w-4 h-4 text-muted" />
        </Button>
      ) : (
        <div />
      ),
      PGC: object.pgc,
      Name: object.catalogs.designation?.name || "N/A",
      Type: object.catalogs.nature?.type_name || "N/A",
      Velocity:
        object.catalogs.velocity?.heliocentric?.v !== undefined
          ? `${object.catalogs.velocity.heliocentric.v.toFixed(0)} km/s`
          : "N/A",
      RA: hasCoords ? equatorial.ra : "N/A",
      Dec: hasCoords ? equatorial.dec : "N/A",
    };
  });
}

interface SearchResultsProps {
  sections: SearchSection[];
  query: string;
  page: number;
  pageSize: number;
  navigate: NavigateFunction;
}

function SearchResults({
  sections,
  query,
  page,
  pageSize,
  navigate,
}: SearchResultsProps): ReactElement {
  const columns = resultTableColumns();
  const aladinRef = useRef<AladinViewerHandle>(null);

  const allObjects = sections.flatMap((section) => section.results.objects);
  const skySources = objectsToSkySources(allObjects);
  const skyView = skyViewForSources(skySources);

  function handlePageChange(newPage: number): void {
    pageChangeHandler(navigate, query, pageSize, newPage);
  }

  function handleLocate(ra: number, dec: number): void {
    aladinRef.current?.locate(ra, dec, MIN_ALADIN_FOV_DEG);
  }

  if (sections.length === 0) {
    return (
      <ErrorPage
        title="No Results Found"
        message={`No results found for "${query}"`}
        className="p-4"
      >
        <ErrorPageHomeButton onClick={() => navigate("/")} />
      </ErrorPage>
    );
  }

  return (
    <div className="space-y-6">
      {skyView ? (
        <AladinViewer
          ref={aladinRef}
          ra={skyView.ra}
          dec={skyView.dec}
          fov={skyView.fov}
          className="w-full h-72"
          additionalSources={skySources}
          onSourceClick={(id) =>
            window.open(`/object/${id}`, "_blank", "noopener,noreferrer")
          }
        />
      ) : null}
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <CommonTable
            columns={columns}
            data={objectsToTableData(section.results.objects, handleLocate)}
            className="w-full"
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            records={section.results.objects}
            handlePageChange={handlePageChange}
          />
        </section>
      ))}
    </div>
  );
}

async function fetchSearchType(
  type: SearchType,
  query: string,
  page: number,
  pageSize: number,
): Promise<SearchSection | null> {
  const response = await querySimple({
    client: backendClient,
    query: {
      ...type.toQueryParams(query.trim()),
      page,
      page_size: pageSize,
    },
  });

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(
      `Error during ${type.title} query: ${typeof err === "object" ? JSON.stringify(err) : err}`,
    );
  }

  const results = response.data.data;
  if (results.objects.length === 0) {
    return null;
  }

  return {
    id: type.id,
    title: type.title,
    results,
  };
}

async function fetcher(
  query: string,
  page: number,
  pageSize: number,
): Promise<MultiSearchResults> {
  if (!query.trim()) {
    throw new Error("Empty query");
  }

  const eligibleTypes = resolveEligibleSearchTypes(query);
  if (eligibleTypes.length === 0) {
    throw new Error(`No search types matched query ${query}`);
  }

  const sections = (
    await Promise.all(
      eligibleTypes.map((type) => fetchSearchType(type, query, page, pageSize)),
    )
  ).filter((section): section is SearchSection => section !== null);

  if (sections.length === 0) {
    throw new Error(`No objects found for query ${query}`);
  }

  return { sections };
}

export function SearchResultsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("pagesize") || "25");

  useEffect(() => {
    document.title = `${query} | HyperLEDA`;
  }, [query]);

  const {
    data: results,
    loading,
    error,
  } = useDataFetching(
    () => fetcher(query, page, pageSize),
    [query, page, pageSize],
  );

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (results) {
      return (
        <SearchResults
          sections={results.sections}
          query={query}
          page={page}
          pageSize={pageSize}
          navigate={navigate}
        />
      );
    }

    return <ErrorPage message="Unknown error" />;
  }

  return (
    <>
      <SearchBar
        initialValue={query}
        onSearch={searchHandler(navigate)}
        logoSize="small"
      />
      <Content />
    </>
  );
}
