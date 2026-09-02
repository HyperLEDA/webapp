import { ReactElement, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import classNames from "classnames";
import { getTableList } from "../clients/admin";
import type {
  GetTableListResponse,
  TableListItem,
  TableProgress,
  TableStatus,
} from "../clients/admin";
import { adminClient } from "../clients";
import {
  Card,
  CardAction,
  ErrorPage,
  Field,
  Link,
  Loading,
  Pagination,
} from "@leda/lib/ui";
import {
  Badge,
  MultiSelectFilter,
  SearchPageSizeFilters,
} from "../components/ui";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError } from "@leda/lib/tap";
import { getSourceLink } from "@leda/lib/astronomy";

const TABLE_STATUS_OPTIONS: { value: TableStatus; label: string }[] = [
  { value: "initiated", label: "Initiated" },
  { value: "archived", label: "Archived" },
];

function isTableStatus(value: string): value is TableStatus {
  return value === "initiated" || value === "archived";
}

function parseStatusesParam(param: string | null): TableStatus[] {
  if (!param) {
    return [];
  }

  return param
    .split(",")
    .map((value) => value.trim())
    .filter(isTableStatus);
}

function formatTableStatusLabel(status: TableStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface TablesFiltersProps {
  query: string | null;
  pageSize: number;
  statuses: TableStatus[];
  onQueryChange: (query: string) => void;
  onPageSizeChange: (pageSize: number) => void;
  onStatusesChange: (statuses: TableStatus[]) => void;
}

function TablesFilters({
  query,
  pageSize,
  statuses,
  onQueryChange,
  onPageSizeChange,
  onStatusesChange,
}: TablesFiltersProps): ReactElement {
  return (
    <SearchPageSizeFilters
      query={query}
      pageSize={pageSize}
      onQueryChange={onQueryChange}
      onPageSizeChange={onPageSizeChange}
      searchPlaceholder="Search by name or description"
    >
      <MultiSelectFilter
        title="Status"
        options={TABLE_STATUS_OPTIONS}
        values={statuses}
        onChange={(values) =>
          onStatusesChange(parseStatusesParam(values.join(",")))
        }
      />
    </SearchPageSizeFilters>
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

function formatProgressPercent(count: number, total: number): string {
  if (total <= 0) {
    return "—";
  }
  return `${Math.floor((count / total) * 100)}%`;
}

function formatCatalogsSummary(
  catalogs: TableProgress["catalogs"],
  total: number,
): string {
  if (total <= 0) {
    return "—";
  }

  const parts = Object.entries(catalogs)
    .map(([name, { structured }]) => ({
      name,
      percent: Math.floor((structured / total) * 100),
    }))
    .filter(({ percent }) => percent > 0)
    .map(({ name, percent }) => `${name} (${percent}%)`);

  return parts.length > 0 ? parts.join(", ") : "—";
}

function crossmatchListHref(tableName: string): string {
  return `/crossmatch?table_name=${encodeURIComponent(tableName)}&triage_status=pending`;
}

function TableListCard({ table }: { table: TableListItem }): ReactElement {
  const navigate = useNavigate();
  const { progress } = table;
  const total = progress.total_records;
  const actions: CardAction[] = [
    {
      title: "View crossmatch results",
      onClick: () => {
        void navigate(crossmatchListHref(table.name));
      },
    },
  ];

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 flex-wrap">
          <Link href={`/table/${table.name}`} className="hover:opacity-80">
            {table.description || "—"}
          </Link>
          {table.status !== "initiated" ? (
            <Badge type="warning">{formatTableStatusLabel(table.status)}</Badge>
          ) : null}
        </span>
      }
      className="w-full"
      variant="responsive-fields"
      actions={actions}
    >
      <Field label="Slug">
        <span className="font-mono break-all">{table.name}</span>
      </Field>
      <Field label="Source paper">
        {table.bibcode ? (
          <Link href={getSourceLink(table.bibcode)} external>
            {table.bibcode}
          </Link>
        ) : (
          "—"
        )}
      </Field>
      <Field label="Number of records">{table.num_entries}</Field>
      <Field label="Number of columns">{table.num_fields}</Field>
      <Field label="Modification date">
        {table.modification_dt
          ? formatModificationDate(table.modification_dt)
          : "—"}
      </Field>
      <Field label="Waiting for cross-identification">
        {formatProgressPercent(progress.unprocessed, total)}
      </Field>
      <Field label="Waiting for manual check">
        {formatProgressPercent(progress.pending_triage, total)}
      </Field>
      <Field label="Waiting for submission">
        {formatProgressPercent(progress.resolved_unsubmitted, total)}
      </Field>
      <Field label="Submitted">
        {formatProgressPercent(progress.submitted, total)}
      </Field>
      <Field label="Catalogs">
        {formatCatalogsSummary(progress.catalogs, total)}
      </Field>
    </Card>
  );
}

function TablesResults({ data, loading }: TablesResultsProps): ReactElement {
  const tables = data?.tables ?? [];

  return (
    <div className="relative">
      <div
        className={classNames(
          "flex w-full flex-col gap-4",
          loading && "opacity-50 pointer-events-none",
        )}
      >
        {tables.map((table) => (
          <TableListCard key={table.name} table={table} />
        ))}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-app/60">
          <Loading />
        </div>
      )}
    </div>
  );
}

async function fetcher(
  query: string | null,
  page: number,
  pageSize: number,
  statuses: TableStatus[],
): Promise<GetTableListResponse> {
  const response = await getTableList({
    client: adminClient,
    query: {
      query: query?.trim() || undefined,
      page,
      page_size: pageSize,
      statuses: statuses.length > 0 ? statuses : undefined,
    },
  });

  if (response.error) {
    throw new Error(formatApiError(response.error) || "Failed to fetch tables");
  }

  return response.data.data;
}

interface TablesContentProps {
  data: GetTableListResponse | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function TablesContent({
  data,
  loading,
  error,
  page,
  pageSize,
  onPageChange,
}: TablesContentProps): ReactElement {
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
        handlePageChange={onPageChange}
      />
    </>
  );
}

export function TablesPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");
  const statuses = parseStatusesParam(searchParams.get("statuses"));

  useEffect(() => {
    document.title = "Tables | LEDA";
  }, []);

  const { data, loading, error } = useDataFetching(
    () => fetcher(query, page, pageSize, statuses),
    [query, page, pageSize, statuses.join(",")],
  );

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function updateParams(updates: {
    q?: string;
    page_size?: number;
    statuses?: TableStatus[];
  }): void {
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
    if (updates.statuses !== undefined) {
      if (updates.statuses.length > 0) {
        newSearchParams.set("statuses", updates.statuses.join(","));
      } else {
        newSearchParams.delete("statuses");
      }
    }
    newSearchParams.set("page", "0");
    setSearchParams(newSearchParams);
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">Tables</h2>
      <TablesFilters
        query={query}
        pageSize={pageSize}
        statuses={statuses}
        onQueryChange={(q) => updateParams({ q })}
        onPageSizeChange={(size) => updateParams({ page_size: size })}
        onStatusesChange={(nextStatuses) =>
          updateParams({ statuses: nextStatuses })
        }
      />
      <TablesContent
        data={data}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </>
  );
}
