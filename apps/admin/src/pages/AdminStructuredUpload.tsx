import {
  FormEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getCatalogs,
  getTable,
  getTableList,
  previewStructuredUpload,
  startStructuredUpload,
  type CatalogField,
  type CatalogSchema,
  type ColumnDescription,
  type PreviewRow,
  type StartStructuredUploadRequest,
  type TableListItem,
} from "../clients/admin";
import { adminClient } from "../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import { Button, SuggestibleInput } from "@leda/lib/ui";
import { ExpressionEditor } from "../components/ExpressionEditor";
import { StructuredUploadPreview } from "../components/StructuredUploadPreview";

const DEFAULT_BATCH_SIZE = 10_000;
const TABLE_SEARCH_DEBOUNCE_MS = 300;
const TABLE_LOAD_DEBOUNCE_MS = 300;
const TABLE_SEARCH_PAGE_SIZE = 20;

function fieldRequired(field: CatalogField): boolean {
  return field.required !== false;
}

function fieldHint(field: CatalogField): string {
  const parts: string[] = [];
  if (field.description) {
    parts.push(field.description);
  }
  parts.push(`Type: ${field.data_type}`);
  if (field.unit) {
    parts.push(`Unit: ${field.unit}`);
  }
  return parts.join(" · ");
}

function buildUploadParams(
  schema: CatalogSchema,
  tableName: string,
  expressions: Map<string, string>,
  write: boolean,
  batchSize: number,
): StartStructuredUploadRequest["params"] {
  const params: StartStructuredUploadRequest["params"] = {
    table_name: tableName.trim(),
    write,
    batch_size: batchSize,
  };
  for (const field of schema.fields) {
    params[field.name] = expressions.get(field.name) ?? "";
  }
  return params;
}

function nonEmptyExpressions(expressions: Map<string, string>) {
  return Object.fromEntries(
    [...expressions].filter(([, value]) => value.trim()),
  );
}

function matchesColumnQuery(column: ColumnDescription, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    column.name,
    column.data_type,
    column.description ?? "",
    column.unit ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function TableNameInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  const [suggestions, setSuggestions] = useState<TableListItem[]>([]);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function load(query: string): Promise<void> {
    const id = requestId.current + 1;
    requestId.current = id;
    try {
      const response = await getTableList({
        client: adminClient,
        query: {
          query: query.trim() || undefined,
          page: 0,
          page_size: TABLE_SEARCH_PAGE_SIZE,
        },
      });
      if (id !== requestId.current) {
        return;
      }
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      setSuggestions(response.data.data.tables);
    } catch {
      if (id === requestId.current) {
        setSuggestions([]);
      }
    }
  }

  function schedule(query: string): void {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      void load(query);
    }, TABLE_SEARCH_DEBOUNCE_MS);
  }

  function suggestionNodes(): ReactNode[] {
    return suggestions.map((item) => (
      <button
        key={item.name}
        type="button"
        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(item.name)}
      >
        <div>{item.name}</div>
        {item.description ? (
          <div className="text-xs text-muted">{item.description}</div>
        ) : null}
      </button>
    ));
  }

  return (
    <SuggestibleInput
      value={value}
      disabled={disabled}
      placeholder="rawdata table name"
      onChange={(next) => {
        onChange(next);
        schedule(next);
      }}
      onFocus={() => {
        void load(value);
      }}
      getSuggestions={suggestionNodes}
    />
  );
}

