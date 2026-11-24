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
  previewSubmitCrossmatch,
  startSubmitCrossmatch,
  type PreviewSubmitCrossmatchRow,
} from "../../clients/admin";
import { adminClient } from "../../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { Button, Loading, Text } from "@leda/lib/ui";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import {
  Form,
  FormField,
  FormTableSearchField,
  clearFormDraft,
  readFormDraft,
  useFormBusy,
} from "../../components/form";
import { SubmitCrossmatchPreview } from "./SubmitCrossmatchPreview";

const DEFAULT_BATCH_SIZE = 5000;
const DRAFT_STORAGE_KEY = "leda.admin.submit-crossmatch.draft";
const SUBMIT_PARAMETERS = [
  "coordinates",
  "name",
  "pgc",
  "redshift",
  "nature",
] as const;
const DEFAULT_REQUIRED_PARAMETERS: SubmitParameter[] = [];

type SubmitParameter = (typeof SUBMIT_PARAMETERS)[number];

interface SubmitCrossmatchDraft {
  tableName: string;
  rowFilter: string;
  includeNew: boolean;
  includeExisting: boolean;
  requireParameters: SubmitParameter[];
  batchSize: number;
}

function normalizeRequireParameters(
  draft: Partial<SubmitCrossmatchDraft>,
): SubmitParameter[] {
  if (!("requireParameters" in draft)) {
    return [...DEFAULT_REQUIRED_PARAMETERS];
  }
  const value = draft.requireParameters;
  if (!Array.isArray(value)) {
    return [...DEFAULT_REQUIRED_PARAMETERS];
  }
  return SUBMIT_PARAMETERS.filter((name) => value.includes(name));
}

function normalizeDraft(
  draft: Partial<SubmitCrossmatchDraft> | null,
): SubmitCrossmatchDraft | null {
  if (draft === null) {
    return null;
  }
  return {
    tableName: String(draft.tableName || ""),
    rowFilter: String(draft.rowFilter || ""),
    includeNew: draft.includeNew !== false,
    includeExisting: draft.includeExisting !== false,
    requireParameters: normalizeRequireParameters(draft),
    batchSize: Number.isFinite(draft.batchSize)
      ? Number(draft.batchSize)
      : DEFAULT_BATCH_SIZE,
  };
}

function isDefaultRequired(value: SubmitParameter[]): boolean {
  return (
    value.length === DEFAULT_REQUIRED_PARAMETERS.length &&
    DEFAULT_REQUIRED_PARAMETERS.every((name) => value.includes(name))
  );
}

function isEmptyDraft(draft: SubmitCrossmatchDraft): boolean {
  return (
    !draft.tableName.trim() &&
    !draft.rowFilter.trim() &&
    draft.includeNew &&
    draft.includeExisting &&
    isDefaultRequired(draft.requireParameters) &&
    draft.batchSize === DEFAULT_BATCH_SIZE
  );
}

function selectedParameters(
  requireParameters: SubmitParameter[],
): SubmitParameter[] {
  return SUBMIT_PARAMETERS.filter((name) => requireParameters.includes(name));
}

function RequireParameterFields({
  requireParameters,
  onToggle,
}: {
  requireParameters: SubmitParameter[];
  onToggle: (name: SubmitParameter, checked: boolean) => void;
}): ReactElement {
  const busy = useFormBusy();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {SUBMIT_PARAMETERS.map((name) => (
        <label
          key={name}
          className="inline-flex items-center gap-2 text-subtle"
        >
          <input
            type="checkbox"
            checked={requireParameters.includes(name)}
            disabled={busy}
            onChange={(event) => {
              onToggle(name, event.target.checked);
            }}
            className="rounded border-border"
          />
          {name}
        </label>
      ))}
    </div>
  );
}

