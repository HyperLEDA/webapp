import { ReactElement, useEffect } from "react";
import {
  NavigateFunction,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { SearchBar } from "../components/ui/Searchbar";
import { CommonTable, Column } from "../components/ui/CommonTable";
import { Loading } from "../components/core/Loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/ErrorPage";
import { useDataFetching } from "../hooks/useDataFetching";
import { querySimple } from "../clients/backend/sdk.gen";
import { PgcObject, QuerySimpleResponse } from "../clients/backend/types.gen";
import { Link } from "../components/core/Link";
import { Declination, RightAscension } from "../components/core/Astronomy";
import { AladinViewer } from "../components/core/Aladin";
import { Pagination } from "../components/ui/Pagination";
import { backendClient } from "../clients/config";
import { parseCoordinateQuery } from "../lib/astronomy/parseCoordinateQuery";

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

function skyViewForSources(sources: SkySource[]): {
  ra: number;
  dec: number;
  fov: number;
} | null {
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

interface SearchResultsProps {
  results: QuerySimpleResponse;
  query: string;
  page: number;
  pageSize: number;
  navigate: NavigateFunction;
}

function SearchResults({
  results,
  query,
  page,
  pageSize,
  navigate,
}: SearchResultsProps): ReactElement {
  const columns: Column[] = [
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
      renderCell: (value: React.ReactElement | string | number) => (
        <RightAscension
          value={
            typeof value === "number" ? value : parseFloat(value as string)
          }
        />
      ),
    },
    {
      name: "Dec",
      renderCell: (value: React.ReactElement | string | number) => (
        <Declination
          value={
            typeof value === "number" ? value : parseFloat(value as string)
          }
        />
      ),
    },
  ];

  function handlePageChange(newPage: number): void {
    pageChangeHandler(navigate, query, pageSize, newPage);
  }

  if (results.objects.length > 0) {
    const skySources = objectsToSkySources(results.objects);
    const skyView = skyViewForSources(skySources);

    return (
      <div className="space-y-6">
        {skyView ? (
          <AladinViewer
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
        <CommonTable
          columns={columns}
          data={results.objects.map((object) => ({
            PGC: object.pgc,
            Name: object.catalogs.designation?.name || "N/A",
            Type: object.catalogs.nature?.type_name || "N/A",
            Velocity:
              object.catalogs.velocity?.heliocentric?.v !== undefined
                ? `${object.catalogs.velocity.heliocentric.v.toFixed(0)} km/s`
                : "N/A",
            RA: object.catalogs.coordinates?.equatorial.ra || 0,
            Dec: object.catalogs.coordinates?.equatorial.dec || 0,
          }))}
          className="w-full"
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          records={results.objects}
          handlePageChange={handlePageChange}
        />
      </div>
    );
  }

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

async function fetcher(
  query: string,
  page: number,
  pageSize: number,
): Promise<QuerySimpleResponse> {
  if (!query.trim()) {
    throw new Error("Empty query");
  }

  const coordinateQuery = parseCoordinateQuery(query);
  const response = await querySimple({
    client: backendClient,
    query: {
      ...(coordinateQuery ? coordinateQuery.toQueryParams() : { name: query }),
      page: page,
      page_size: pageSize,
    },
  });

  if (response.data?.data.objects.length === 0) {
    throw new Error(`No objects found for query ${query}`);
  }

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(
      `Error during query: ${typeof err === "object" ? JSON.stringify(err) : err}`,
    );
  }

  return response.data.data;
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
          results={results}
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
