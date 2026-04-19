import { ReactElement, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listSchemas, getTable } from "../clients/backend/sdk.gen";
import type {
  GetTableResponse,
  ListSchemasResponse,
  SchemaEntry,
  ValidationError,
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
import { Link } from "../components/core/Link";
import classNames from "classnames";

function formatApiError(error: unknown): string {
  const detail = (error as { detail?: ValidationError[] }).detail;
  if (detail?.length) {
    return detail.map((e) => e.msg).join(", ");
  }
  return JSON.stringify(error);
}

async function fetchSchemaList(): Promise<ListSchemasResponse> {
  const response = await listSchemas({ client: backendClient });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data?.data) {
    throw new Error("No schema data received from server");
  }
  return response.data.data;
}

async function fetchTablePreview(
  schemaName: string,
  tableName: string,
): Promise<GetTableResponse> {
  const response = await getTable({
    client: backendClient,
    query: { schema_name: schemaName, table_name: tableName },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data?.data) {
    throw new Error("No table data received from server");
  }
  return response.data.data;
}

function filterSchemas(
  schemas: SchemaEntry[] | undefined,
  query: string,
): SchemaEntry[] {
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
          `${s.schema_name} ${t.table_name} ${s.description ?? ""} ${t.description ?? ""}`.toLowerCase();
        return blob.includes(needle);
      }),
    }))
    .filter((s) => s.tables.length > 0);
}

