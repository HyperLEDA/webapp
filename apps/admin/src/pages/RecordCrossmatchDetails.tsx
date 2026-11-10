import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import classNames from "classnames";
import { MdAdd, MdClose } from "react-icons/md";
import { querySimple } from "@leda/lib/clients/backend";
import type {
  PgcObject,
  Schema as BackendSchema,
} from "@leda/lib/clients/backend";
import { backendClient } from "@leda/lib/clients";
import { getRecords, setCrossmatchResults } from "../clients/admin";
import type {
  Record as ApiRecord,
  RecordSchema,
  StatusesPayload,
} from "../clients/admin";
import { adminClient } from "../clients";
import { isLoggedIn } from "../auth";
import { getResource } from "../resources";
import { publicObjectUrl, adminTableUrl } from "../origins";
import {
  SkyViewer,
  Button,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Link,
  Loading,
} from "@leda/lib/ui";
import {
  Accordion,
  Badge,
  type BadgeType,
  CopyButton,
  ObjectSummary,
} from "../components/ui";
import { useDataFetching } from "@leda/lib/hooks";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";

function createDescription(
  velocity?: { v: number; e_v: number } | null,
  redshift?: { z: number; e_z: number } | null,
): string {
  const parts = [];

  if (velocity) {
    parts.push(`v: ${velocity.v.toFixed(1)} ± ${velocity.e_v.toFixed(1)} km/s`);
  }

  if (redshift) {
    parts.push(`z: ${redshift.z.toFixed(4)} ± ${redshift.e_z.toFixed(4)}`);
  }

  return parts.join(", ");
}

function getCandidateLabel(candidate: PgcObject): string {
  return candidate.catalogs.designation?.name ?? `PGC ${candidate.pgc}`;
}

function convertCandidatesToAdditionalSources(
  candidates: PgcObject[],
  record: ApiRecord,
) {
  const candidateSources = candidates
    .filter((candidate) => candidate.catalogs.coordinates?.equatorial)
    .map((candidate) => ({
      ra: candidate.catalogs.coordinates!.equatorial.ra,
      dec: candidate.catalogs.coordinates!.equatorial.dec,
      label: getCandidateLabel(candidate),
      description: createDescription(
        candidate.catalogs.velocity?.heliocentric,
        candidate.catalogs.redshift,
      ),
    }));

  const icrs = record.catalogs.icrs;
  const mainRecordSource = icrs
    ? {
        ra: icrs.ra,
        dec: icrs.dec,
        label: record.catalogs.designation?.name || `Record ${record.id}`,
      }
    : null;

  return mainRecordSource
    ? [mainRecordSource, ...candidateSources]
    : candidateSources;
}

type ResolutionChoice = "new" | number;

interface ResolutionSelectorProps {
  matchedPgc: number | null;
  markedNew: boolean;
  candidates: PgcObject[];
  schema: BackendSchema;
  showResolveControls: boolean;
  resolving: ResolutionChoice | null;
  addingCandidate: boolean;
  selected: ResolutionChoice | null;
  onSelect: (choice: ResolutionChoice) => void;
  onSubmit: () => void;
  onAddCandidate: (pgc: number) => Promise<void>;
}

