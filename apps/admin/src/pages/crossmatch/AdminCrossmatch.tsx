import { FormEvent, ReactElement, useEffect, useRef, useState } from "react";
import { MdPlayArrow, MdVisibility } from "react-icons/md";
import {
  getTableList,
  previewCrossmatch,
  startCrossmatch,
  type PreviewCrossmatchStat,
  type StartCrossmatchRequest,
} from "../../clients/admin";
import { adminClient } from "../../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import { Button, Loading } from "@leda/lib/ui";
import { FieldInput } from "../../components/ui";
import { CrossmatchPreview } from "./CrossmatchPreview";
import {
  CrossmatchSkyPanel,
  useCrossmatchSkySelection,
} from "./CrossmatchSkyPanel";
import type { PreviewSkyRow } from "./outcome";

const DEFAULT_RADIUS = 30;
const DEFAULT_BATCH_SIZE = 1000;
const TABLE_SEARCH_PAGE_SIZE = 20;
const DRAFT_STORAGE_KEY = "leda.admin.crossmatch.draft";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface CrossmatchDraft {
  savedAt: number;
  tableName: string;
  includePgc: boolean;
  includeRedshift: boolean;
  includeNature: boolean;
  radius: number;
  pgcColumn: string;
  redshiftTolerance: number;
  rowFilter: string;
  batchSize: number;
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
      includePgc: draft.includePgc === true,
      includeRedshift: draft.includeRedshift === true,
      includeNature: draft.includeNature === true,
      radius: Number.isFinite(draft.radius)
        ? Number(draft.radius)
        : DEFAULT_RADIUS,
      pgcColumn: String(draft.pgcColumn || ""),
      redshiftTolerance: Number.isFinite(draft.redshiftTolerance)
        ? Number(draft.redshiftTolerance)
        : 0,
      rowFilter: String(draft.rowFilter || ""),
      batchSize: Number.isFinite(draft.batchSize)
        ? Number(draft.batchSize)
        : DEFAULT_BATCH_SIZE,
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
    !draft.includePgc &&
    !draft.includeRedshift &&
    !draft.includeNature &&
    draft.radius === DEFAULT_RADIUS &&
    !draft.pgcColumn.trim() &&
    draft.redshiftTolerance === 0 &&
    !draft.rowFilter.trim() &&
    draft.batchSize === DEFAULT_BATCH_SIZE
  );
}

function parseDecimalInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "" || normalized === ".") {
    return 0;
  }
  if (!/^\d*\.?\d*$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
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
  includePgc: boolean,
  includeRedshift: boolean,
  includeNature: boolean,
  radius: number,
  pgcColumn: string,
  redshiftTolerance: number,
  rowFilter: string,
  batchSize: number,
): StartCrossmatchRequest["params"] {
  return {
    table_name: tableName.trim(),
    include_redshift: includeRedshift,
    include_nature: includeNature,
    radius_arcsec: radius,
    pgc_column: includePgc ? pgcColumn.trim() : "",
    redshift_tolerance: includeRedshift ? redshiftTolerance : 0,
    row_filter: rowFilter.trim(),
    batch_size: batchSize,
  };
}

