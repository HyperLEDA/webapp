import React, { ReactElement, useEffect, useState } from "react";
import {
  NavigateFunction,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { SearchPGCObject, backendClient } from "../clients/backend";
import { SearchBar } from "../components/ui/searchbar";
import { CommonTable, Column } from "../components/ui/common-table";
import { Loading } from "../components/ui/loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/error-page";

function objectClickHandler(
  navigate: NavigateFunction,
  object: SearchPGCObject,
) {
  navigate(`/object/${object.pgc}`);
}

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

export function SearchResultsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<SearchPGCObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pagesize") || "10");

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

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await backendClient.query(query, page - 1, pageSize);
        setResults(response.objects);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query, navigate, pageSize, page]);

  function renderContent(): ReactElement {
    if (loading) return <Loading />;

    if (results.length > 0) {
      return (
        <div className="mt-4">
          <CommonTable
            columns={columns}
            data={results.map((object) => ({
              PGC: object.pgc,
              Name: object.catalogs.designation.design,
              "RA (deg)": object.catalogs.icrs.ra,
              "Dec (deg)": object.catalogs.icrs.dec,
            }))}
            className="w-full"
            onRowClick={(row) => {
              const pgc = row.PGC as number;
              const object = results.find((obj) => obj.pgc === pgc);
              if (object) {
                objectClickHandler(navigate, object);
              }
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
              disabled={results.length < pageSize}
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

  return (
    <>
      <SearchBar
        initialValue={query}
        onSearch={searchHandler(navigate)}
        logoSize="small"
      />
      {renderContent()}
    </>
  );
}
