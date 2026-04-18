import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AladinViewer } from "../components/core/Aladin";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { CatalogData } from "../components/ui/CatalogData";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { getRecordCrossmatch } from "../clients/admin/sdk.gen";
import {
  GetRecordCrossmatchResponse,
  RecordCrossmatch,
  PgcCandidate,
  Schema as AdminSchema,
} from "../clients/admin/types.gen";
import { Schema as BackendSchema } from "../clients/backend/types.gen";
import { getResource } from "../resources/resources";
import { Link } from "../components/core/Link";
import { CopyButton } from "../components/ui/CopyButton";
import { Badge } from "../components/ui/Badge";
import { Accordion } from "../components/core/Accordion";
import { useDataFetching } from "../hooks/useDataFetching";
import { adminClient } from "../clients/config";

// TODO: remove when admin api uses the same structures as data api
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

function convertCandidatesToAdditionalSources(
  candidates: PgcCandidate[],
  mainRecord: RecordCrossmatch,
) {
  const candidateSources = candidates
    .filter((candidate) => candidate.catalogs?.coordinates?.equatorial)
    .map((candidate) => ({
      ra: candidate.catalogs!.coordinates!.equatorial.ra,
      dec: candidate.catalogs!.coordinates!.equatorial.dec,
      label: `PGC ${candidate.pgc}`,
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

interface RecordCrossmatchDetailsProps {
  data: GetRecordCrossmatchResponse;
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

function RecordCrossmatchDetails({
  data,
}: RecordCrossmatchDetailsProps): ReactElement {
  const {
    crossmatch,
    candidates,
    schema,
    table_name: tableName,
    original_data: originalData,
  } = data;
  const recordCatalogs = crossmatch.catalogs;
  const backendSchema = convertAdminSchemaToBackendSchema(schema);
  const candidateSources = convertCandidatesToAdditionalSources(
    candidates,
    crossmatch,
  );

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start space-x-6">
        {crossmatch.catalogs?.coordinates?.equatorial && (
          <AladinViewer
            ra={crossmatch.catalogs.coordinates.equatorial.ra}
            dec={crossmatch.catalogs.coordinates.equatorial.dec}
            fov={0.02}
            className="w-96 h-96"
            additionalSources={candidateSources}
          />
        )}
        <div className="flex-1">
          {crossmatch.catalogs?.designation?.name && (
            <h2 className="text-2xl font-bold mb-2">
              {crossmatch.catalogs.designation.name}
            </h2>
          )}
          <p className="flex items-center gap-2 mb-2">
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
          <p>
            Manual check status:{" "}
            <Badge>
              {
                getResource(
                  `crossmatch.triage.${crossmatch.triage_status ?? "pending"}`,
                ).Title
              }
            </Badge>
          </p>
        </div>
      </div>

      <CatalogData catalogs={recordCatalogs} schema={backendSchema} />

      {originalData && (
        <Accordion title="Original Data">
          <OriginalData data={originalData} />
        </Accordion>
      )}

      {candidates.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Crossmatch Candidates</h2>
          {candidates.map((candidate) => (
            <Accordion
              key={candidate.pgc}
              title={`PGC ${candidate.pgc}`}
              defaultOpen
            >
              <p className="flex items-center gap-2 mb-2">
                <CopyButton
                  textToCopy={`${crossmatch.record_id},${candidate.pgc}`}
                >
                  <span className="font-mono">
                    <Link href={`/object/${candidate.pgc}`}>
                      {`PGC ${candidate.pgc}`}
                    </Link>
                  </span>
                </CopyButton>
              </p>
              <CatalogData
                catalogs={candidate.catalogs}
                schema={backendSchema}
              />
            </Accordion>
          ))}
        </div>
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
