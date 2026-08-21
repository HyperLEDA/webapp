import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import classNames from "classnames";
import { MdAdd, MdClose } from "react-icons/md";
import {
  getRecordCrossmatch,
  setCrossmatchResults,
  GetRecordCrossmatchResponse,
  RecordCrossmatch,
  PgcCandidate,
  Schema as AdminSchema,
  StatusesPayload,
} from "../clients/admin";
import { Schema as BackendSchema } from "@hyperleda/lib/clients/backend";
import { adminClient } from "../clients";
import { isLoggedIn } from "../auth";
import { getResource } from "../resources";
import { publicObjectUrl, adminTableUrl } from "../origins";
import {
  AladinViewer,
  Button,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Link,
  Loading,
} from "@hyperleda/lib/ui";
import {
  Accordion,
  Badge,
  type BadgeType,
  CopyButton,
  ObjectSummary,
} from "../components/ui";
import { useDataFetching } from "@hyperleda/lib/hooks";
import { describeUnknownError } from "@hyperleda/lib/tap";

function convertAdminSchemaToBackendSchema(
  adminSchema: AdminSchema,
): BackendSchema {
  function getCoordinateUnit(type: string, param: string): string {
    return adminSchema.units.coordinates?.[type]?.[param] || "deg";
  }

  function getVelocityUnit(type: string, param: string): string {
    return adminSchema.units.velocity?.[type]?.[param] || "km/s";
  }

  return {
    units: {
      coordinates: {
        equatorial: {
          ra: getCoordinateUnit("equatorial", "ra"),
          dec: getCoordinateUnit("equatorial", "dec"),
          e_ra: getCoordinateUnit("equatorial", "e_ra"),
          e_dec: getCoordinateUnit("equatorial", "e_dec"),
        },
        galactic: {
          lon: getCoordinateUnit("galactic", "lon"),
          lat: getCoordinateUnit("galactic", "lat"),
          e_lon: getCoordinateUnit("galactic", "e_lon"),
          e_lat: getCoordinateUnit("galactic", "e_lat"),
        },
        supergalactic: {
          lon: getCoordinateUnit("supergalactic", "lon"),
          lat: getCoordinateUnit("supergalactic", "lat"),
          e_lon: getCoordinateUnit("supergalactic", "e_lon"),
          e_lat: getCoordinateUnit("supergalactic", "e_lat"),
        },
      },
      velocity: {
        heliocentric: {
          v: getVelocityUnit("heliocentric", "v"),
          e_v: getVelocityUnit("heliocentric", "e_v"),
        },
        local_group: {
          v: getVelocityUnit("local_group", "v"),
          e_v: getVelocityUnit("local_group", "e_v"),
        },
        cmb_old: {
          v: getVelocityUnit("cmb_old", "v"),
          e_v: getVelocityUnit("cmb_old", "e_v"),
        },
        cmb: {
          v: getVelocityUnit("cmb", "v"),
          e_v: getVelocityUnit("cmb", "e_v"),
        },
      },
    },
  };
}

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

function getCandidateLabel(candidate: PgcCandidate): string {
  return candidate.catalogs?.designation?.name ?? `PGC ${candidate.pgc}`;
}

function convertCandidatesToAdditionalSources(
  candidates: PgcCandidate[],
  mainRecord: RecordCrossmatch,
) {
  const candidateSources = candidates
    .filter((candidate) => candidate.catalogs?.coordinates?.equatorial)
    .map((candidate) => ({
      ra: candidate.catalogs!.coordinates!.equatorial.ra,
      dec: candidate.catalogs!.coordinates!.equatorial.dec,
      label: getCandidateLabel(candidate),
      description: createDescription(
        candidate.catalogs?.velocity?.heliocentric,
        candidate.catalogs?.redshift,
      ),
    }));

  const mainRecordSource = mainRecord.catalogs?.coordinates?.equatorial
    ? {
        ra: mainRecord.catalogs.coordinates.equatorial.ra,
        dec: mainRecord.catalogs.coordinates.equatorial.dec,
        label:
          mainRecord.catalogs?.designation?.name ||
          `Record ${mainRecord.record_id}`,
      }
    : null;

  return mainRecordSource
    ? [mainRecordSource, ...candidateSources]
    : candidateSources;
}

type ResolutionChoice = "new" | number;

