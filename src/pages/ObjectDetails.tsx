import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import {
  AstrometryCard,
  IdentityCard,
  KinematicsCard,
  NotesCard,
  PhotometryTotalCard,
  SkyViewCard,
} from "../components/catalogs";
import { querySimple } from "../clients/backend/sdk.gen";
import { PgcObject, Schema } from "../clients/backend/types.gen";
import { useDataFetching } from "../hooks/useDataFetching";
import { backendClient } from "../clients/config";

interface ObjectDetailsProps {
  object: PgcObject;
  schema: Schema | null;
}

function ObjectDetails({ object, schema }: ObjectDetailsProps): ReactElement {
  if (!object || !schema) return <div />;

  const catalogs = object.catalogs;
  const equatorial = catalogs?.coordinates?.equatorial;
  const hasSkyView =
    equatorial?.ra !== undefined && equatorial?.dec !== undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-5 rounded-lg">
      <SkyViewCard catalogs={catalogs} className="lg:col-span-2" />
      <IdentityCard
        pgc={object.pgc}
        catalogs={catalogs}
        schema={schema}
        className={hasSkyView ? "lg:col-span-4" : "lg:col-span-6"}
      />
      <NotesCard catalogs={catalogs} className="lg:col-span-6" />
      <AstrometryCard
        catalogs={catalogs}
        schema={schema}
        pgc={object.pgc}
        className="lg:col-span-3"
      />
      <KinematicsCard
        catalogs={catalogs}
        schema={schema}
        pgc={object.pgc}
        className="lg:col-span-3"
      />
      <PhotometryTotalCard
        catalogs={catalogs}
        pgc={object.pgc}
        className="lg:col-span-6"
      />
    </div>
  );
}

async function fetcher(
  pgcId: string | undefined,
): Promise<[PgcObject, Schema]> {
  if (!pgcId || isNaN(Number(pgcId))) {
    throw new Error(`Invalid PGC number: ${pgcId}`);
  }

  const response = await querySimple({
    client: backendClient,
    query: {
      pgcs: [Number(pgcId)],
    },
  });

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(
      `Error during query: ${typeof err === "object" ? JSON.stringify(err) : err}`,
    );
  }

  const objects = response.data.data.objects;
  const schema = response.data.data.schema;

  if (!objects || objects.length === 0) {
    throw new Error(`Object ${pgcId} not found`);
  }

  return [objects[0], schema];
}

export function ObjectDetailsPage(): ReactElement {
  const { pgcId } = useParams<{ pgcId: string }>();

  useEffect(() => {
    document.title = `PGC ${pgcId} | HyperLEDA`;
  }, [pgcId]);

  const {
    data: payload,
    loading,
    error,
  } = useDataFetching(() => fetcher(pgcId), [pgcId]);

  const [object, schema] = payload || [null, null];

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (object && schema)
      return <ObjectDetails object={object} schema={schema} />;

    return <ErrorPage message="Unknown error" />;
  }

  return <Content />;
}
