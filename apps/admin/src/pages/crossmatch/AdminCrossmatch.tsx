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

const DEFAULT_RADIUS = 30;
const DEFAULT_LIMIT = 20;
const DEFAULT_BATCH_SIZE = 1000;
const TABLE_SEARCH_PAGE_SIZE = 20;

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
  const [tableName, setTableName] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [pgcColumn, setPgcColumn] = useState("");
  const [redshiftTolerance, setRedshiftTolerance] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [printPending, setPrintPending] = useState(false);
  const [write, setWrite] = useState(true);
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

  useEffect(() => {
    document.title = "Crossmatch | LEDA";
  }, []);

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
          limit,
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
      window.location.assign(`${sameEnvTasksOrigin()}/runs/flow-run/${taskId}`);
    } catch (err) {
      setError(formatCaughtError(err));
      setSubmitting(false);
    }
  }

  const busy = submitting || previewing;

  return (
    <div className="w-full">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold mb-2">Crossmatch</h2>
        <p className="text-sm text-muted mb-6">
          Cross-identify records in a layer 0 table against layer 2 objects.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label htmlFor="limit" className="block mb-1 text-subtle">
              Preview limit
            </label>
            <input
              id="limit"
              type="number"
              min={1}
              max={200}
              required
              value={limit}
              disabled={busy}
              onChange={(event) => {
                setLimit(Number(event.target.value) || DEFAULT_LIMIT);
                setError(null);
              }}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            />
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
      </div>

      {previewRows && previewTotalCount !== null ? (
        <div ref={previewRef}>
          <CrossmatchPreview
            rows={previewRows}
            totalCount={previewTotalCount}
          />
        </div>
      ) : null}
    </div>
  );
}
