import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  useMatch,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { tapSync, tapTables } from "../clients/backend/sdk.gen";
import type {
  ListTapTablesResponse,
  TapColumnInfo,
  TapSchemaEntry,
  TapSyncResponse,
  TapTableInfo,
} from "../clients/backend/types.gen";
import { backendClient } from "../clients/config";
import { useDataFetching } from "../hooks/useDataFetching";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { TextFilter } from "../components/core/TextFilter";
import { Accordion } from "../components/core/Accordion";
import { Text } from "../components/core/Text";
import { Button } from "../components/core/Button";
import classNames from "classnames";
import { CatalogViewTabs } from "../components/catalog/CatalogViewTabs";
import { CatalogSqlPanel } from "../components/catalog/CatalogSqlPanel";
import {
  cellValue,
  DEFAULT_SQL_EXAMPLE,
  defaultSelectForTable,
  formatApiError,
  parseSqlPermalink,
} from "../lib/tap";

async function fetchTablesList(): Promise<ListTapTablesResponse> {
  const response = await tapTables({
    client: backendClient,
    query: { detail: "max" },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data?.data) {
    throw new Error("No table list received from server");
  }
  return response.data.data;
}

async function fetchTableRows(tableName: string): Promise<TapSyncResponse> {
  const response = await tapSync({
    client: backendClient,
    query: {
      query: `SELECT * FROM ${tableName}`,
    },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data?.data) {
    throw new Error("No table data received from server");
  }
  return response.data.data;
}

function findTableInfo(
  schemas: TapSchemaEntry[] | undefined,
  schemaName: string,
  tableName: string,
): TapTableInfo | null {
  const schema = schemas?.find((s) => s.schema_name === schemaName);
  return schema?.tables.find((t) => t.name === tableName) ?? null;
}

function filterSchemas(
  schemas: TapSchemaEntry[] | undefined,
  query: string,
): TapSchemaEntry[] {
  if (!schemas?.length) {
    return [];
  }
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return schemas;
  }
  return schemas
    .map((s) => ({
      ...s,
      tables: s.tables.filter((t) => {
        const blob =
          `${s.schema_name} ${t.name} ${t.description ?? ""}`.toLowerCase();
        return blob.includes(needle);
      }),
    }))
    .filter((s) => s.tables.length > 0);
}

interface SchemaSidebarProps {
  schemas: TapSchemaEntry[];
  selectedSchema: string | null;
  selectedTable: string | null;
  onSelect: (schemaName: string, tableName: string) => void;
}

function SchemaSidebar({
  schemas,
  selectedSchema,
  selectedTable,
  onSelect,
}: SchemaSidebarProps): ReactElement {
  return (
    <div className="flex flex-col gap-2 pr-0.5">
      {schemas.map((schema) => (
        <Accordion
          key={`${schema.schema_name}-${selectedSchema === schema.schema_name ? "open" : "closed"}`}
          title={schema.schema_name}
          defaultOpen={selectedSchema === schema.schema_name}
        >
          <ul>
            {schema.tables.map((t) => {
              const active =
                selectedSchema === schema.schema_name &&
                selectedTable === t.name;
              return (
                <li key={`${schema.schema_name}.${t.name}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(schema.schema_name, t.name)}
                    className={classNames(
                      "w-full text-left px-3 py-2 transition-colors border-l-2 rounded-sm",
                      active
                        ? "border-accent bg-accent/15"
                        : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <Text
                      style="header"
                      size="small"
                      as="span"
                      className="block"
                    >
                      {t.description ?? t.name}
                    </Text>
                    {t.description ? (
                      <Text
                        size="small"
                        type="code"
                        as="span"
                        className="block mt-0.5"
                      >
                        {t.name}
                      </Text>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Accordion>
      ))}
    </div>
  );
}

function columnMetadataHint(column: TapColumnInfo): ReactElement {
  return (
    <div className="text-left space-y-2">
      {column.description ? <Text as="p">{column.description}</Text> : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Text as="dt">Type</Text>
        <Text as="dd" type="code">
          {column.datatype ?? "—"}
        </Text>
        <Text as="dt">Unit</Text>
        <Text as="dd" type="code">
          {column.unit ?? "—"}
        </Text>
        <Text as="dt">UCD</Text>
        <Text as="dd" type="code">
          {column.ucd ?? "—"}
        </Text>
      </dl>
    </div>
  );
}

const catalogPanelClassName =
  "rounded-lg border border-dashed border-border p-8 text-center";

function CatalogBrowsePrompt({
  onOpenSql,
}: {
  onOpenSql: () => void;
}): ReactElement {
  return (
    <div className={catalogPanelClassName}>
      <Text as="p" size="large">
        Browse the data
      </Text>
      <Text as="p">
        Choose a table on the left to see column definitions and sample rows, or
        run a custom query in the SQL editor.
      </Text>
      <Button type="button" className="mt-4 mx-auto" onClick={onOpenSql}>
        Open SQL query
      </Button>
    </div>
  );
}

interface TableDetailProps {
  tableInfo: TapTableInfo;
  syncPayload: TapSyncResponse | null;
  syncLoading: boolean;
  syncError: string | null;
  onOpenSql: () => void;
}

function TableDetail({
  tableInfo,
  syncPayload,
  syncLoading,
  syncError,
  onOpenSql,
}: TableDetailProps): ReactElement {
  const metadataColumns = tableInfo.columns ?? [];
  const syncTable = syncPayload?.resource.table;
  const syncColumns = syncTable?.columns ?? [];

  const columnsForHints: TapColumnInfo[] = metadataColumns.length
    ? metadataColumns
    : syncColumns.map((c) => ({
        name: c.name,
        datatype: c.datatype,
        unit: c.unit ?? null,
      }));

  const columnDefs: Column[] = columnsForHints.map((c) => ({
    name: c.name,
    hint: columnMetadataHint(c),
  }));

  const rows: Record<string, CellPrimitive>[] = (syncTable?.data ?? []).map(
    (row) => {
      const out: Record<string, CellPrimitive> = {};
      for (let i = 0; i < syncColumns.length; i++) {
        out[syncColumns[i].name] = cellValue(row[i]);
      }
      return out;
    },
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="h3" style="header" size="medium">
            {tableInfo.description ?? (
              <Text style="header" size="medium" type="code" as="span">
                {tableInfo.name}
              </Text>
            )}
          </Text>
          {tableInfo.description ? (
            <Text as="p" type="code">
              {tableInfo.name}
            </Text>
          ) : null}
        </div>
        <Button type="button" onClick={onOpenSql}>
          Query in SQL editor
        </Button>
      </div>

      {syncError ? (
        <ErrorPage title="Could not load table data" message={syncError} />
      ) : syncLoading ? (
        <Loading />
      ) : (
        <CommonTable columns={columnDefs} data={rows}>
          <Text style="header" size="small">
            Sample rows
          </Text>
        </CommonTable>
      )}
    </div>
  );
}

export function DataCatalogPage(): ReactElement {
  const { schemaName, tableName } = useParams<{
    schemaName?: string;
    tableName?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isQueryMode = Boolean(useMatch("/data-catalog/query"));
  const permalinkSql = searchParams.get("q");
  const [filter, setFilter] = useState("");
  const [sqlDraft, setSqlDraft] = useState(DEFAULT_SQL_EXAMPLE);

  const [sqlSidebarSelection, setSqlSidebarSelection] = useState<{
    schema: string;
    table: string;
  } | null>(null);

  const selectedSchema = isQueryMode
    ? (sqlSidebarSelection?.schema ?? null)
    : (schemaName ?? null);
  const selectedTable = isQueryMode
    ? (sqlSidebarSelection?.table ?? null)
    : (tableName ?? null);

  useEffect(() => {
    document.title = isQueryMode
      ? "SQL query | HyperLEDA"
      : "Data catalog | HyperLEDA";
  }, [isQueryMode]);

  useLayoutEffect(() => {
    if (!isQueryMode || !permalinkSql) {
      return;
    }
    setSqlDraft(parseSqlPermalink(permalinkSql));
  }, [isQueryMode, permalinkSql]);

  const {
    data: tablesPayload,
    loading: tablesLoading,
    error: tablesError,
  } = useDataFetching(() => fetchTablesList(), []);

  const {
    data: syncPayload,
    loading: syncLoading,
    error: syncError,
  } = useDataFetching((): Promise<TapSyncResponse | null> => {
    if (!selectedSchema || !selectedTable) {
      return Promise.resolve(null);
    }
    return fetchTableRows(selectedTable);
  }, [selectedTable ?? ""]);

  const filtered = useMemo(
    () => filterSchemas(tablesPayload?.schemas, filter),
    [tablesPayload?.schemas, filter],
  );

  const selectedTableInfo = useMemo(() => {
    if (!selectedSchema || !selectedTable) {
      return null;
    }
    return findTableInfo(tablesPayload?.schemas, selectedSchema, selectedTable);
  }, [tablesPayload?.schemas, selectedSchema, selectedTable]);

  function openSqlEditor(sql?: string): void {
    if (sql) {
      setSqlDraft(sql);
      navigate({
        pathname: "/data-catalog/query",
        search: `?q=${encodeURIComponent(sql)}`,
      });
      return;
    }
    navigate({ pathname: "/data-catalog/query", search: "" });
  }

  function handleQueryRun(sql: string): void {
    setSearchParams({ q: sql }, { replace: true });
  }

  function handleSelect(nextSchema: string, nextTable: string): void {
    if (isQueryMode) {
      setSqlSidebarSelection({ schema: nextSchema, table: nextTable });
      setSqlDraft(defaultSelectForTable(nextTable));
      return;
    }
    navigate(
      `/data-catalog/${encodeURIComponent(nextSchema)}/${encodeURIComponent(nextTable)}`,
    );
  }

  function renderSidebarContent(): ReactElement {
    if (tablesError && !tablesPayload) {
      return <ErrorPage title="Could not load tables" message={tablesError} />;
    }
    if (tablesLoading && !tablesPayload) {
      return <Loading />;
    }
    if (!filtered.length) {
      return (
        <Text as="p" className="p-4">
          {tablesPayload?.schemas.length
            ? "No tables match your filter."
            : "No tables returned by the API."}
        </Text>
      );
    }
    return (
      <SchemaSidebar
        schemas={filtered}
        selectedSchema={selectedSchema}
        selectedTable={selectedTable}
        onSelect={handleSelect}
      />
    );
  }

  function renderDetailContent(): ReactElement {
    if (isQueryMode) {
      return (
        <CatalogSqlPanel
          sql={sqlDraft}
          onSqlChange={setSqlDraft}
          schemas={tablesPayload?.schemas}
          permalinkRunKey={
            permalinkSql ? parseSqlPermalink(permalinkSql) : null
          }
          onQueryRun={handleQueryRun}
        />
      );
    }

    if (!selectedSchema || !selectedTable) {
      return <CatalogBrowsePrompt onOpenSql={() => openSqlEditor()} />;
    }

    if (tablesError && !tablesPayload) {
      return <ErrorPage title="Could not load tables" message={tablesError} />;
    }

    if (tablesLoading && !selectedTableInfo) {
      return <Loading />;
    }

    if (!selectedTableInfo) {
      return (
        <ErrorPage
          title="Table not found"
          message={`No metadata for ${selectedTable}`}
        />
      );
    }

    return (
      <TableDetail
        tableInfo={selectedTableInfo}
        syncPayload={syncPayload}
        syncLoading={syncLoading}
        syncError={syncError}
        onOpenSql={() => openSqlEditor(defaultSelectForTable(selectedTable))}
      />
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-0">
      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0 lg:items-stretch lg:overflow-hidden">
        <div className="w-full lg:w-[min(100%,380px)] lg:flex-shrink-0 flex flex-col gap-4 lg:min-h-0 lg:h-full lg:max-h-full">
          <div className="shrink-0">
            <TextFilter
              title="Filter tables"
              value={filter}
              onChange={setFilter}
              placeholder="Schema, table name, or description"
            />
          </div>
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0.5">
            {renderSidebarContent()}
          </div>
        </div>
        <div className="flex-grow min-w-0 w-full lg:min-h-0 lg:h-full lg:overflow-y-auto">
          <CatalogViewTabs />
          {renderDetailContent()}
        </div>
      </div>
    </div>
  );
}
