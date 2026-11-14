import {
  FormEvent,
  ReactElement,
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
} from "../clients/admin";
import { adminClient } from "../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import { Button } from "@leda/lib/ui";
import { ExpressionEditor } from "../components/ExpressionEditor";
import { StructuredUploadPreview } from "../components/StructuredUploadPreview";
import { CopyButton, FieldInput } from "../components/ui";

const DEFAULT_BATCH_SIZE = 10_000;
const TABLE_LOAD_DEBOUNCE_MS = 300;
const TABLE_SEARCH_PAGE_SIZE = 20;
const DRAFT_STORAGE_KEY = "leda.admin.structured-upload.draft";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface StructuredUploadDraft {
  savedAt: number;
  catalog: string;
  tableName: string;
  expressions: Record<string, string>;
  write: boolean;
  batchSize: number;
}

function readDraft(): StructuredUploadDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    // SAFETY: writeDraft is the only writer; savedAt expiry rejects stale or corrupt payloads.
    const draft = JSON.parse(raw) as StructuredUploadDraft;
    if (
      !Number.isFinite(draft.savedAt) ||
      Date.now() - draft.savedAt > DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return {
      savedAt: draft.savedAt,
      catalog: String(draft.catalog || ""),
      tableName: String(draft.tableName || ""),
      expressions:
        draft.expressions instanceof Object && !Array.isArray(draft.expressions)
          ? Object.fromEntries(
              Object.entries(draft.expressions).map(([key, value]) => [
                key,
                String(value || ""),
              ]),
            )
          : {},
      write: draft.write !== false,
      batchSize: Number.isFinite(draft.batchSize)
        ? Number(draft.batchSize)
        : DEFAULT_BATCH_SIZE,
    };
  } catch {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

function writeDraft(draft: Omit<StructuredUploadDraft, "savedAt">): void {
  const payload: StructuredUploadDraft = { ...draft, savedAt: Date.now() };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

function clearDraft(): void {
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
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

async function loadTableNameOptions(query: string) {
  const response = await getTableList({
    client: adminClient,
    query: {
      query: query.trim() || undefined,
      page: 0,
      page_size: TABLE_SEARCH_PAGE_SIZE,
    },
  });
  if (response.error) {
    throw new Error(describeUnknownError(response.error));
  }
  return response.data.data.tables.map((item) => ({
    value: item.name,
    label: item.name,
    description: item.description,
  }));
}

function TableColumnsPanel({
  tableName,
  columns,
  loading,
  error,
}: {
  tableName: string;
  columns: ColumnDescription[];
  loading: boolean;
  error: string | null;
}): ReactElement {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => columns.filter((column) => matchesColumnQuery(column, query)),
    [columns, query],
  );

  useEffect(() => {
    setQuery("");
  }, [tableName]);

  if (!tableName.trim()) {
    return (
      <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 text-sm text-muted">
        Select a table to browse its columns.
      </aside>
    );
  }

  return (
    <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 flex flex-col gap-3 overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
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

      {loading ? (
        <p className="text-sm text-muted shrink-0">Loading columns…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger shrink-0" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <ul className="flex-1 overflow-y-auto divide-y divide-border -mx-1 min-h-0">
          {filtered.length === 0 ? (
            <li className="px-1 py-3 text-sm text-muted">
              No matching columns.
            </li>
          ) : (
            filtered.map((column) => (
              <li key={column.name} className="px-1 py-3">
                <CopyButton textToCopy={column.name}>
                  <p className="text-sm text-primary">{column.name}</p>
                </CopyButton>
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
  const [draftReady, setDraftReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
        if (cancelled) {
          return;
        }
        const loaded = response.data.data.catalogs;
        setCatalogs(loaded);
        const draft = readDraft();
        if (draft) {
          const catalog = loaded.find((item) => item.catalog === draft.catalog);
          if (catalog) {
            setSelectedCatalog(catalog.catalog);
            setTableName(draft.tableName);
            setWrite(draft.write);
            setBatchSize(draft.batchSize || DEFAULT_BATCH_SIZE);
            setExpressions(
              new Map(
                catalog.fields.map((field) => [
                  field.name,
                  draft.expressions[field.name] ?? "",
                ]),
              ),
            );
          } else {
            clearDraft();
          }
        }
        setDraftReady(true);
      } catch (error) {
        if (!cancelled) {
          setCatalogsError(formatCaughtError(error));
          setDraftReady(true);
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
    if (!draftReady) {
      return;
    }
    const timer = setTimeout(() => {
      if (
        !selectedCatalog &&
        !tableName.trim() &&
        ![...expressions.values()].some((value) => value.trim())
      ) {
        clearDraft();
        return;
      }
      writeDraft({
        catalog: selectedCatalog,
        tableName,
        expressions: Object.fromEntries(expressions),
        write,
        batchSize,
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draftReady, selectedCatalog, tableName, expressions, write, batchSize]);

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
          field.required !== false &&
          !(expressions.get(field.name) ?? "").trim(),
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
      clearDraft();
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
          <form onSubmit={handleSubmit} className="space-y-6 min-w-0 w-full">
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
              <FieldInput
                input={{
                  kind: "autocomplete",
                  loadOptions: loadTableNameOptions,
                }}
                value={tableName}
                disabled={submitting}
                placeholder="rawdata table name"
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
                  const required = field.required !== false;
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
