import { ReactElement, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { tapSync, tapTables } from "../clients/backend/sdk.gen";
import type {
  ListTapTablesResponse,
  TapColumnInfo,
  TapSchemaEntry,
  TapSyncResponse,
  TapTableInfo,
  ValidationError,
} from "../clients/backend/types.gen";
import { backendClient } from "../clients/config";
import { isLoggedIn } from "../auth/token";
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
import classNames from "classnames";

function formatApiError(error: unknown): string {
  const detail = (error as { detail?: ValidationError[] }).detail;
  if (detail?.length) {
    return detail.map((e) => e.msg).join(", ");
  }
  return JSON.stringify(error);
}

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

function cellValue(value: unknown): CellPrimitive {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return value;
  }
  return String(value);
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

function CatalogBrowsePrompt(): ReactElement {
  return (
    <div className={catalogPanelClassName}>
      <Text as="p" size="large">
        Browse the data
      </Text>
      <Text as="p">
        Choose a table on the left to see column definitions and sample rows
      </Text>
    </div>
  );
}

function CatalogLoginPrompt(): ReactElement {
  return (
    <div className={catalogPanelClassName}>
      <Text as="p" size="large">
        Log in to view data in tables
      </Text>
      <Text as="p">
        Sign in to load rows after you choose a table on the left
      </Text>
    </div>
  );
}

interface TableDetailProps {
  tableInfo: TapTableInfo;
  syncPayload: TapSyncResponse | null;
  syncLoading: boolean;
  syncError: string | null;
  loggedIn: boolean;
}

function TableDetail({
  tableInfo,
  syncPayload,
  syncLoading,
  syncError,
  loggedIn,
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

  const rows: Record<string, CellPrimitive>[] = loggedIn
    ? (syncTable?.data ?? []).map((row) => {
        const out: Record<string, CellPrimitive> = {};
        for (let i = 0; i < syncColumns.length; i++) {
          out[syncColumns[i].name] = cellValue(row[i]);
        }
        return out;
      })
    : [];

  return (
    <div>
      <div className="mb-3">
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

      {!loggedIn ? (
        <CatalogLoginPrompt />
      ) : syncError ? (
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
  const [filter, setFilter] = useState("");
  const loggedIn = isLoggedIn();

  const selectedSchema = schemaName ?? null;
  const selectedTable = tableName ?? null;

  useEffect(() => {
    document.title = "Data catalog | HyperLEDA";
  }, []);

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
    if (!selectedSchema || !selectedTable || !loggedIn) {
      return Promise.resolve(null);
    }
    return fetchTableRows(selectedTable);
  }, [selectedTable ?? "", loggedIn]);

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

  function handleSelect(nextSchema: string, nextTable: string): void {
    navigate(
      `/data-catalog/${encodeURIComponent(nextSchema)}/${encodeURIComponent(nextTable)}`,
    );
  }

  function SidebarContent(): ReactElement {
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

  function DetailContent(): ReactElement {
    if (!selectedSchema || !selectedTable) {
      return loggedIn ? <CatalogBrowsePrompt /> : <CatalogLoginPrompt />;
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
        syncLoading={loggedIn && syncLoading}
        syncError={loggedIn ? syncError : null}
        loggedIn={loggedIn}
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
            <SidebarContent />
          </div>
        </div>
        <div className="flex-grow min-w-0 w-full lg:min-h-0 lg:h-full lg:overflow-y-auto">
          <DetailContent />
        </div>
      </div>
    </div>
  );
}
