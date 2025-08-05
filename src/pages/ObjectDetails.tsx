import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { Button } from "../components/ui/button";
import { BasicInfoCard } from "../components/ui/basic-info-card";
import { CoordinateDisplay } from "../components/ui/coordinate-display";
import { VelocityDisplay } from "../components/ui/velocity-display";
import { backendClient, PGCObject, Schema } from "../clients/backend";
import { AladinViewer } from "../components/ui/aladin";

export const ObjectDetailsPage: React.FC = () => {
  const { pgcId } = useParams<{ pgcId: string }>();
  const [object, setObject] = useState<PGCObject | null>(null);
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
        const response = await backendClient.queryByPGC([Number(pgcId)]);

        if (response.objects && response.objects.length > 0) {
          const objectData = response.objects[0];
          setObject(objectData);
          setSchema(response.schema)
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
        {object.catalogs?.velocity?.redshift && (
          <VelocityDisplay
            heliocentric={object.catalogs.velocity.heliocentric}
            redshift={object.catalogs.velocity.redshift}
            units={schema.units.velocity.heliocentric}
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
