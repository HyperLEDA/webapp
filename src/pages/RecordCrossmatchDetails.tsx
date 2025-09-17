import { ReactElement, useEffect, useState } from "react";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";
import { AladinViewer } from "../components/ui/aladin";
import { Loading } from "../components/ui/loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/error-page";
import { CatalogData } from "../components/ui/catalog-data";
import { getRecordCrossmatchAdminApiV1RecordCrossmatchGet } from "../clients/admin/sdk.gen";
import {
  GetRecordCrossmatchResponse,
  RecordCrossmatch,
  PgcCandidate,
  Schema as AdminSchema,
} from "../clients/admin/types.gen";
import { Schema as BackendSchema } from "../clients/backend/types.gen";
import { getResource } from "../resources/resources";
import { Link } from "../components/ui/link";

function renderNotFound(navigate: NavigateFunction) {
  return (
    <ErrorPage
      title="Crossmatch Not Found"
      message="The requested crossmatch record could not be found."
    >
      <ErrorPageHomeButton onClick={() => navigate("/")} />
    </ErrorPage>
  );
}

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

function renderCrossmatchDetails(
  data: GetRecordCrossmatchResponse,
): ReactElement {
  const { crossmatch, candidates, schema } = data;
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
            survey="P/DSS2/color"
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
          <p>
            Status:{" "}
            {getResource(`crossmatch.status.${crossmatch.status}`).Title}
          </p>
        </div>
      </div>

      <CatalogData catalogs={recordCatalogs} schema={backendSchema} />

      {candidates.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Crossmatch Candidates</h2>
          {candidates.map((candidate, index) => (
            <div key={candidate.pgc} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                Candidate {index + 1}:{" "}
                <Link
                  href={`/object/${candidate.pgc}`}
                >{`PGC ${candidate.pgc}`}</Link>
              </h3>
              <CatalogData
                catalogs={candidate.catalogs}
                schema={backendSchema}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecordCrossmatchDetailsPage(): ReactElement {
  const { recordId } = useParams<{ recordId: string }>();
  const [data, setData] = useState<GetRecordCrossmatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCrossmatchDetails() {
      if (!recordId) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await getRecordCrossmatchAdminApiV1RecordCrossmatchGet(
          {
            query: {
              record_id: recordId,
            },
          },
        );

        if (response.data?.data) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching crossmatch details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCrossmatchDetails();
  }, [recordId, navigate]);

  function renderContent(): ReactElement {
    if (loading) return <Loading />;
    if (data) return renderCrossmatchDetails(data);
    return renderNotFound(navigate);
  }

  return <>{renderContent()}</>;
}
