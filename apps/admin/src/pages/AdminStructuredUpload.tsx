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
const HISTORY_STORAGE_KEY = "leda.admin.structured-upload.history";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;
const HISTORY_MAX_ENTRIES = 20;
const HISTORY_INPUT_TRUNCATE = 28;

interface StructuredUploadDraft {
  savedAt: number;
  catalog: string;
  tableName: string;
  expressions: Record<string, string>;
  write: boolean;
  batchSize: number;
  rowFilter: string;
}

type StructuredUploadHistoryEntry = StructuredUploadDraft;

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
      rowFilter: String(draft.rowFilter || ""),
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

function readHistory(): StructuredUploadHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    // SAFETY: pushHistory is the only writer; malformed entries are dropped below.
    const parsed = JSON.parse(raw) as StructuredUploadHistoryEntry[];
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
      return [];
    }
    const entries: StructuredUploadHistoryEntry[] = [];
    for (const entry of parsed) {
      if (
        !Number.isFinite(entry.savedAt) ||
        !entry.catalog ||
        !entry.tableName
      ) {
        continue;
      }
      entries.push({
        savedAt: Number(entry.savedAt),
        catalog: String(entry.catalog),
        tableName: String(entry.tableName),
        expressions:
          entry.expressions instanceof Object &&
          !Array.isArray(entry.expressions)
            ? Object.fromEntries(
                Object.entries(entry.expressions).map(([key, value]) => [
                  key,
                  String(value || ""),
                ]),
              )
            : {},
        write: entry.write !== false,
        batchSize: Number.isFinite(entry.batchSize)
          ? Number(entry.batchSize)
          : DEFAULT_BATCH_SIZE,
        rowFilter: String(entry.rowFilter || ""),
      });
      if (entries.length >= HISTORY_MAX_ENTRIES) {
        break;
      }
    }
    return entries;
  } catch {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    return [];
  }
}

function pushHistory(
  entry: Omit<StructuredUploadHistoryEntry, "savedAt">,
): StructuredUploadHistoryEntry[] {
  const next: StructuredUploadHistoryEntry[] = [
    { ...entry, savedAt: Date.now() },
    ...readHistory(),
  ].slice(0, HISTORY_MAX_ENTRIES);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

function formatHistoryInputs(entry: StructuredUploadHistoryEntry): string {
  const parts: string[] = [];
  if (entry.rowFilter.trim()) {
    parts.push(
      `filter=${truncateText(entry.rowFilter, HISTORY_INPUT_TRUNCATE)}`,
    );
  }
  for (const [name, value] of Object.entries(entry.expressions)) {
    if (!value.trim()) {
      continue;
    }
    parts.push(`${name}=${truncateText(value, HISTORY_INPUT_TRUNCATE)}`);
  }
  return parts.join(" · ");
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
  rowFilter: string,
): StartStructuredUploadRequest["params"] {
  const params: StartStructuredUploadRequest["params"] = {
    table_name: tableName.trim(),
    write,
    batch_size: batchSize,
    row_filter: rowFilter.trim(),
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

function HistoryMenu({
  history,
  onSelect,
}: {
  history: StructuredUploadHistoryEntry[];
  onSelect: (entry: StructuredUploadHistoryEntry) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target;
      // SAFETY: EventTarget from MouseEvent is a Node when dispatched from the document tree.
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        className="bg-transparent! border-border!"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        History
      </Button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-[min(28rem,calc(100vw-2rem))] max-h-80 overflow-y-auto rounded border border-border bg-surface-2 shadow-lg"
        >
          {history.map((entry) => {
            const inputs = formatHistoryInputs(entry);
            return (
              <li key={`${entry.savedAt}-${entry.catalog}-${entry.tableName}`}>
                <button
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 hover:bg-surface border-b border-border last:border-b-0"
                  onClick={() => {
                    onSelect(entry);
                    setOpen(false);
                  }}
                >
                  <div className="text-sm text-primary">
                    {entry.catalog}
                    <span className="text-muted"> · </span>
                    {entry.tableName}
                  </div>
                  {inputs ? (
                    <div className="text-[11px] leading-snug text-muted mt-0.5 break-all">
                      {inputs}
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
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
  const [rowFilter, setRowFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewCounts, setPreviewCounts] = useState<{
    eligible: number;
    total: number;
  } | null>(null);
  const [previewFields, setPreviewFields] = useState<string[]>([]);
  const [previewErrors, setPreviewErrors] = useState(
    () => new Map<string, string>(),
  );
  const [draftReady, setDraftReady] = useState(false);
  const [history, setHistory] = useState<StructuredUploadHistoryEntry[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  function clearPreview(): void {
    setPreviewRows(null);
    setPreviewCounts(null);
    setPreviewFields([]);
    setPreviewErrors(new Map());
  }

  function applyHistoryEntry(entry: StructuredUploadHistoryEntry): void {
    const catalog = catalogs.find((item) => item.catalog === entry.catalog);
    if (!catalog) {
      setSubmitError(`Catalog ${entry.catalog} is no longer available.`);
      return;
    }
    setSelectedCatalog(catalog.catalog);
    setTableName(entry.tableName);
    setWrite(entry.write);
    setBatchSize(entry.batchSize || DEFAULT_BATCH_SIZE);
    setRowFilter(entry.rowFilter);
    setExpressions(
      new Map(
        catalog.fields.map((field) => [
          field.name,
          entry.expressions[field.name] ?? "",
        ]),
      ),
    );
    setSubmitError(null);
    clearPreview();
  }

  useEffect(() => {
    document.title = "Structured upload | LEDA";
  }, []);

  useEffect(() => {
    setHistory(readHistory());
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
            setRowFilter(draft.rowFilter);
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
        rowFilter,
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [
    draftReady,
    selectedCatalog,
    tableName,
    expressions,
    write,
    batchSize,
    rowFilter,
  ]);

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
          row_filter: rowFilter.trim() || null,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const data = response.data.data;
      const rows = data.rows;
      const errors = data.errors;
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
      setPreviewCounts({
        eligible: data.eligible_count,
        total: data.total_count,
      });
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
            rowFilter,
          ),
          action_description: `structured upload ${schema.catalog} from ${tableName.trim()}`,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const taskId = response.data.data.task_id;
      setHistory(
        pushHistory({
          catalog: schema.catalog,
          tableName: tableName.trim(),
          expressions: Object.fromEntries(expressions),
          write,
          batchSize,
          rowFilter,
        }),
      );
      clearDraft();
      window.location.assign(`${sameEnvTasksOrigin()}/runs/flow-run/${taskId}`);
    } catch (error) {
      setSubmitError(formatCaughtError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-3xl font-bold">Structured upload</h2>
        {history.length > 0 ? (
          <HistoryMenu history={history} onSelect={applyHistoryEntry} />
        ) : null}
      </div>

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

            <div>
              <label htmlFor="row_filter" className="block mb-1 text-subtle">
                Row filter
              </label>
              <input
                id="row_filter"
                type="text"
                value={rowFilter}
                disabled={submitting}
                placeholder="Empty is no filter"
                onChange={(event) => {
                  setRowFilter(event.target.value);
                  setSubmitError(null);
                  clearPreview();
                }}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
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

      {previewRows && previewCounts ? (
        <div ref={previewRef}>
          <StructuredUploadPreview
            rows={previewRows}
            fields={previewFields}
            eligibleCount={previewCounts.eligible}
            totalCount={previewCounts.total}
          />
        </div>
      ) : null}
    </div>
  );
}
