import { ReactElement, useEffect } from "react";
import {
  NavigateFunction,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { CommonTable, Column } from "../components/ui/common-table";
import { Loading } from "../components/ui/loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/error-page";
import { useDataFetching } from "../hooks/useDataFetching";
import { querySimpleApiV1QuerySimpleGet } from "../clients/backend/sdk.gen";
import { QuerySimpleResponse } from "../clients/backend/types.gen";
import { Link } from "../components/ui/link";
import { Declination, RightAscension } from "../components/ui/astronomy";
import { Pagination } from "../components/ui/pagination";
import { backendClient } from "../clients/config";

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
    return (
      <>
        <CommonTable
          columns={columns}
          data={results.objects.map((object) => ({
            PGC: object.pgc,
            Name: object.catalogs.designation?.name || "N/A",
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
      </>
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

  const response = await querySimpleApiV1QuerySimpleGet({
    client: backendClient,
    query: {
      name: query,
      page: page,
      page_size: pageSize,
    },
  });

  if (response.data?.data.objects.length === 0) {
    throw new Error(`No objects found for query ${query}`);
  }

  if (response.error || !response.data) {
    throw new Error(`Error during query: ${response.error}`);
  }

  return response.data.data;
}

export function SearchResultsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
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