function TableColumnsPanel({
  tableName,
  columns,
  loading,
  error,
  maxHeight,
}: {
  tableName: string;
  columns: ColumnDescription[];
  loading: boolean;
  error: string | null;
  maxHeight: number | null;
}): ReactElement {
  const [query, setQuery] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtered = useMemo(
    () => columns.filter((column) => matchesColumnQuery(column, query)),
    [columns, query],
  );

  useEffect(() => {
    setQuery("");
    setCopiedName(null);
  }, [tableName]);

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  async function copyColumnName(name: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
      copiedTimer.current = setTimeout(() => {
        setCopiedName(null);
      }, 1000);
    } catch {
      setCopiedName(null);
    }
  }

  if (!tableName.trim()) {
    return (
      <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 text-sm text-muted">
        Select a table to browse its columns.
      </aside>
    );
  }

  return (
    <aside
      className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 flex flex-col gap-3 min-h-0 lg:sticky lg:top-4 overflow-hidden"
      style={maxHeight !== null ? { maxHeight } : undefined}
    >
      <div className="shrink-0">
        <h3 className="font-semibold text-primary">Columns</h3>
        <p className="text-xs text-muted mt-1 break-all">{tableName.trim()}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter columns…"
        className="w-full shrink-0 bg-surface border border-border rounded px-3 py-2 text-sm text-primary placeholder:text-muted"
      />

      {loading ? <p className="text-sm text-muted">Loading columns…</p> : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <ul className="overflow-y-auto divide-y divide-border -mx-1 min-h-0">
          {filtered.length === 0 ? (
            <li className="px-1 py-3 text-sm text-muted">
              No matching columns.
            </li>
          ) : (
            filtered.map((column) => (
              <li key={column.name} className="px-1 py-3">
                <button
                  type="button"
                  onClick={() => void copyColumnName(column.name)}
                  title={`Copy ${column.name}`}
                  className="font-mono text-sm text-left text-primary hover:text-accent cursor-pointer"
                >
                  {copiedName === column.name ? "Copied" : column.name}
                </button>
                <div className="text-xs text-muted mt-0.5">
                  {column.data_type}
                  {column.unit ? ` · ${column.unit}` : ""}
                </div>
                {column.description ? (
                  <p className="text-xs text-subtle mt-1">
                    {column.description}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </aside>
  );
}

export function AdminStructuredUploadPage(): ReactElement {
  const [catalogs, setCatalogs] = useState<CatalogSchema[]>([]);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<ColumnDescription[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const [expressions, setExpressions] = useState(
    () => new Map<string, string>(),
  );
  const [write, setWrite] = useState(true);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewFields, setPreviewFields] = useState<string[]>([]);
  const [previewErrors, setPreviewErrors] = useState(
    () => new Map<string, string>(),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number | null>(null);

  function clearPreview(): void {
    setPreviewRows(null);
    setPreviewFields([]);
    setPreviewErrors(new Map());
  }

  useEffect(() => {
    document.title = "Structured upload | LEDA";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs(): Promise<void> {
      setCatalogsLoading(true);
      setCatalogsError(null);
      try {
        const response = await getCatalogs({ client: adminClient });
        if (response.error) {
          throw new Error(describeUnknownError(response.error));
        }
        if (!response.data) {
          throw new Error("Unknown error");
        }
        if (!cancelled) {
          setCatalogs(response.data.data.catalogs);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogsError(formatCaughtError(error));
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    }

    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmed = tableName.trim();
    if (!trimmed) {
      setColumns([]);
      setColumnsError(null);
      setColumnsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setColumnsLoading(true);
        setColumnsError(null);
        try {
          const response = await getTable({
            client: adminClient,
            query: { table_name: trimmed },
          });
          if (cancelled) {
            return;
          }
          if (response.error) {
            throw new Error(describeUnknownError(response.error));
          }
          setColumns(response.data.data.column_info);
        } catch (error) {
          if (!cancelled) {
            setColumns([]);
            setColumnsError(formatCaughtError(error));
          }
        } finally {
          if (!cancelled) {
            setColumnsLoading(false);
          }
        }
      })();
    }, TABLE_LOAD_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tableName]);

  const schema = useMemo(
    () => catalogs.find((item) => item.catalog === selectedCatalog) ?? null,
    [catalogs, selectedCatalog],
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      setFormHeight(null);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setFormHeight(
        entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height,
      );
    });
    observer.observe(form);
    return () => {
      observer.disconnect();
    };
  }, [schema, catalogsLoading, catalogsError]);

  function handleCatalogChange(catalog: string): void {
    setSelectedCatalog(catalog);
    setSubmitError(null);
    clearPreview();
    const next = catalogs.find((item) => item.catalog === catalog);
    setExpressions(
      new Map((next?.fields ?? []).map((field) => [field.name, ""])),
    );
  }

  async function handlePreview(): Promise<void> {
    if (!schema) {
      return;
    }
    const sent = nonEmptyExpressions(expressions);
    setPreviewing(true);
    setSubmitError(null);
    clearPreview();

    try {
      const response = await previewStructuredUpload({
        client: adminClient,
        body: {
          catalog: schema.catalog,
          table_name: tableName.trim(),
          expressions: sent,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const { rows, errors } = response.data.data;
      setPreviewErrors(
        new Map(
          errors.map((error) => [
            error.field,
            error.record_id
              ? `${error.message} (record ${error.record_id})`
              : error.message,
          ]),
        ),
      );
      if (errors.length > 0) {
        setPreviewRows(null);
        setPreviewFields([]);
        return;
      }
      setPreviewFields(Object.keys(sent));
      setPreviewRows(rows);
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch (error) {
      setSubmitError(formatCaughtError(error));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!schema) {
      return;
    }
    if (!tableName.trim()) {
      setSubmitError("Table name is required.");
      return;
    }
    const missing = schema.fields
      .filter(
        (field) =>
          fieldRequired(field) && !(expressions.get(field.name) ?? "").trim(),
      )
      .map((field) => field.name);
    if (missing.length > 0) {
      setSubmitError(`Required fields: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await startStructuredUpload({
        client: adminClient,
        body: {
          catalog: schema.catalog,
          params: buildUploadParams(
            schema,
            tableName,
            expressions,
            write,
            batchSize,
          ),
          action_description: `structured upload ${schema.catalog} from ${tableName.trim()}`,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const taskId = response.data.data.task_id;
      window.location.assign(`${sameEnvTasksOrigin()}/runs/flow-run/${taskId}`);
    } catch (error) {
      setSubmitError(formatCaughtError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-2">Structured upload</h2>

      {catalogsLoading ? <p className="text-muted">Loading catalogs…</p> : null}
      {catalogsError ? (
        <p className="text-danger" role="alert">
          {catalogsError}
        </p>
      ) : null}

      {!catalogsLoading && !catalogsError ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6 min-w-0 w-full"
          >
            <div>
              <label htmlFor="catalog" className="block mb-1 text-subtle">
                Catalog
              </label>
              <select
                id="catalog"
                value={selectedCatalog}
                onChange={(event) => handleCatalogChange(event.target.value)}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
              >
                <option value="">Select a catalog…</option>
                {catalogs.map((item) => (
                  <option key={item.catalog} value={item.catalog}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-subtle">Table name</label>
              <TableNameInput
                value={tableName}
                disabled={submitting}
                onChange={(next) => {
                  setTableName(next);
                  setSubmitError(null);
                  clearPreview();
                }}
              />
            </div>

            {schema ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">{schema.description}</p>

                {schema.fields.map((field) => {
                  const required = fieldRequired(field);
                  return (
                    <div key={field.name}>
                      <label className="block mb-1 text-subtle">
                        {field.name}
                        {required ? null : (
                          <span className="text-muted"> (optional)</span>
                        )}
                      </label>
                      <ExpressionEditor
                        ariaLabel={field.name}
                        value={expressions.get(field.name) ?? ""}
                        disabled={submitting}
                        onChange={(value) => {
                          setExpressions((current) => {
                            const next = new Map(current);
                            next.set(field.name, value);
                            return next;
                          });
                          setPreviewErrors((current) => {
                            const next = new Map(current);
                            next.delete(field.name);
                            return next;
                          });
                        }}
                      />
                      {previewErrors.has(field.name) ? (
                        <p className="text-xs text-danger mt-1" role="alert">
                          {previewErrors.get(field.name)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted mt-1">
                          {fieldHint(field)}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center gap-2">
                  <input
                    id="write"
                    type="checkbox"
                    checked={write}
                    onChange={(event) => setWrite(event.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="write" className="text-subtle">
                    Write rows into the catalog
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="batch_size"
                    className="block mb-1 text-subtle"
                  >
                    Batch size
                  </label>
                  <input
                    id="batch_size"
                    type="number"
                    min={1}
                    max={500_000}
                    required
                    value={batchSize}
                    onChange={(event) =>
                      setBatchSize(
                        Number(event.target.value) || DEFAULT_BATCH_SIZE,
                      )
                    }
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={submitting || !selectedCatalog}
                  >
                    {submitting ? "Starting…" : "Start upload"}
                  </Button>
                  <Button
                    type="button"
                    className="bg-transparent! border-border!"
                    disabled={
                      previewing || !selectedCatalog || !tableName.trim()
                    }
                    onClick={() => void handlePreview()}
                  >
                    {previewing ? "Previewing…" : "Preview"}
                  </Button>
                </div>

                {submitError ? (
                  <p className="text-danger" role="alert">
                    {submitError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>

          <TableColumnsPanel
            tableName={tableName}
            columns={columns}
            loading={columnsLoading}
            error={columnsError}
            maxHeight={formHeight}
          />
        </div>
      ) : null}

      {previewRows ? (
        <div ref={previewRef}>
          <StructuredUploadPreview rows={previewRows} fields={previewFields} />
        </div>
      ) : null}
    </div>
  );
}
