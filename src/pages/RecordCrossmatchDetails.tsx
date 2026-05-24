import { ReactElement, ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AladinViewer } from "../components/core/Aladin";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import {
  getRecordCrossmatch,
  setCrossmatchResults,
} from "../clients/admin/sdk.gen";
import {
  GetRecordCrossmatchResponse,
  RecordCrossmatch,
  PgcCandidate,
  Schema as AdminSchema,
  StatusesPayload,
  Catalogs,
} from "../clients/admin/types.gen";
import { Schema as BackendSchema } from "../clients/backend/types.gen";
import { getResource } from "../resources/resources";
import { Link } from "../components/core/Link";
import { CopyButton } from "../components/ui/CopyButton";
import { Badge, BadgeType } from "../components/ui/Badge";
import { Accordion } from "../components/core/Accordion";
import { useDataFetching } from "../hooks/useDataFetching";
import { adminClient } from "../clients/config";
import { Button } from "../components/core/Button";
import { isLoggedIn } from "../auth/token";
import {
  Declination,
  QuantityWithError,
  RightAscension,
} from "../components/core/Astronomy";
import classNames from "classnames";

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

function ObjectSummary({
  catalogs,
  schema,
  name,
  layout = "rows",
}: {
  catalogs: Catalogs;
  schema: BackendSchema;
  name: ReactNode;
  layout?: "rows" | "columnar";
}): ReactElement {
  const equatorial = catalogs?.coordinates?.equatorial;
  const redshift = catalogs?.redshift;

  const nameField = (
    <>
      <dt className="text-muted">Name</dt>
      <dd>{name}</dd>
    </>
  );

  const raField = equatorial ? (
    <>
      <dt className="text-muted">RA</dt>
      <dd>
        <QuantityWithError
          error={equatorial.e_ra}
          unit={schema.units.coordinates?.equatorial?.ra || "deg"}
        >
          <RightAscension value={equatorial.ra} />
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  const decField = equatorial ? (
    <>
      <dt className="text-muted">Dec</dt>
      <dd>
        <QuantityWithError
          error={equatorial.e_dec}
          unit={schema.units.coordinates?.equatorial?.dec || "deg"}
        >
          <Declination value={equatorial.dec} />
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  const redshiftField = redshift ? (
    <>
      <dt className="text-muted">Redshift</dt>
      <dd>
        <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
          {redshift.z.toFixed(5)}
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  if (layout === "columnar") {
    return (
      <dl className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm">
        <div className="min-w-0">{nameField}</div>
        {raField && <div className="min-w-0">{raField}</div>}
        {decField && <div className="min-w-0">{decField}</div>}
        {redshiftField && <div className="min-w-0">{redshiftField}</div>}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {nameField}
      {raField}
      {decField}
      {redshiftField}
    </dl>
  );
}

type ResolutionChoice = "new" | number;

interface ResolutionSelectorProps {
  crossmatch: RecordCrossmatch;
  candidates: PgcCandidate[];
  schema: BackendSchema;
  showResolveControls: boolean;
  resolving: ResolutionChoice | null;
  selected: ResolutionChoice | null;
  onSelect: (choice: ResolutionChoice) => void;
  onSubmit: () => void;
}

function ResolutionSelector({
  crossmatch,
  candidates,
  schema,
  showResolveControls,
  resolving,
  selected,
  onSelect,
  onSubmit,
}: ResolutionSelectorProps): ReactElement {
  const matchedPgc =
    crossmatch.status === "existing" ? crossmatch.metadata.pgc : null;

  function renderCandidateSummary(candidate: PgcCandidate): ReactElement {
    return (
      <ObjectSummary
        catalogs={candidate.catalogs}
        schema={schema}
        layout="columnar"
        name={
          <Link href={`/object/${candidate.pgc}`}>
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
            resolving !== null && "opacity-50 cursor-wait",
          )}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="crossmatch-resolution"
              className="shrink-0"
              checked={selected === "new"}
              disabled={resolving !== null}
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
              resolving !== null && "opacity-50 cursor-wait",
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="crossmatch-resolution"
                className="shrink-0"
                checked={selected === candidate.pgc}
                disabled={resolving !== null}
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
          disabled={selected === null || resolving !== null}
          onClick={onSubmit}
        >
          {resolving !== null ? "Saving…" : "Save resolution"}
        </Button>
      </div>
    </div>
  );
}

function OriginalData({
  data,
}: {
  data: { [key: string]: unknown };
}): ReactElement {
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
  const [resolveError, setResolveError] = useState<string | null>(null);
  const {
    crossmatch,
    candidates,
    schema,
    table_name: tableName,
    original_data: originalData,
  } = data;
  const showResolveControls =
    isLoggedIn() && crossmatch.triage_status === "pending";
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
        typeof response.error === "object"
          ? JSON.stringify(response.error)
          : String(response.error || "Unknown error"),
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

  async function submitResolution(): Promise<void> {
    if (selected === null) return;
    if (selected === "new") {
      await markAsNew();
    } else {
      await resolveCandidate(selected);
    }
  }

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
              Table: <Link href={`/table/${tableName}`}>{tableName}</Link>
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
        selected={selected}
        onSelect={setSelected}
        onSubmit={() => void submitResolution()}
      />

      {resolveError && (
        <p className="text-danger text-sm" role="alert">
          {resolveError}
        </p>
      )}

      {originalData && (
        <Accordion title="Original Data">
          <OriginalData data={originalData} />
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
      `Error fetching crossmatch details: ${typeof response.error === "object" ? JSON.stringify(response.error) : response.error || "Unknown error"}`,
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

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (data) return <RecordCrossmatchDetails data={data} />;

    return <ErrorPage message="Unknown error" />;
  }

  return <Content />;
}
