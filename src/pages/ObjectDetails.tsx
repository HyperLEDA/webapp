import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AladinViewer } from "../components/ui/aladin";
import { Loading } from "../components/ui/loading";
import { ErrorPage } from "../components/ui/error-page";
import { CatalogData } from "../components/ui/catalog-data";
import { Link } from "../components/ui/link";
import { querySimpleApiV1QuerySimpleGet } from "../clients/backend/sdk.gen";
import { PgcObject, Schema } from "../clients/backend/types.gen";

interface ObjectDetailsProps {
  object: PgcObject;
  schema: Schema | null;
}

function ObjectDetails({ object, schema }: ObjectDetailsProps): ReactElement {
  if (!object || !schema) return <div />;

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start space-x-6">
        {object.catalogs?.coordinates && (
          <AladinViewer
            ra={object.catalogs.coordinates.equatorial.ra}
            dec={object.catalogs.coordinates.equatorial.dec}
            fov={0.02}
            survey="P/DSS2/color"
            className="w-96 h-96"
          />
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">
            {object.catalogs?.designation?.name || `PGC ${object.pgc}`}
          </h2>
          <p>PGC: {object.pgc}</p>
          <Link
            href={`http://atlas.obs-hp.fr/hyperleda/ledacat.cgi?o=%23${object.pgc}`}
            external
          >
            OHP Mirror
          </Link>
        </div>
      </div>
      <CatalogData catalogs={object.catalogs} schema={schema} />
    </div>
  );
}

async function fetcher(
  pgcId: string | undefined,
): Promise<[PgcObject, Schema]> {
  if (!pgcId || isNaN(Number(pgcId))) {
    throw new Error(`Invalid PGC number: ${pgcId}`);
  }

  const response = await querySimpleApiV1QuerySimpleGet({
    query: {
      pgcs: [Number(pgcId)],
    },
  });

  if (response.error || !response.data) {
    throw new Error(`Error during query: ${response.error}`);
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
  const [payload, setPayload] = useState<[PgcObject, Schema] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        setPayload(await fetcher(pgcId));
      } catch (error) {
        setError(`${error}`);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [pgcId]);

  const [object, schema] = payload || [null, null];

  function RenderContent(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (object && schema)
      return <ObjectDetails object={object} schema={schema} />;

    return <ErrorPage message="Unknown error" />;
  }

  return <RenderContent />;
}