interface ResolutionSelectorProps {
  crossmatch: RecordCrossmatch;
  candidates: PgcCandidate[];
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
  crossmatch,
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
  const matchedPgc =
    crossmatch.status === "existing" ? crossmatch.metadata.pgc : null;

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
      setAddCandidateError(`${err}`);
    }
  }

  function renderCandidateSummary(candidate: PgcCandidate): ReactElement {
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

        {crossmatch.status === "new" && (
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
  const columns: Column[] = [{ name: "Column" }, { name: "Value" }];
  const tableData: Record<string, CellPrimitive>[] = Object.entries(data).map(
    ([key, value]) => ({
      Column: key,
      Value: value === null || value === undefined ? "NULL" : String(value),
    }),
  );

  return <CommonTable columns={columns} data={tableData} />;
}

interface RecordCrossmatchDetailsProps {
  data: GetRecordCrossmatchResponse;
}

function RecordCrossmatchDetails({
  data,
}: RecordCrossmatchDetailsProps): ReactElement {
  const [selected, setSelected] = useState<ResolutionChoice | null>(null);
  const [resolving, setResolving] = useState<ResolutionChoice | null>(null);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const {
    crossmatch,
    candidates,
    schema,
    table_name: tableName,
    original_data: originalData,
  } = data;
  const showResolveControls = isLoggedIn();
  const backendSchema = convertAdminSchemaToBackendSchema(schema);
  const candidateSources = convertCandidatesToAdditionalSources(
    candidates,
    crossmatch,
  );
  const triageBadgeType: BadgeType =
    crossmatch.triage_status === "resolved" ? "success" : "warning";
  const triageBadgeLabel = getResource(
    `crossmatch.triage.verbose.${crossmatch.triage_status}`,
  ).Title;
  const objectName =
    crossmatch.catalogs?.designation?.name ?? `Record ${crossmatch.record_id}`;

  async function submitCrossmatchResolution(
    statuses: StatusesPayload,
  ): Promise<void> {
    const response = await setCrossmatchResults({
      client: adminClient,
      body: { statuses },
    });

    if (response.error || !response.data?.data) {
      throw new Error(
        describeUnknownError(response.error) ||
          String(response.error || "Unknown error"),
      );
    }

    window.location.reload();
  }

  async function resolveCandidate(pgc: number): Promise<void> {
    setResolveError(null);
    setResolving(pgc);
    try {
      await submitCrossmatchResolution({
        existing: {
          record_ids: [crossmatch.record_id],
          pgcs: [pgc],
          triage_statuses: ["resolved"],
        },
      });
    } catch (err) {
      setResolveError(`${err}`);
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
          record_ids: [crossmatch.record_id],
          triage_statuses: ["resolved"],
        },
      });
    } catch (err) {
      setResolveError(`${err}`);
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
          record_ids: [crossmatch.record_id],
          possible_matches: [[...currentPgcs, pgc]],
          triage_statuses: ["pending"],
        },
      });
    } catch (err) {
      setResolveError(`${err}`);
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
  const originalDataFields = originalData as OriginalDataFields | undefined;

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start gap-6">
        {crossmatch.catalogs?.coordinates?.equatorial && (
          <AladinViewer
            ra={crossmatch.catalogs.coordinates.equatorial.ra}
            dec={crossmatch.catalogs.coordinates.equatorial.dec}
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
              <CopyButton textToCopy={crossmatch.record_id}>
                <span className="font-mono">{crossmatch.record_id}</span>
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
            <p>
              {candidates.length === 1
                ? "1 candidate"
                : `${candidates.length} candidates`}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold mb-3">Object</h3>
            <ObjectSummary
              catalogs={crossmatch.catalogs}
              schema={backendSchema}
              name={objectName}
            />
          </div>
        </div>
      </div>

      <ResolutionSelector
        crossmatch={crossmatch}
        candidates={candidates}
        schema={backendSchema}
        showResolveControls={showResolveControls}
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

      {originalDataFields && (
        <Accordion title="Original Data">
          <OriginalData data={originalDataFields} />
        </Accordion>
      )}
    </div>
  );
}

async function fetcher(
  recordId: string | undefined,
): Promise<GetRecordCrossmatchResponse> {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const response = await getRecordCrossmatch({
    client: adminClient,
    query: {
      record_id: recordId,
    },
  });

  if (response.error || !response.data?.data) {
    throw new Error(
      `Error fetching crossmatch details: ${describeUnknownError(response.error) || "Unknown error"}`,
    );
  }

  return response.data.data;
}

export function RecordCrossmatchDetailsPage(): ReactElement {
  const { recordId } = useParams<{ recordId: string }>();

  const { data, loading, error } = useDataFetching(
    () => fetcher(recordId),
    [recordId],
  );

  useEffect(() => {
    document.title = `Crossmatch - ${data?.crossmatch.catalogs.designation?.name ?? recordId} | HyperLEDA`;
  }, [data, recordId]);

  if (loading) return <Loading />;
  if (error) return <ErrorPage message={error} />;
  if (data) return <RecordCrossmatchDetails data={data} />;

  return <ErrorPage message="Unknown error" />;
}