interface SchemaSidebarProps {
  schemas: SchemaEntry[];
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
    <div className="border border-gray-600 rounded-lg overflow-hidden bg-neutral-900/40 max-h-[min(70vh,720px)] overflow-y-auto">
      <ul className="divide-y divide-gray-700">
        {schemas.map((schema) => (
          <li key={schema.schema_name}>
            <div className="px-3 py-2 bg-neutral-800/80 sticky top-0 z-[1] border-b border-gray-700">
              <p className="font-mono text-sm text-white">
                {schema.schema_name}
              </p>
              {schema.description ? (
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  {schema.description}
                </p>
              ) : null}
            </div>
            <ul>
              {schema.tables.map((t) => {
                const active =
                  selectedSchema === schema.schema_name &&
                  selectedTable === t.table_name;
                return (
                  <li key={`${schema.schema_name}.${t.table_name}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(schema.schema_name, t.table_name)}
                      className={classNames(
                        "w-full text-left px-3 py-2 text-sm transition-colors border-l-2",
                        active
                          ? "border-[#646cff] bg-[#646cff]/15 text-white"
                          : "border-transparent text-gray-300 hover:bg-neutral-800 hover:text-white",
                      )}
                    >
                      <span className="font-mono block">{t.table_name}</span>
                      {t.description ? (
                        <span className="text-xs text-gray-500 block mt-0.5 leading-snug">
                          {t.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TablePreviewProps {
  payload: GetTableResponse;
}

function TablePreview({ payload }: TablePreviewProps): ReactElement {
  const metaColumns: Column[] = [
    { name: "Column" },
    { name: "Type" },
    { name: "Unit" },
    { name: "UCD" },
    { name: "Description" },
  ];

  const metaRows: Record<string, CellPrimitive>[] = payload.columns.map(
    (c) => ({
      Column: c.column_name,
      Type: c.data_type ?? "—",
      Unit: c.unit ?? "—",
      UCD: c.ucd ?? "—",
      Description: c.description ?? "—",
    }),
  );

  const sampleColumnDefs: Column[] = payload.columns.map((c) => ({
    name: c.column_name,
  }));

  const sampleRows: Record<string, CellPrimitive>[] = payload.sample_rows.map(
    (row) => {
      const out: Record<string, CellPrimitive> = {};
      for (const col of payload.columns) {
        const v = row[col.column_name];
        out[col.column_name] = v ?? "—";
      }
      return out;
    },
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-1">
          Table metadata
        </h3>
        <p className="font-mono text-sm text-gray-400 mb-1">
          {payload.schema_name}.{payload.table_name}
        </p>
        {payload.description ? (
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            {payload.description}
          </p>
        ) : null}
        <p className="text-sm text-gray-500 mb-4">
          Curation view:{" "}
          <Link href={`/table/${payload.table_name}`}>
            {payload.table_name}
          </Link>
        </p>
        <CommonTable columns={metaColumns} data={metaRows}>
          <span className="text-white font-medium">Columns</span>
        </CommonTable>
      </div>

      <div>
        <CommonTable columns={sampleColumnDefs} data={sampleRows}>
          <span className="text-white font-medium">Sample rows</span>
        </CommonTable>
      </div>
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

  const selectedSchema = schemaName ?? null;
  const selectedTable = tableName ?? null;

  useEffect(() => {
    document.title = "Data catalog | HyperLEDA";
  }, []);

  const {
    data: schemaPayload,
    loading: schemasLoading,
    error: schemasError,
  } = useDataFetching(() => fetchSchemaList(), []);

  const {
    data: tablePayload,
    loading: tableLoading,
    error: tableError,
  } = useDataFetching((): Promise<GetTableResponse | null> => {
    if (!selectedSchema || !selectedTable) {
      return Promise.resolve(null);
    }
    return fetchTablePreview(selectedSchema, selectedTable);
  }, [selectedSchema ?? "", selectedTable ?? ""]);

  const filtered = useMemo(
    () => filterSchemas(schemaPayload?.schemas, filter),
    [schemaPayload?.schemas, filter],
  );

  function handleSelect(nextSchema: string, nextTable: string): void {
    navigate(
      `/data-catalog/${encodeURIComponent(nextSchema)}/${encodeURIComponent(nextTable)}`,
    );
  }

  function SidebarContent(): ReactElement {
    if (schemasError && !schemaPayload) {
      return <ErrorPage title="Could not load schema" message={schemasError} />;
    }
    if (schemasLoading && !schemaPayload) {
      return <Loading />;
    }
    if (!filtered.length) {
      return (
        <p className="text-gray-400 text-sm p-4">
          {schemaPayload?.schemas.length
            ? "No tables match your filter."
            : "No schemas returned by the API."}
        </p>
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
      return (
        <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-gray-400">
          <p className="text-lg text-gray-300 mb-2">
            Browse the public data API
          </p>
          <p className="text-sm leading-relaxed max-w-md mx-auto">
            This catalog mirrors{" "}
            <code className="text-gray-300">GET /api/v1/schema</code> and{" "}
            <code className="text-gray-300">GET /api/v1/table</code>. Choose a
            table on the left to see column definitions and sample rows.
          </p>
        </div>
      );
    }

    const previewMatchesSelection =
      tablePayload &&
      tablePayload.schema_name === selectedSchema &&
      tablePayload.table_name === selectedTable;

    if (tableError) {
      return <ErrorPage title="Could not load table" message={tableError} />;
    }

    if (tableLoading && !previewMatchesSelection) {
      return <Loading />;
    }

    if (tablePayload && previewMatchesSelection) {
      return <TablePreview payload={tablePayload} />;
    }

    return <Loading />;
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <h2 className="text-3xl font-bold mb-2">Data catalog</h2>
      <p className="text-gray-400 mb-6 text-sm">
        Schemas and tables exposed by the HyperLEDA data API, with a live
        preview of each table&apos;s structure and sample data.
      </p>

      <div className="mb-4 max-w-md">
        <TextFilter
          title="Filter tables"
          value={filter}
          onChange={setFilter}
          placeholder="Schema, table name, or description"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-[min(100%,380px)] lg:flex-shrink-0">
          <SidebarContent />
        </div>
        <div className="flex-grow min-w-0 w-full">
          <DetailContent />
        </div>
      </div>
    </div>
  );
}
