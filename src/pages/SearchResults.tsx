import { ReactElement } from "react";
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
        <span className="font-mono text-blue-400 hover:text-blue-300 cursor-pointer">
          {value}
        </span>
      ),
    },
    {
      name: "Name",
      renderCell: (value: React.ReactElement | string | number) => (
        <span className="text-gray-200">{value || "N/A"}</span>
      ),
    },
    {
      name: "RA (deg)",
      renderCell: (value: React.ReactElement | string | number) => (
        <span className="font-mono text-gray-300">
          {typeof value === "number" ? value.toFixed(6) : value}
        </span>
      ),
    },
    {
      name: "Dec (deg)",
      renderCell: (value: React.ReactElement | string | number) => (
        <span className="font-mono text-gray-300">
          {typeof value === "number" ? value.toFixed(6) : value}
        </span>
      ),
    },
  ];

  if (results.objects.length > 0) {
    return (
      <div className="mt-4">
        <CommonTable
          columns={columns}
          data={results.objects.map((object) => ({
            PGC: object.pgc,
            Name: object.catalogs.designation?.name || "N/A",
            "RA (deg)": object.catalogs.coordinates?.equatorial.ra || 0,
            "Dec (deg)": object.catalogs.coordinates?.equatorial.dec || 0,
          }))}
          className="w-full"
          onRowClick={(row) => {
            const pgc = row.PGC as number;
            navigate(`/object/${pgc}`);
          }}
        />
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() =>
              pageChangeHandler(navigate, query, pageSize, page - 1)
            }
            disabled={page <= 1}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            onClick={() =>
              pageChangeHandler(navigate, query, pageSize, page + 1)
            }
            disabled={results.objects.length < pageSize}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
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

  const response = await querySimpleApiV1QuerySimpleGet({
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
  const pageSize = parseInt(searchParams.get("pagesize") || "10");

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
