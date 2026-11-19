import { FormEvent, ReactElement, useEffect, useRef, useState } from "react";
import {
  getTableList,
  previewCrossmatch,
  startCrossmatch,
  type PreviewCrossmatchRow,
  type StartCrossmatchRequest,
} from "../../clients/admin";
import { adminClient } from "../../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import { Button } from "@leda/lib/ui";
import { FieldInput } from "../../components/ui";
import { CrossmatchPreview } from "./CrossmatchPreview";
import {
  CrossmatchSkyPanel,
  useCrossmatchSkySelection,
} from "./CrossmatchSkyPanel";

const DEFAULT_RADIUS = 30;
const DEFAULT_BATCH_SIZE = 1000;
const TABLE_SEARCH_PAGE_SIZE = 20;
const DRAFT_STORAGE_KEY = "leda.admin.crossmatch.draft";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface CrossmatchDraft {
  savedAt: number;
  tableName: string;
  radius: number;
  pgcColumn: string;
  redshiftTolerance: number;
  batchSize: number;
  printPending: boolean;
  write: boolean;
}

function readDraft(): CrossmatchDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    // SAFETY: writeDraft is the only writer; savedAt expiry rejects stale or corrupt payloads.
    const draft = JSON.parse(raw) as CrossmatchDraft;
    if (
      !Number.isFinite(draft.savedAt) ||
      Date.now() - draft.savedAt > DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return {
      savedAt: draft.savedAt,
      tableName: String(draft.tableName || ""),
      radius: Number.isFinite(draft.radius)
        ? Number(draft.radius)
        : DEFAULT_RADIUS,
      pgcColumn: String(draft.pgcColumn || ""),
      redshiftTolerance: Number.isFinite(draft.redshiftTolerance)
        ? Number(draft.redshiftTolerance)
        : 0,
      batchSize: Number.isFinite(draft.batchSize)
        ? Number(draft.batchSize)
        : DEFAULT_BATCH_SIZE,
      printPending: draft.printPending === true,
      write: draft.write !== false,
    };
  } catch {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

function writeDraft(draft: Omit<CrossmatchDraft, "savedAt">): void {
  const payload: CrossmatchDraft = { ...draft, savedAt: Date.now() };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

function clearDraft(): void {
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function isDefaultDraft(draft: Omit<CrossmatchDraft, "savedAt">): boolean {
  return (
    !draft.tableName.trim() &&
    draft.radius === DEFAULT_RADIUS &&
    !draft.pgcColumn.trim() &&
    draft.redshiftTolerance === 0 &&
    draft.batchSize === DEFAULT_BATCH_SIZE &&
    !draft.printPending &&
    draft.write
  );
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

function buildStartParams(
  tableName: string,
  radius: number,
  pgcColumn: string,
  redshiftTolerance: number,
  batchSize: number,
  printPending: boolean,
  write: boolean,
): StartCrossmatchRequest["params"] {
  return {
    table_name: tableName.trim(),
    radius,
    pgc_column: pgcColumn.trim(),
    redshift_tolerance: redshiftTolerance,
    batch_size: batchSize,
    print_pending: printPending,
    write,
  };
}

export function AdminCrossmatchPage(): ReactElement {
  const [initialDraft] = useState(() => readDraft());
  const [tableName, setTableName] = useState(initialDraft?.tableName ?? "");
  const [radius, setRadius] = useState(initialDraft?.radius ?? DEFAULT_RADIUS);
  const [pgcColumn, setPgcColumn] = useState(initialDraft?.pgcColumn ?? "");
  const [redshiftTolerance, setRedshiftTolerance] = useState(
    initialDraft?.redshiftTolerance ?? 0,
  );
  const [batchSize, setBatchSize] = useState(
    initialDraft?.batchSize ?? DEFAULT_BATCH_SIZE,
  );
  const [printPending, setPrintPending] = useState(
    initialDraft?.printPending ?? false,
  );
  const [write, setWrite] = useState(initialDraft?.write ?? true);
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewCrossmatchRow[] | null>(
    null,
  );
  const [previewTotalCount, setPreviewTotalCount] = useState<number | null>(
    null,
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedRecordId, setSelectedRecordId] =
    useCrossmatchSkySelection(previewRows);

  useEffect(() => {
    document.title = "Crossmatch | LEDA";
  }, []);

  useEffect(() => {
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return;
    }
    const draft = {
      tableName,
      radius,
      pgcColumn,
      redshiftTolerance,
      batchSize,
      printPending,
      write,
    };
    const timer = setTimeout(() => {
      if (isDefaultDraft(draft)) {
        clearDraft();
        return;
      }
      writeDraft(draft);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [
    draftReady,
    tableName,
    radius,
    pgcColumn,
    redshiftTolerance,
    batchSize,
    printPending,
    write,
  ]);

  function clearPreview(): void {
    setPreviewRows(null);
    setPreviewTotalCount(null);
  }

  async function handlePreview(): Promise<void> {
    if (!tableName.trim()) {
      setError("Table name is required.");
      return;
    }
    if (!(radius > 0)) {
      setError("Radius must be greater than 0.");
      return;
    }

    setPreviewing(true);
    setError(null);
    clearPreview();

    try {
      const response = await previewCrossmatch({
        client: adminClient,
        body: {
          table_name: tableName.trim(),
          radius,
          pgc_column: pgcColumn.trim(),
          redshift_tolerance: redshiftTolerance,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const data = response.data.data;
      setPreviewRows(data.rows);
      setPreviewTotalCount(data.total_count);
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch (err) {
      setError(formatCaughtError(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!tableName.trim()) {
      setError("Table name is required.");
      return;
    }
    if (!(radius > 0)) {
      setError("Radius must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await startCrossmatch({
        client: adminClient,
        body: {
          params: buildStartParams(
            tableName,
            radius,
            pgcColumn,
            redshiftTolerance,
            batchSize,
            printPending,
            write,
          ),
          action_description: `crossmatch ${tableName.trim()} radius=${radius}`,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const taskId = response.data.data.task_id;
      clearDraft();
      window.location.assign(`${sameEnvTasksOrigin()}/runs/flow-run/${taskId}`);
    } catch (err) {
      setError(formatCaughtError(err));
      setSubmitting(false);
    }
  }

  const busy = submitting || previewing;

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6">Crossmatch</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
        <form onSubmit={handleSubmit} className="space-y-5 min-w-0 w-full">
          <div>
            <label className="block mb-1 text-subtle">Table name</label>
            <FieldInput
              input={{
                kind: "autocomplete",
                loadOptions: loadTableNameOptions,
              }}
              value={tableName}
              disabled={busy}
              placeholder="layer 0 table name"
              onChange={(next) => {
                setTableName(next);
                setError(null);
                clearPreview();
              }}
            />
          </div>

          <div>
            <label htmlFor="radius" className="block mb-1 text-subtle">
              Search radius (arcsec)
            </label>
            <input
              id="radius"
              type="number"
              min={0.001}
              step="any"
              required
              value={radius}
              disabled={busy}
              onChange={(event) => {
                setRadius(Number(event.target.value) || 0);
                setError(null);
                clearPreview();
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
          </div>

          <div>
            <label htmlFor="pgc_column" className="block mb-1 text-subtle">
              PGC column
            </label>
            <input
              id="pgc_column"
              type="text"
              value={pgcColumn}
              disabled={busy}
              placeholder="Empty skips PGC matching"
              onChange={(event) => {
                setPgcColumn(event.target.value);
                setError(null);
                clearPreview();
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
          </div>

          <div>
            <label
              htmlFor="redshift_tolerance"
              className="block mb-1 text-subtle"
            >
              Redshift tolerance
            </label>
            <input
              id="redshift_tolerance"
              type="number"
              min={0}
              step="any"
              value={redshiftTolerance}
              disabled={busy}
              onChange={(event) => {
                setRedshiftTolerance(Number(event.target.value) || 0);
                setError(null);
                clearPreview();
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
            <p className="text-xs text-muted mt-1">
              0 disables redshift matching.
            </p>
          </div>

          <div>
            <label htmlFor="batch_size" className="block mb-1 text-subtle">
              Batch size
            </label>
            <input
              id="batch_size"
              type="number"
              min={1}
              max={500_000}
              required
              value={batchSize}
              disabled={busy}
              onChange={(event) => {
                setBatchSize(Number(event.target.value) || DEFAULT_BATCH_SIZE);
                setError(null);
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="write"
              type="checkbox"
              checked={write}
              disabled={busy}
              onChange={(event) => setWrite(event.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="write" className="text-subtle">
              Write results into layer0.crossmatch
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="print_pending"
              type="checkbox"
              checked={printPending}
              disabled={busy}
              onChange={(event) => setPrintPending(event.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="print_pending" className="text-subtle">
              Log records that need manual check
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy || !tableName.trim()}>
              {submitting ? "Starting…" : "Start crossmatch"}
            </Button>
            <Button
              type="button"
              className="bg-transparent! border-border!"
              disabled={busy || !tableName.trim()}
              onClick={() => void handlePreview()}
            >
              {previewing ? "Previewing…" : "Preview"}
            </Button>
          </div>

          {error ? (
            <p className="text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <CrossmatchSkyPanel
          rows={previewRows ?? []}
          radiusArcsec={radius}
          selectedRecordId={selectedRecordId}
        />
      </div>

      {previewRows && previewTotalCount !== null ? (
        <div ref={previewRef}>
          <CrossmatchPreview
            rows={previewRows}
            totalCount={previewTotalCount}
            onLocate={setSelectedRecordId}
          />
        </div>
      ) : null}
    </div>
  );
}
