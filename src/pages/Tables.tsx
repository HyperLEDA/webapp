import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/common-table";
import { DropdownFilter } from "../components/ui/dropdown-filter";
import { TextFilter } from "../components/ui/text-filter";
import { getTableList } from "../clients/admin/sdk.gen";
import type {
  GetTableListResponse,
  TableListItem,
  ValidationError,
} from "../clients/admin/types.gen";
import { Button } from "../components/ui/button";
import { Loading } from "../components/ui/loading";
import { ErrorPage } from "../components/ui/error-page";
import { Link } from "../components/ui/link";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/pagination";
import { adminClient } from "../clients/config";

interface TablesFiltersProps {
  query: string | null;
  pageSize: number;
  onApplyFilters: (query: string, pageSize: number) => void;
}

function TablesFilters({
  query,
  pageSize,
  onApplyFilters,
}: TablesFiltersProps): ReactElement {
  const [localQuery, setLocalQuery] = useState<string>(query || "");
  const [localPageSize, setLocalPageSize] = useState<number>(pageSize);

  useEffect(() => {
    setLocalQuery(query || "");
    setLocalPageSize(pageSize);
  }, [query, pageSize]);

  function applyFilters(): void {
    onApplyFilters(localQuery, localPageSize);
  }

  return (
    <div className="flex gap-4 mb-4">
      <TextFilter
        title="Search"
        value={localQuery}
        onChange={setLocalQuery}
        placeholder="Search by name or description"
        onEnter={applyFilters}
      />
      <DropdownFilter
        title="Page size"
        options={[
          { value: "10" },
          { value: "25" },
          { value: "50" },
          { value: "100" },
        ]}
        value={localPageSize.toString()}
        onChange={(value) => setLocalPageSize(parseInt(value))}
      />
      <div className="flex items-end">
        <Button onClick={applyFilters}>Apply</Button>
      </div>
    </div>
  );
}

interface TablesResultsProps {
  data: GetTableListResponse | null;
}

function TablesResults({ data }: TablesResultsProps): ReactElement {
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
    { name: "Entries" },
    { name: "Fields" },
  ];

  const tableData: Record<string, CellPrimitive>[] =
    data?.tables.map((table: TableListItem) => ({
      Name: table.name,
      Description: table.description,
      Entries: table.num_entries,
      Fields: table.num_fields,
    })) ?? [];

  return <CommonTable columns={columns} data={tableData} />;
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

  function handleApplyFilters(newQuery: string, newPageSize: number): void {
    const newSearchParams = new URLSearchParams(searchParams);

    if (newQuery.trim()) {
      newSearchParams.set("q", newQuery.trim());
    } else {
      newSearchParams.delete("q");
    }

    newSearchParams.set("page_size", newPageSize.toString());
    newSearchParams.set("page", "0");

    setSearchParams(newSearchParams);
  }

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage title="Error" message={error} />;
    if (!data?.tables) return <ErrorPage title="Error" message="No tables" />;

    return (
      <>
        <TablesResults data={data} />
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
        onApplyFilters={handleApplyFilters}
      />
      <Content />
    </>
  );
}