export function AdminCrossmatchPage(): ReactElement {
  const [initialDraft] = useState(() => readDraft());
  const [tableName, setTableName] = useState(initialDraft?.tableName ?? "");
  const [includePgc, setIncludePgc] = useState(
    initialDraft?.includePgc ?? false,
  );
  const [includeRedshift, setIncludeRedshift] = useState(
    initialDraft?.includeRedshift ?? false,
  );
  const [includeNature, setIncludeNature] = useState(
    initialDraft?.includeNature ?? false,
  );
  const [radius, setRadius] = useState(initialDraft?.radius ?? DEFAULT_RADIUS);
  const [pgcColumn, setPgcColumn] = useState(initialDraft?.pgcColumn ?? "");
  const [redshiftToleranceInput, setRedshiftToleranceInput] = useState(
    String(initialDraft?.redshiftTolerance ?? 0),
  );
  const redshiftTolerance = parseDecimalInput(redshiftToleranceInput) ?? 0;
  const [rowFilter, setRowFilter] = useState(initialDraft?.rowFilter ?? "");
  const [batchSize, setBatchSize] = useState(
    initialDraft?.batchSize ?? DEFAULT_BATCH_SIZE,
  );
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTotalCount, setPreviewTotalCount] = useState<number | null>(
    null,
  );
  const [previewEligibleCount, setPreviewEligibleCount] = useState<
    number | null
  >(null);
  const [previewSampleCount, setPreviewSampleCount] = useState<number | null>(
    null,
  );
  const [previewStatistics, setPreviewStatistics] = useState<
    PreviewCrossmatchStat[] | null
  >(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewRows: PreviewSkyRow[] | null = previewStatistics
    ? previewStatistics.flatMap((stat) =>
        stat.rows.map((row) => ({
          ...row,
          status: stat.status,
          triage: stat.triage,
        })),
      )
    : null;
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
      includePgc,
      includeRedshift,
      includeNature,
      radius,
      pgcColumn,
      redshiftTolerance,
      rowFilter,
      batchSize,
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
    includePgc,
    includeRedshift,
    includeNature,
    radius,
    pgcColumn,
    redshiftTolerance,
    rowFilter,
    batchSize,
  ]);

  function clearPreview(): void {
    setPreviewTotalCount(null);
    setPreviewEligibleCount(null);
    setPreviewSampleCount(null);
    setPreviewStatistics(null);
  }

  function validateForm(): string | null {
    if (!tableName.trim()) {
      return "Table name is required.";
    }
    if (!(radius > 0)) {
      return "Radius must be greater than 0.";
    }
    if (includePgc && !pgcColumn.trim()) {
      return "PGC column is required when using PGC information.";
    }
    if (includeRedshift && !(redshiftTolerance > 0)) {
      return "Redshift tolerance must be greater than 0 when using redshift information.";
    }
    return null;
  }

  async function handlePreview(): Promise<void> {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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
          include_redshift: includeRedshift,
          include_nature: includeNature,
          radius_arcsec: radius,
          pgc_column: includePgc ? pgcColumn.trim() : "",
          redshift_tolerance: includeRedshift ? redshiftTolerance : 0,
          row_filter: rowFilter.trim() || null,
          sample_size: batchSize,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const data = response.data.data;
      setPreviewTotalCount(data.total_count);
      setPreviewEligibleCount(data.eligible_count);
      setPreviewSampleCount(data.sample_count);
      setPreviewStatistics(data.statistics);
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
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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
            includePgc,
            includeRedshift,
            includeNature,
            radius,
            pgcColumn,
            redshiftTolerance,
            rowFilter,
            batchSize,
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
              disabled={busy}
              placeholder="mag < 15 AND survey = 'SDSS'"
              onChange={(event) => {
                setRowFilter(event.target.value);
                setError(null);
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
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
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="include_pgc"
              type="checkbox"
              checked={includePgc}
              disabled={busy}
              onChange={(event) => {
                setIncludePgc(event.target.checked);
                setError(null);
              }}
              className="rounded border-border"
            />
            <label htmlFor="include_pgc" className="text-subtle">
              Use PGC information
            </label>
          </div>

          {includePgc ? (
            <div>
              <label htmlFor="pgc_column" className="block mb-1 text-subtle">
                PGC column
              </label>
              <input
                id="pgc_column"
                type="text"
                value={pgcColumn}
                disabled={busy}
                required
                placeholder="Raw-table PGC column"
                onChange={(event) => {
                  setPgcColumn(event.target.value);
                  setError(null);
                }}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="include_redshift"
              type="checkbox"
              checked={includeRedshift}
              disabled={busy}
              onChange={(event) => {
                setIncludeRedshift(event.target.checked);
                setError(null);
              }}
              className="rounded border-border"
            />
            <label htmlFor="include_redshift" className="text-subtle">
              Use redshift information
            </label>
          </div>

          {includeRedshift ? (
            <div>
              <label
                htmlFor="redshift_tolerance"
                className="block mb-1 text-subtle"
              >
                Redshift tolerance
              </label>
              <input
                id="redshift_tolerance"
                type="text"
                inputMode="decimal"
                lang="en"
                value={redshiftToleranceInput}
                disabled={busy}
                required
                onChange={(event) => {
                  const next = event.target.value.replace(",", ".");
                  if (parseDecimalInput(next) === null) {
                    return;
                  }
                  setRedshiftToleranceInput(next);
                  setError(null);
                }}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
              />
              <p className="text-xs text-muted mt-1">
                Absolute Δz. How much a record&apos;s redshift can deviate from
                the PGC before it is not considered a match.
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="include_nature"
              type="checkbox"
              checked={includeNature}
              disabled={busy}
              onChange={(event) => {
                setIncludeNature(event.target.checked);
                setError(null);
              }}
              className="rounded border-border"
            />
            <label htmlFor="include_nature" className="text-subtle">
              Use nature information
            </label>
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
            <p className="text-xs text-muted mt-1">
              How many records are loaded in memory at once
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={busy || !tableName.trim()}
              onClick={() => void handlePreview()}
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
            <Button type="submit" disabled={busy || !tableName.trim()}>
              {submitting ? (
                "Starting…"
              ) : (
                <>
                  <MdPlayArrow className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
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

      {previewTotalCount !== null &&
      previewEligibleCount !== null &&
      previewSampleCount !== null &&
      previewStatistics ? (
        <div ref={previewRef}>
          <CrossmatchPreview
            totalCount={previewTotalCount}
            eligibleCount={previewEligibleCount}
            sampleCount={previewSampleCount}
            statistics={previewStatistics}
            onLocate={setSelectedRecordId}
          />
        </div>
      ) : null}
    </div>
  );
}
