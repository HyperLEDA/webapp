import { ReactElement, useEffect, useState } from "react";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";
import { AladinViewer } from "../components/ui/aladin";
import { Loading } from "../components/ui/loading";
import {
  ErrorPage,
  ErrorPageBackButton,
  ErrorPageHomeButton,
} from "../components/ui/error-page";
import { CatalogData } from "../components/ui/catalog-data";
import { getRecordCrossmatchAdminApiV1RecordCrossmatchGet } from "../clients/admin/sdk.gen";
import {
  GetRecordCrossmatchResponse,
  RecordCrossmatch,
  RecordCrossmatchStatus,
  PgcCandidate,
  Schema as AdminSchema,
} from "../clients/admin/types.gen";
import {
  PgcObject,
  Schema as BackendSchema,
} from "../clients/backend/types.gen";
import { getResource } from "../resources/resources";

function backToResultsHandler(navigate: NavigateFunction) {
  return function f() {
    navigate(-1);
  };
}

function renderNotFound(navigate: NavigateFunction) {
  return (
    <ErrorPage
      title="Crossmatch Not Found"
      message="The requested crossmatch record could not be found."
    >
      <ErrorPageBackButton onClick={backToResultsHandler(navigate)} />
      <ErrorPageHomeButton onClick={() => navigate("/")} />
    </ErrorPage>
  );
}

function getStatusLabel(status: RecordCrossmatchStatus): string {
  return getResource(`crossmatch.status.${status}`).Title;
}

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

function convertToPgcObject(candidate: PgcCandidate): PgcObject {
  return {
    pgc: candidate.pgc,
    catalogs: candidate.catalogs,
  };
}

function convertRecordToPgcObject(record: RecordCrossmatch): PgcObject {
  return {
    pgc: record.metadata.pgc || 0,
    catalogs: record.catalogs,
  };
}

function convertCandidatesToAdditionalSources(candidates: PgcCandidate[]) {
  return candidates
    .filter((candidate) => candidate.catalogs?.coordinates?.equatorial)
    .map((candidate) => ({
      ra: candidate.catalogs!.coordinates!.equatorial.ra,
      dec: candidate.catalogs!.coordinates!.equatorial.dec,
      label: `PGC ${candidate.pgc}`,
    }));
}

function renderCrossmatchDetails(
  data: GetRecordCrossmatchResponse,
): ReactElement {
  const { crossmatch, candidates, schema } = data;
  const recordObject = convertRecordToPgcObject(crossmatch);
  const backendSchema = convertAdminSchemaToBackendSchema(schema);
  const candidateSources = convertCandidatesToAdditionalSources(candidates);

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start space-x-6">
        {crossmatch.catalogs?.coordinates?.equatorial && (
          <div className="flex flex-col">
            <AladinViewer
              ra={crossmatch.catalogs.coordinates.equatorial.ra}
              dec={crossmatch.catalogs.coordinates.equatorial.dec}
              fov={0.02}
              survey="P/DSS2/color"
              className="w-96 h-96"
              additionalSources={candidateSources}
            />
            {candidateSources.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                White labels show crossmatch candidates
              </p>
            )}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">
            Record ID: {crossmatch.record_id}
          </h2>
          <p className="text-gray-300">
            Status: {getStatusLabel(crossmatch.status)}
          </p>
          {crossmatch.metadata.pgc && (
            <p className="text-gray-300">PGC: {crossmatch.metadata.pgc}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold">Record Catalog Data</h2>
        <CatalogData object={recordObject} schema={backendSchema} />
      </div>

      {candidates.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Crossmatch Candidates</h2>
          {candidates.map((candidate, index) => {
            const candidateObject = convertToPgcObject(candidate);
            return (
              <div key={candidate.pgc} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Candidate {index + 1}: PGC {candidate.pgc}
                </h3>
                <CatalogData object={candidateObject} schema={backendSchema} />
              </div>
            );
          })}
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
        } else {
          console.error("Crossmatch record not found");
        }
      } catch (error) {
        console.error("Error fetching crossmatch details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCrossmatchDetails();
  }, [recordId, navigate]);

  return (
    <div className="p-8">
      {loading ? (
        <Loading />
      ) : data ? (
        renderCrossmatchDetails(data)
      ) : (
        renderNotFound(navigate)
      )}
    </div>
  );
}
