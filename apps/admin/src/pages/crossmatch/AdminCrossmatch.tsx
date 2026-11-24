import {
  ReactElement,
  ReactNode,
  SubmitEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { MdPlayArrow, MdVisibility } from "react-icons/md";
import {
  previewCrossmatch,
  startCrossmatch,
  type PreviewCrossmatchStat,
  type StartCrossmatchRequest,
} from "../../clients/admin";
import { adminClient } from "../../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { Button, Loading } from "@leda/lib/ui";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import {
  Form,
  FormField,
  FormTableSearchField,
  clearFormDraft,
  readFormDraft,
} from "../../components/form";
import { CrossmatchPreview } from "./CrossmatchPreview";
import {
  CrossmatchSkyPanel,
  useCrossmatchSkySelection,
} from "./CrossmatchSkyPanel";
import type { PreviewSkyRow } from "./outcome";

const DEFAULT_RADIUS = 30;
const DEFAULT_BATCH_SIZE = 1000;
const DRAFT_STORAGE_KEY = "leda.admin.crossmatch.draft";

interface CrossmatchDraft {
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

function normalizeCrossmatchDraft(
  draft: Partial<CrossmatchDraft> | null,
): CrossmatchDraft | null {
  if (draft === null) {
    return null;
  }
  return {
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
}

function isEmptyCrossmatchDraft(draft: CrossmatchDraft): boolean {
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
  const [initialDraft] = useState(() =>
    normalizeCrossmatchDraft(
      readFormDraft<Partial<CrossmatchDraft>>(DRAFT_STORAGE_KEY),
    ),
  );
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
    event: SubmitEvent<HTMLFormElement>,
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
      clearFormDraft(DRAFT_STORAGE_KEY);
      window.location.assign(
        `${sameEnvTasksOrigin()}/v2/runs/flow-run/${taskId}`,
      );
    } catch (err) {
      setError(formatCaughtError(err));
      setSubmitting(false);
    }
  }

  const busy = submitting || previewing;
  const draftValue: CrossmatchDraft = {
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
  const fields: ReactNode[] = [
    <FormTableSearchField
      key="tableName"
      label="Table name"
      value={tableName}
      onChange={(next) => {
        setTableName(next);
        setError(null);
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
        setError(null);
      }}
    />,
    <FormField
      key="radius"
      kind="number"
      id="radius"
      label="Search radius (arcsec)"
      value={radius}
      min={0.001}
      step="any"
      required
      onChange={(next) => {
        setRadius(Number(next) || 0);
        setError(null);
      }}
    />,
    <FormField
      key="includePgc"
      kind="checkbox"
      id="include_pgc"
      label="Use PGC information"
      checked={includePgc}
      onChange={(next) => {
        setIncludePgc(next);
        setError(null);
      }}
    />,
    includePgc ? (
      <FormField
        key="pgcColumn"
        kind="text"
        id="pgc_column"
        label="PGC column"
        value={pgcColumn}
        required
        placeholder="Raw-table PGC column"
        onChange={(next) => {
          setPgcColumn(next);
          setError(null);
        }}
      />
    ) : null,
    <FormField
      key="includeRedshift"
      kind="checkbox"
      id="include_redshift"
      label="Use redshift information"
      checked={includeRedshift}
      onChange={(next) => {
        setIncludeRedshift(next);
        setError(null);
      }}
    />,
    includeRedshift ? (
      <FormField
        key="redshiftTolerance"
        kind="text"
        id="redshift_tolerance"
        label="Redshift tolerance"
        value={redshiftToleranceInput}
        required
        inputMode="decimal"
        lang="en"
        hint="Absolute Δz. How much a record's redshift can deviate from the PGC before it is not considered a match."
        onChange={(next) => {
          const normalized = next.replace(",", ".");
          if (parseDecimalInput(normalized) === null) {
            return;
          }
          setRedshiftToleranceInput(normalized);
          setError(null);
        }}
      />
    ) : null,
    <FormField
      key="includeNature"
      kind="checkbox"
      id="include_nature"
      label="Use nature information"
      checked={includeNature}
      onChange={(next) => {
        setIncludeNature(next);
        setError(null);
      }}
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
      hint="How many records are loaded in memory at once"
      onChange={(next) => {
        setBatchSize(Number(next) || DEFAULT_BATCH_SIZE);
        setError(null);
      }}
    />,
  ];

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6">Crossmatch</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
        <Form
          fields={fields}
          actions={
            <>
              <Button
                type="button"
                disabled={busy || !tableName.trim()}
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
            </>
          }
          busy={busy}
          error={error}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          draftKey={DRAFT_STORAGE_KEY}
          draftValue={draftValue}
          isEmptyDraft={isEmptyCrossmatchDraft}
        />

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
