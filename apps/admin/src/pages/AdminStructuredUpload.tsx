import {
  ReactElement,
  ReactNode,
  SubmitEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MdPlayArrow, MdVisibility } from "react-icons/md";
import {
  getCatalogs,
  getTable,
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
import { Button, Loading, Text } from "@leda/lib/ui";
import { ExpressionEditor } from "../components/ExpressionEditor";
import {
  Form,
  FormField,
  FormTableSearchField,
  clearFormDraft,
  readFormDraft,
} from "../components/form";
import { StructuredUploadPreview } from "../components/StructuredUploadPreview";
import { CopyButton } from "../components/ui";

const DEFAULT_BATCH_SIZE = 10_000;
const TABLE_LOAD_DEBOUNCE_MS = 300;
const DRAFT_STORAGE_KEY = "leda.admin.structured-upload.draft";
const HISTORY_STORAGE_KEY = "leda.admin.structured-upload.history";
const HISTORY_MAX_ENTRIES = 20;
const HISTORY_INPUT_TRUNCATE = 28;

interface StructuredUploadDraft {
  catalog: string;
  tableName: string;
  expressions: Record<string, string>;
  write: boolean;
  batchSize: number;
  rowFilter: string;
}

interface StructuredUploadHistoryEntry extends StructuredUploadDraft {
  savedAt: number;
}

function normalizeStructuredUploadDraft(
  draft: Partial<StructuredUploadDraft> | null,
): StructuredUploadDraft | null {
  if (draft === null) {
    return null;
  }
  const expressions = draft.expressions;
  return {
    catalog: String(draft.catalog || ""),
    tableName: String(draft.tableName || ""),
    expressions:
      expressions instanceof Object && !Array.isArray(expressions)
        ? Object.fromEntries(
            Object.entries(expressions).map(([key, value]) => [
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
}

function isEmptyStructuredUploadDraft(draft: StructuredUploadDraft): boolean {
  return (
    !draft.catalog &&
    !draft.tableName.trim() &&
    !Object.values(draft.expressions).some((value) => value.trim())
  );
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
        const draft = normalizeStructuredUploadDraft(
          readFormDraft<Partial<StructuredUploadDraft>>(DRAFT_STORAGE_KEY),
        );
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
            clearFormDraft(DRAFT_STORAGE_KEY);
          }
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

  function handleCatalogChange(catalog: string): void {
    setSelectedCatalog(catalog);
    setSubmitError(null);
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
    event: SubmitEvent<HTMLFormElement>,
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
      clearFormDraft(DRAFT_STORAGE_KEY);
      window.location.assign(
        `${sameEnvTasksOrigin()}/v2/runs/flow-run/${taskId}`,
      );
    } catch (error) {
      setSubmitError(formatCaughtError(error));
      setSubmitting(false);
    }
  }

  const busy = submitting || previewing;
  const draftValue: StructuredUploadDraft = {
    catalog: selectedCatalog,
    tableName,
    expressions: Object.fromEntries(expressions),
    write,
    batchSize,
    rowFilter,
  };
  const fields: ReactNode[] = [
    <FormField
      key="catalog"
      kind="select"
      id="catalog"
      label="Catalog"
      value={selectedCatalog}
      placeholder="Select a catalog…"
      options={catalogs.map((item) => ({
        value: item.catalog,
        label: item.title,
      }))}
      onChange={handleCatalogChange}
    />,
    <FormTableSearchField
      key="tableName"
      label="Table name"
      value={tableName}
      onChange={(next) => {
        setTableName(next);
        setSubmitError(null);
      }}
    />,
    <FormField
      key="rowFilter"
      kind="text"
      id="row_filter"
      label="Row filter"
      value={rowFilter}
      placeholder="mag < 15 AND survey = 'SDSS'"
      onChange={(next) => {
        setRowFilter(next);
        setSubmitError(null);
      }}
    />,
  ];
  if (schema) {
    fields.push(
      <p key="description" className="text-sm text-muted">
        {schema.description}
      </p>,
    );
    for (const field of schema.fields) {
      const required = field.required !== false;
      fields.push(
        <FormField
          key={field.name}
          kind="custom"
          label={field.name}
          optional={!required}
          error={previewErrors.get(field.name) ?? null}
          hint={fieldHint(field)}
        >
          <ExpressionEditor
            ariaLabel={field.name}
            value={expressions.get(field.name) ?? ""}
            disabled={busy}
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
        </FormField>,
      );
    }
    fields.push(
      <FormField
        key="write"
        kind="checkbox"
        id="write"
        label="Write rows into the catalog"
        checked={write}
        onChange={setWrite}
      />,
      <FormField
        key="batchSize"
        kind="number"
        id="batch_size"
        label="Batch size"
        value={batchSize}
        min={1}
        max={500_000}
        required
        onChange={(next) => {
          setBatchSize(Number(next) || DEFAULT_BATCH_SIZE);
        }}
      />,
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <Text as="h2" style="header" size="medium">
          Structured upload
        </Text>
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
          <Form
            fields={fields}
            actions={
              <>
                <Button
                  type="button"
                  disabled={busy || !selectedCatalog || !tableName.trim()}
                  onClick={() => {
                    void handlePreview();
                  }}
                >
                  {previewing ? (
                    <Loading inline message="Loading preview..." />
                  ) : (
                    <>
                      <MdVisibility className="w-4 h-4 mr-1" />
                      Preview a batch
                    </>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={busy || !selectedCatalog || !tableName.trim()}
                >
                  {submitting ? (
                    "Starting…"
                  ) : (
                    <>
                      <MdPlayArrow className="w-4 h-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              </>
            }
            busy={busy}
            error={submitError}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            draftKey={DRAFT_STORAGE_KEY}
            draftValue={draftValue}
            isEmptyDraft={isEmptyStructuredUploadDraft}
          />

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
