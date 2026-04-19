import { ReactElement, useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { DropdownFilter } from "../components/core/DropdownFilter";
import { TextFilter } from "../components/core/TextFilter";
import { getTableList } from "../clients/admin/sdk.gen";
import type {
  GetTableListResponse,
  TableListItem,
  ValidationError,
} from "../clients/admin/types.gen";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/Pagination";
import { adminClient } from "../clients/config";
import { Link } from "../components/core/Link";

const SEARCH_DEBOUNCE_MS = 300;

interface TablesFiltersProps {
  query: string | null;
  pageSize: number;
  onQueryChange: (query: string) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function TablesFilters({
  query,
  pageSize,
  onQueryChange,
  onPageSizeChange,
}: TablesFiltersProps): ReactElement {
  const [localQuery, setLocalQuery] = useState<string>(query || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(query ?? "");
  }, [query]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function handleQueryChange(value: string): void {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onQueryChange(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex gap-4 mb-4">
      <TextFilter
        title="Search"
        value={localQuery}
        onChange={handleQueryChange}
        placeholder="Search by name or description"
      />
      <DropdownFilter
        title="Page size"
        options={[
          { value: "10" },
          { value: "25" },
          { value: "50" },
          { value: "100" },
        ]}
        value={pageSize.toString()}
        onChange={(value) => onPageSizeChange(parseInt(value))}
      />
    </div>
  );
}

interface TablesResultsProps {
  data: GetTableListResponse | null;
  loading?: boolean;
}

function formatModificationDate(isoString: string): string {
  const d = new Date(isoString);
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .replace(",", "");
}

function TablesResults({ data, loading }: TablesResultsProps): ReactElement {
  const columns: Column[] = [
    {
      name: "Name",
      renderCell: (value: CellPrimitive) => {
        if (typeof value === "string") {
          return <Link href={`/table/${value}`}>{value}</Link>;
        }
        return <span>—</span>;
      },
    },
    { name: "Description" },
    { name: "Number of records" },
    { name: "Number of columns" },
    { name: "Modification date" },
  ];

  const tableData: Record<string, CellPrimitive>[] =
    data?.tables.map((table: TableListItem) => ({
      Name: table.name,
      Description: table.description,
      "Number of records": table.num_entries,
      "Number of columns": table.num_fields,
      "Modification date": table.modification_dt
        ? formatModificationDate(table.modification_dt)
        : "—",
    })) ?? [];

  return <CommonTable columns={columns} data={tableData} loading={loading} />;
}

async function fetcher(
  query: string | null,
  page: number,
  pageSize: number,
): Promise<GetTableListResponse> {
  const response = await getTableList({
    client: adminClient,
    query: {
      query: query?.trim() || undefined,
      page,
      page_size: pageSize,
    },
  });

  if (response.error) {
    throw new Error(
      (response.error as { detail?: ValidationError[] }).detail
        ?.map((err: ValidationError) => err.msg)
        .join(", ") || "Failed to fetch tables",
    );
  }

  if (!response.data) {
    throw new Error("No data received from server");
  }

  return response.data.data;
}

export function TablesPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");

  useEffect(() => {
    document.title = "Tables | HyperLEDA";
  }, []);

  const { data, loading, error } = useDataFetching(
    () => fetcher(query, page, pageSize),
    [query, page, pageSize],
  );

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function updateParams(updates: { q?: string; page_size?: number }): void {
    const newSearchParams = new URLSearchParams(searchParams);
    if (updates.q !== undefined) {
      if (updates.q.trim()) {
        newSearchParams.set("q", updates.q.trim());
      } else {
        newSearchParams.delete("q");
      }
    }
    if (updates.page_size !== undefined) {
      newSearchParams.set("page_size", updates.page_size.toString());
    }
    newSearchParams.set("page", "0");
    setSearchParams(newSearchParams);
  }

  function Content(): ReactElement {
    if (error && !data) return <ErrorPage title="Error" message={error} />;
    if (!data?.tables && loading) return <Loading />;
    if (!data?.tables) return <ErrorPage title="Error" message="No tables" />;

    return (
      <>
        <TablesResults data={data} loading={loading} />
        <Pagination
          page={page}
          pageSize={pageSize}
          records={data.tables}
          handlePageChange={handlePageChange}
        />
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">Tables</h2>
      <TablesFilters
        query={query}
        pageSize={pageSize}
        onQueryChange={(q) => updateParams({ q })}
        onPageSizeChange={(size) => updateParams({ page_size: size })}
      />
      <Content />
    </>
  );
}