export function AdminSubmitCrossmatchPage(): ReactElement {
  const [initialDraft] = useState(() =>
    normalizeDraft(
      readFormDraft<Partial<SubmitCrossmatchDraft>>(DRAFT_STORAGE_KEY),
    ),
  );
  const [tableName, setTableName] = useState(initialDraft?.tableName ?? "");
  const [rowFilter, setRowFilter] = useState(initialDraft?.rowFilter ?? "");
  const [includeNew, setIncludeNew] = useState(
    initialDraft?.includeNew ?? true,
  );
  const [includeExisting, setIncludeExisting] = useState(
    initialDraft?.includeExisting ?? true,
  );
  const [requireParameters, setRequireParameters] = useState<SubmitParameter[]>(
    initialDraft?.requireParameters ?? [...DEFAULT_REQUIRED_PARAMETERS],
  );
  const [batchSize, setBatchSize] = useState(
    initialDraft?.batchSize ?? DEFAULT_BATCH_SIZE,
  );
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSampleCount, setPreviewSampleCount] = useState<number | null>(
    null,
  );
  const [previewNewCount, setPreviewNewCount] = useState<number | null>(null);
  const [previewExistingCount, setPreviewExistingCount] = useState<
    number | null
  >(null);
  const [previewEligiblePercent, setPreviewEligiblePercent] = useState<
    number | null
  >(null);
  const [previewRows, setPreviewRows] = useState<
    PreviewSubmitCrossmatchRow[] | null
  >(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Submit crossmatch results | LEDA";
  }, []);

  function clearPreview(): void {
    setPreviewSampleCount(null);
    setPreviewNewCount(null);
    setPreviewExistingCount(null);
    setPreviewEligiblePercent(null);
    setPreviewRows(null);
  }

  function validateForm(): string | null {
    if (!tableName.trim()) {
      return "Table name is required.";
    }
    if (!includeNew && !includeExisting) {
      return "Select at least one outcome.";
    }
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
      return "Batch size must be an integer between 1 and 10000.";
    }
    return null;
  }

  function selectionBody() {
    return {
      table_name: tableName.trim(),
      row_filter: rowFilter.trim(),
      include_new: includeNew,
      include_existing: includeExisting,
      require_parameters: includeExisting
        ? selectedParameters(requireParameters)
        : [],
    };
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
      const response = await previewSubmitCrossmatch({
        client: adminClient,
        body: {
          ...selectionBody(),
          sample_size: batchSize,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const data = response.data.data;
      setPreviewSampleCount(data.sample_count);
      setPreviewNewCount(data.new_count);
      setPreviewExistingCount(data.existing_count);
      setPreviewEligiblePercent(data.eligible_percent);
      setPreviewRows(data.rows);
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
      const response = await startSubmitCrossmatch({
        client: adminClient,
        body: {
          params: {
            ...selectionBody(),
            batch_size: batchSize,
          },
          action_description: `submit crossmatch ${tableName.trim()} batch=${batchSize}`,
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
  const draftValue: SubmitCrossmatchDraft = {
    tableName,
    rowFilter,
    includeNew,
    includeExisting,
    requireParameters,
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
      key="includeNew"
      kind="checkbox"
      id="include_new"
      label="New objects"
      checked={includeNew}
      onChange={(next) => {
        setIncludeNew(next);
        setError(null);
      }}
    />,
    <FormField
      key="includeExisting"
      kind="checkbox"
      id="include_existing"
      label="Existing matches"
      checked={includeExisting}
      onChange={(next) => {
        setIncludeExisting(next);
        setError(null);
      }}
    />,
    includeExisting ? (
      <FormField
        key="requireParameters"
        kind="custom"
        label="For matches on existing objects, require at least all of these parameters to match:"
      >
        <RequireParameterFields
          requireParameters={requireParameters}
          onToggle={(name, checked) => {
            setRequireParameters((current) =>
              checked
                ? selectedParameters(
                    current.includes(name) ? current : [...current, name],
                  )
                : current.filter((item) => item !== name),
            );
            setError(null);
          }}
        />
      </FormField>
    ) : null,
    <FormField
      key="batchSize"
      kind="number"
      id="batch_size"
      label="Batch size"
      value={batchSize}
      min={1}
      max={10_000}
      required
      hint="How many records are submitted at once"
      onChange={(next) => {
        setBatchSize(Number(next) || DEFAULT_BATCH_SIZE);
        setError(null);
      }}
    />,
  ];

  return (
    <>
      <Text as="h2" style="header" size="medium" className="mb-6">
        Submit crossmatch results
      </Text>
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
                  Preview
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
        isEmptyDraft={isEmptyDraft}
      />
      {previewRows &&
      previewSampleCount !== null &&
      previewNewCount !== null &&
      previewExistingCount !== null &&
      previewEligiblePercent !== null ? (
        <div ref={previewRef}>
          <SubmitCrossmatchPreview
            sampleCount={previewSampleCount}
            newCount={previewNewCount}
            existingCount={previewExistingCount}
            eligiblePercent={previewEligiblePercent}
            hasRowFilter={Boolean(rowFilter.trim())}
            rows={previewRows}
          />
        </div>
      ) : null}
    </>
  );
}
