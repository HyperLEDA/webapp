import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { Button } from "../components/ui/button";
import { BasicInfoCard } from "../components/ui/basic-info-card";
import { CoordinateDisplay } from "../components/ui/coordinate-display";
import { RedshiftDisplay, VelocityDisplay } from "../components/ui/velocity-display";
import { AladinViewer } from "../components/ui/aladin";
import { querySimpleApiV1QuerySimpleGet } from "../clients/backend/sdk.gen"
import { PgcObject, Schema } from "../clients/backend/types.gen"

export const ObjectDetailsPage: React.FC = () => {
  const { pgcId } = useParams<{ pgcId: string }>();
  const [object, setObject] = useState<PgcObject | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchObjectDetails = async () => {
      if (!pgcId || isNaN(Number(pgcId))) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await querySimpleApiV1QuerySimpleGet({
          query: {
            pgcs: [Number(pgcId)]
          }
        })

        const objects = response.data?.data.objects
        const schema = response.data?.data.schema

        if (objects && objects.length > 0) {
          const objectData = objects[0];
          setObject(objectData);
          setSchema(schema || null)
        } else {
          console.error("Object not found");
        }
      } catch (error) {
        console.error("Error fetching object:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchObjectDetails();
  }, [pgcId, navigate]);

  const handleBackToResults = () => {
    navigate(-1);
  };

  const handleSearch = (query: string) => {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };

  const renderObjectDetails = () => {
    if (!object || !schema) return null;

    return (
      <div>
        <div key={object.pgc} className="flex items-center w-full">
          {object.catalogs?.coordinates?.equatorial && (
            <AladinViewer
              ra={object.catalogs.coordinates.equatorial.ra}
              dec={object.catalogs.coordinates.equatorial.dec}
              fov={0.02}
              survey="P/DSS2/color"
              className="w-96 h-96"
            />
          )}
          <div className="ml-4 w-full">
            {object.catalogs?.designation && (
              <BasicInfoCard title="Name">
                {object.catalogs.designation.name}
              </BasicInfoCard>
            )}
            <BasicInfoCard title="PGC">
              {object.pgc}
            </BasicInfoCard>
            {object.catalogs?.coordinates?.equatorial && (
              <CoordinateDisplay
                equatorial={object.catalogs.coordinates.equatorial}
                galactic={object.catalogs.coordinates.galactic}
                units={schema.units.coordinates}
              />
            )}
          </div>
        </div>
        {object.catalogs?.redshift && (
          <RedshiftDisplay
            redshift={object.catalogs.redshift}
          />
        )}
        {object.catalogs?.velocity && (
          <VelocityDisplay
            velocities={object.catalogs.velocity}
            units={schema.units.velocity}
          />
        )}
      </div>
    );
  };

  const renderNotFound = () => (
    <div className="text-center">
      <Button onClick={handleBackToResults} className="mb-4">
        Back
      </Button>
      <p>Object not found.</p>
    </div>
  );

  return (
    <div className="p-4">
      <SearchBar onSearch={handleSearch} logoSize="small" showLogo={true} />

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : object ? (
        renderObjectDetails()
      ) : (
        renderNotFound()
      )}
    </div>
  );
};
