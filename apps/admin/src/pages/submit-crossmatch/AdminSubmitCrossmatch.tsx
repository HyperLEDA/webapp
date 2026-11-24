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
  type StartSubmitCrossmatchRequest,
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
import { SubmitCrossmatchPreview } from "./SubmitCrossmatchPreview";

const DEFAULT_BATCH_SIZE = 1000;
const PREVIEW_SAMPLE_LIMIT = 200;
const DRAFT_STORAGE_KEY = "leda.admin.submit-crossmatch.draft";

interface SubmitCrossmatchDraft {
  tableName: string;
  batchSize: number;
}

function normalizeDraft(
  draft: Partial<SubmitCrossmatchDraft> | null,
): SubmitCrossmatchDraft | null {
  if (draft === null) {
    return null;
  }
  return {
    tableName: String(draft.tableName || ""),
    batchSize: Number.isFinite(draft.batchSize)
      ? Number(draft.batchSize)
      : DEFAULT_BATCH_SIZE,
  };
}

function isEmptyDraft(draft: SubmitCrossmatchDraft): boolean {
  return !draft.tableName.trim() && draft.batchSize === DEFAULT_BATCH_SIZE;
}

function buildStartParams(
  tableName: string,
  batchSize: number,
): StartSubmitCrossmatchRequest["params"] {
  return {
    table_name: tableName.trim(),
    batch_size: batchSize,
  };
}

export function AdminSubmitCrossmatchPage(): ReactElement {
  const [initialDraft] = useState(() =>
    normalizeDraft(
      readFormDraft<Partial<SubmitCrossmatchDraft>>(DRAFT_STORAGE_KEY),
    ),
  );
  const [tableName, setTableName] = useState(initialDraft?.tableName ?? "");
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
  const [previewNewCount, setPreviewNewCount] = useState<number | null>(null);
  const [previewExistingCount, setPreviewExistingCount] = useState<
    number | null
  >(null);
  const [previewRows, setPreviewRows] = useState<
    PreviewSubmitCrossmatchRow[] | null
  >(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Submit crossmatch | LEDA";
  }, []);

  function clearPreview(): void {
    setPreviewTotalCount(null);
    setPreviewEligibleCount(null);
    setPreviewNewCount(null);
    setPreviewExistingCount(null);
    setPreviewRows(null);
  }

  function validateForm(): string | null {
    if (!tableName.trim()) {
      return "Table name is required.";
    }
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
      return "Batch size must be an integer between 1 and 10000.";
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
      const response = await previewSubmitCrossmatch({
        client: adminClient,
        body: {
          table_name: tableName.trim(),
          sample_size: Math.min(batchSize, PREVIEW_SAMPLE_LIMIT),
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const data = response.data.data;
      setPreviewTotalCount(data.total_count);
      setPreviewEligibleCount(data.eligible_count);
      setPreviewNewCount(data.new_count);
      setPreviewExistingCount(data.existing_count);
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
          params: buildStartParams(tableName, batchSize),
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
  const draftValue: SubmitCrossmatchDraft = { tableName, batchSize };
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
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6">Submit crossmatch</h2>
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
      {previewTotalCount !== null &&
      previewEligibleCount !== null &&
      previewNewCount !== null &&
      previewExistingCount !== null &&
      previewRows ? (
        <div ref={previewRef}>
          <SubmitCrossmatchPreview
            totalCount={previewTotalCount}
            eligibleCount={previewEligibleCount}
            newCount={previewNewCount}
            existingCount={previewExistingCount}
            rows={previewRows}
          />
        </div>
      ) : null}
    </div>
  );
}