function ResolutionSelector({
  matchedPgc,
  markedNew,
  candidates,
  schema,
  showResolveControls,
  resolving,
  addingCandidate,
  selected,
  onSelect,
  onSubmit,
  onAddCandidate,
}: ResolutionSelectorProps): ReactElement {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [pgcInput, setPgcInput] = useState("");
  const [addCandidateError, setAddCandidateError] = useState<string | null>(
    null,
  );
  const busy = resolving !== null || addingCandidate;

  async function submitNewCandidate(): Promise<void> {
    const pgc = Number.parseInt(pgcInput.trim(), 10);
    if (!Number.isFinite(pgc) || pgc <= 0) {
      setAddCandidateError("Enter a valid PGC number");
      return;
    }

    if (candidates.some((candidate) => candidate.pgc === pgc)) {
      setAddCandidateError("This PGC is already a candidate");
      return;
    }

    setAddCandidateError(null);
    try {
      await onAddCandidate(pgc);
    } catch (err) {
      setAddCandidateError(formatCaughtError(err));
    }
  }

  function renderCandidateSummary(candidate: PgcObject): ReactElement {
    const objectLink = publicObjectUrl(candidate.pgc);
    return (
      <ObjectSummary
        catalogs={candidate.catalogs}
        schema={schema}
        layout="columnar"
        name={
          <Link href={objectLink.href} external={objectLink.external}>
            {getCandidateLabel(candidate)}
          </Link>
        }
      />
    );
  }

  if (!showResolveControls) {
    return (
      <div className="space-y-4">
        {candidates.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Candidates</h3>
            {candidates.map((candidate) => (
              <div
                key={candidate.pgc}
                className={classNames(
                  "rounded-lg border px-4 py-2",
                  matchedPgc === candidate.pgc
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface",
                )}
              >
                {renderCandidateSummary(candidate)}
              </div>
            ))}
          </div>
        )}

        {markedNew && (
          <p className="text-sm text-muted">
            {getResource("crossmatch.action.mark_new").Title}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Resolution</h3>
        <label
          className={classNames(
            "block rounded-lg border p-4 cursor-pointer transition-colors",
            selected === "new"
              ? "border-accent bg-accent/15"
              : "border-border bg-surface hover:bg-surface-2",
            busy && "opacity-50 cursor-wait",
          )}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="crossmatch-resolution"
              className="shrink-0"
              checked={selected === "new"}
              disabled={busy}
              onChange={() => onSelect("new")}
            />
            <span className="text-sm font-semibold">
              {getResource("crossmatch.action.mark_new").Title}
            </span>
          </div>
        </label>

        {candidates.map((candidate) => (
          <label
            key={candidate.pgc}
            className={classNames(
              "block rounded-lg border px-4 py-2 cursor-pointer transition-colors",
              selected === candidate.pgc
                ? "border-accent bg-accent/15"
                : "border-border bg-surface hover:bg-surface-2",
              busy && "opacity-50 cursor-wait",
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="crossmatch-resolution"
                className="shrink-0"
                checked={selected === candidate.pgc}
                disabled={busy}
                onChange={() => onSelect(candidate.pgc)}
              />
              <div className="min-w-0 flex-1">
                {renderCandidateSummary(candidate)}
              </div>
            </div>
          </label>
        ))}

        <Button
          type="button"
          disabled={busy}
          className="w-8 h-8 p-0 justify-center"
          onClick={() => {
            setShowAddCandidate((current) => !current);
            setPgcInput("");
            setAddCandidateError(null);
          }}
        >
          {showAddCandidate ? (
            <MdClose className="w-5 h-5" />
          ) : (
            <MdAdd className="w-5 h-5" />
          )}
        </Button>

        {showAddCandidate && (
          <div className="rounded-lg border border-border bg-surface px-4 py-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="PGC number"
              value={pgcInput}
              disabled={busy}
              autoFocus
              onChange={(event) => {
                setPgcInput(event.target.value);
                setAddCandidateError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitNewCandidate();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setShowAddCandidate(false);
                  setPgcInput("");
                  setAddCandidateError(null);
                }
              }}
              className="bg-surface-2 border border-border rounded px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-full"
            />
          </div>
        )}

        {addCandidateError && (
          <p className="text-danger text-sm" role="alert">
            {addCandidateError}
          </p>
        )}

        <Button
          type="button"
          disabled={selected === null || busy}
          onClick={onSubmit}
        >
          {resolving !== null ? "Saving…" : "Save resolution"}
        </Button>
      </div>
    </div>
  );
}

type OriginalColumnValue = string | number | boolean | null;
type OriginalDataFields = Record<string, OriginalColumnValue>;

function OriginalData({ data }: { data: OriginalDataFields }): ReactElement {
  const columns: Column[] = [{ slug: "Column" }, { slug: "Value" }];
  const tableData: Record<string, CellPrimitive>[] = Object.entries(data).map(
    ([key, value]) => ({
      Column: key,
      Value: value === null ? "NULL" : String(value),
    }),
  );

  return <CommonTable columns={columns} data={tableData} />;
}

interface RecordCrossmatchDetailsData {
  record: ApiRecord;
  candidates: PgcObject[];
  schema: BackendSchema;
}

interface RecordCrossmatchDetailsProps {
  data: RecordCrossmatchDetailsData;
}

function RecordCrossmatchDetails({
  data,
}: RecordCrossmatchDetailsProps): ReactElement {
  const [selected, setSelected] = useState<ResolutionChoice | null>(null);
  const [resolving, setResolving] = useState<ResolutionChoice | null>(null);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const { record, candidates, schema } = data;
  const icrs = record.catalogs.icrs;
  const redshift = record.catalogs.redshift;
  const triageStatus = record.crossmatch.triage_status;
  const tableName = record.table_name;
  const assignedPgc = record.pgc;
  const canResolve = assignedPgc === null && isLoggedIn();
  const candidateSources = convertCandidatesToAdditionalSources(
    candidates,
    record,
  );
  const triageBadgeType: BadgeType =
    triageStatus === "resolved" ? "success" : "warning";
  const triageBadgeLabel = getResource(
    triageStatus === "unprocessed"
      ? "crossmatch.status.unprocessed"
      : `crossmatch.triage.verbose.${triageStatus}`,
  ).Title;
  const objectName = record.catalogs.designation?.name ?? `Record ${record.id}`;
  const assignedPgcLink =
    assignedPgc !== null ? publicObjectUrl(assignedPgc) : null;

  async function submitCrossmatchResolution(
    statuses: StatusesPayload,
  ): Promise<void> {
    const response = await setCrossmatchResults({
      client: adminClient,
      body: { statuses },
    });

    if (response.error) {
      throw new Error(describeUnknownError(response.error));
    }

    window.location.reload();
  }

  async function resolveCandidate(pgc: number): Promise<void> {
    setResolveError(null);
    setResolving(pgc);
    try {
      await submitCrossmatchResolution({
        existing: {
          record_ids: [record.id],
          pgcs: [pgc],
          triage_statuses: ["resolved"],
        },
      });
    } catch (err) {
      setResolveError(formatCaughtError(err));
    } finally {
      setResolving(null);
    }
  }

  async function markAsNew(): Promise<void> {
    setResolveError(null);
    setResolving("new");
    try {
      await submitCrossmatchResolution({
        new: {
          record_ids: [record.id],
          triage_statuses: ["resolved"],
        },
      });
    } catch (err) {
      setResolveError(formatCaughtError(err));
    } finally {
      setResolving(null);
    }
  }

  async function addCandidate(pgc: number): Promise<void> {
    setResolveError(null);
    setAddingCandidate(true);
    try {
      const currentPgcs = candidates.map((candidate) => candidate.pgc);
      await submitCrossmatchResolution({
        collided: {
          record_ids: [record.id],
          possible_matches: [[...currentPgcs, pgc]],
          triage_statuses: ["pending"],
        },
      });
    } catch (err) {
      setResolveError(formatCaughtError(err));
      throw err;
    } finally {
      setAddingCandidate(false);
    }
  }

  async function submitResolution(): Promise<void> {
    if (selected === null) return;
    if (selected === "new") {
      await markAsNew();
    } else {
      await resolveCandidate(selected);
    }
  }

  // SAFETY: Crossmatch original data is JSON scalar values keyed by column name.
  const originalDataFields = record.original_data as
    OriginalDataFields | undefined;

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start gap-6">
        {icrs && (
          <SkyViewer
            backend="wwt"
            ra={icrs.ra}
            dec={icrs.dec}
            fov={0.02}
            className="w-96 h-96 shrink-0"
            additionalSources={candidateSources}
          />
        )}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0">{objectName}</span>
              <Badge type={triageBadgeType} className="shrink-0">
                {triageBadgeLabel}
              </Badge>
            </h2>
            <p className="flex items-center gap-2">
              Record ID:{" "}
              <CopyButton textToCopy={record.id}>
                <span className="font-mono">{record.id}</span>
              </CopyButton>
            </p>
            <p>
              Table:{" "}
              <Link
                href={adminTableUrl(tableName).href}
                external={adminTableUrl(tableName).external}
              >
                {tableName}
              </Link>
            </p>
            {assignedPgcLink !== null ? (
              <p>
                PGC:{" "}
                <Link
                  href={assignedPgcLink.href}
                  external={assignedPgcLink.external}
                >
                  {assignedPgc}
                </Link>
              </p>
            ) : (
              <p>
                {candidates.length === 1
                  ? "1 candidate"
                  : `${candidates.length} candidates`}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold mb-3">Object</h3>
            <ObjectSummary
              catalogs={{
                coordinates: icrs
                  ? {
                      equatorial: {
                        ra: icrs.ra,
                        dec: icrs.dec,
                        e_ra: icrs.ra_error,
                        e_dec: icrs.dec_error,
                      },
                    }
                  : null,
                redshift: redshift
                  ? { z: redshift.z, e_z: redshift.z_error }
                  : null,
                nature: record.catalogs.nature,
              }}
              schema={schema}
              name={objectName}
            />
          </div>
        </div>
      </div>

      {assignedPgc === null && (
        <>
          <ResolutionSelector
            matchedPgc={candidates.length === 1 ? candidates[0].pgc : null}
            markedNew={
              triageStatus !== "unprocessed" && candidates.length === 0
            }
            candidates={candidates}
            schema={schema}
            showResolveControls={canResolve}
            resolving={resolving}
            addingCandidate={addingCandidate}
            selected={selected}
            onSelect={setSelected}
            onSubmit={() => void submitResolution()}
            onAddCandidate={addCandidate}
          />

          {resolveError && (
            <p className="text-danger text-sm" role="alert">
              {resolveError}
            </p>
          )}
        </>
      )}

      {originalDataFields && (
        <Accordion title="Original Data">
          <OriginalData data={originalDataFields} />
        </Accordion>
      )}
    </div>
  );
}

function schemaForRecord(recordSchema: RecordSchema): BackendSchema {
  const units = recordSchema.catalogs.icrs.unit;
  return {
    units: {
      coordinates: {
        equatorial: {
          ra: units.ra || "deg",
          dec: units.dec || "deg",
          e_ra: units.ra_error || "deg",
          e_dec: units.dec_error || "deg",
        },
        galactic: {
          lon: "deg",
          lat: "deg",
          e_lon: "arcsec",
          e_lat: "arcsec",
        },
        supergalactic: {
          lon: "deg",
          lat: "deg",
          e_lon: "arcsec",
          e_lat: "arcsec",
        },
      },
      velocity: {
        heliocentric: { v: "km/s", e_v: "km/s" },
      },
    },
  };
}

async function fetcher(
  recordId: string | undefined,
): Promise<RecordCrossmatchDetailsData> {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const response = await getRecords({
    client: adminClient,
    query: {
      record_id: recordId,
      page: 0,
      page_size: 1,
    },
  });

  if (response.error) {
    throw new Error(
      `Error fetching crossmatch details: ${describeUnknownError(response.error) || "Unknown error"}`,
    );
  }

  const records = response.data.data.records;
  if (records.length === 0) {
    throw new Error(`Record ${recordId} was not found`);
  }
  const record = records[0];

  const candidatePgcs = record.crossmatch.candidates.map(
    (candidate) => candidate.pgc,
  );
  let candidates: PgcObject[] = [];
  let schema = schemaForRecord(response.data.data.schema);

  if (candidatePgcs.length > 0) {
    const objects = await querySimple({
      client: backendClient,
      query: {
        pgcs: candidatePgcs,
        page: 0,
        page_size: candidatePgcs.length,
      },
    });
    if (objects.error) {
      throw new Error(
        `Error fetching candidate objects: ${describeUnknownError(objects.error) || "Unknown error"}`,
      );
    }
    schema = objects.data.data.schema;
    const byPgc = new Map(
      objects.data.data.objects.map((object) => [object.pgc, object]),
    );
    candidates = candidatePgcs.map(
      (pgc) => byPgc.get(pgc) ?? { pgc, catalogs: {} },
    );
  }

  return { record, candidates, schema };
}

export function RecordCrossmatchDetailsPage(): ReactElement {
  const { recordId } = useParams<{ recordId: string }>();

  const { data, loading, error } = useDataFetching(
    () => fetcher(recordId),
    [recordId],
  );

  useEffect(() => {
    document.title = `Crossmatch - ${data?.record.catalogs.designation?.name ?? recordId} | LEDA`;
  }, [data, recordId]);

  if (loading) return <Loading />;
  if (error) return <ErrorPage message={error} />;
  if (data) return <RecordCrossmatchDetails data={data} />;

  return <ErrorPage message="Unknown error" />;
}
