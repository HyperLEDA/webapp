import { ReactElement, useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import classNames from "classnames";
import { DropdownFilter } from "../components/core/DropdownFilter";
import { TextFilter } from "../components/core/TextFilter";
import { getTableList } from "../clients/admin/sdk.gen";
import type {
  GetTableListResponse,
  TableListItem,
  TableProgress,
  ValidationError,
} from "../clients/admin/types.gen";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/Pagination";
import { adminClient } from "../clients/config";
import { Link } from "../components/core/Link";
import { getSourceLink } from "../components/catalogs/CatalogCard";
import { Card, CardAction, Field } from "../components/ui/Card";

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
      onClick: () => navigate(crossmatchListHref(table.name)),
    },
  ];

  return (
    <Card
      title={
        <Link href={`/table/${table.name}`} className="hover:opacity-80">
          {table.description || "—"}
        </Link>
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
