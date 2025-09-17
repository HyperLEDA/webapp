import { ReactElement, useEffect, useState } from "react";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { AladinViewer } from "../components/ui/aladin";
import { Loading } from "../components/ui/loading";
import {
  ErrorPage,
  ErrorPageBackButton,
  ErrorPageHomeButton,
} from "../components/ui/error-page";
import { CatalogData } from "../components/ui/catalog-data";
import { querySimpleApiV1QuerySimpleGet } from "../clients/backend/sdk.gen";
import { PgcObject, Schema } from "../clients/backend/types.gen";

function backToResultsHandler(navigate: NavigateFunction) {
  return function f() {
    navigate(-1);
  };
}

function searchHandler(navigate: NavigateFunction) {
  return function f(query: string) {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };
}

function renderNotFound(navigate: NavigateFunction) {
  return (
    <ErrorPage
      title="Object Not Found"
      message="The requested object could not be found."
    >
      <ErrorPageBackButton onClick={backToResultsHandler(navigate)} />
      <ErrorPageHomeButton onClick={() => navigate("/")} />
    </ErrorPage>
  );
}

function renderObjectDetails(
  object: PgcObject,
  schema: Schema | null,
): ReactElement {
  if (!object || !schema) return <div />;

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start space-x-6">
        {object.catalogs?.coordinates?.equatorial && (
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
          <p className="text-gray-300">PGC: {object.pgc}</p>
        </div>
      </div>
      <CatalogData catalogs={object.catalogs} schema={schema} />
    </div>
  );
}

export function ObjectDetailsPage(): ReactElement {
  const { pgcId } = useParams<{ pgcId: string }>();
  const [object, setObject] = useState<PgcObject | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchObjectDetails() {
      if (!pgcId || isNaN(Number(pgcId))) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await querySimpleApiV1QuerySimpleGet({
          query: {
            pgcs: [Number(pgcId)],
          },
        });

        const objects = response.data?.data.objects;
        const schema = response.data?.data.schema;

        if (objects && objects.length > 0) {
          const objectData = objects[0];
          setObject(objectData);
          setSchema(schema || null);
        } else {
          console.error("Object not found");
        }
      } catch (error) {
        console.error("Error fetching object:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchObjectDetails();
  }, [pgcId, navigate]);

  return (
    <div className="p-8">
      <SearchBar
        onSearch={searchHandler(navigate)}
        logoSize="small"
        showLogo={true}
      />

      {loading ? (
        <Loading />
      ) : object ? (
        renderObjectDetails(object, schema)
      ) : (
        renderNotFound(navigate)
      )}
    </div>
  );
}
