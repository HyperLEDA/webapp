import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { Button } from "../components/ui/button";
import { AladinViewer } from "../components/ui/aladin";
import { CommonTable } from "../components/ui/common-table";
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

    const coordinatesColumns = [
      { name: "Parameter" },
      { name: "Value" },
      { name: "Unit" },
      { name: "Error" },
      { name: "Error unit" },
    ];

    const coordinatesData = [
      {
        Parameter: "Right ascension",
        Value: object.catalogs?.coordinates?.equatorial?.ra?.toFixed(6) || "NULL",
        Unit: schema.units.coordinates?.equatorial?.ra || "NULL",
        Error: object.catalogs?.coordinates?.equatorial?.e_ra?.toFixed(6) || "NULL",
        "Error unit": schema.units.coordinates?.equatorial?.e_ra || "NULL",
      },
      {
        Parameter: "Declination",
        Value: object.catalogs?.coordinates?.equatorial?.dec?.toFixed(6) || "NULL",
        Unit: schema.units.coordinates?.equatorial?.dec || "NULL",
        Error: object.catalogs?.coordinates?.equatorial?.e_dec?.toFixed(6) || "NULL",
        "Error unit": schema.units.coordinates?.equatorial?.e_dec || "NULL",
      },
      {
        Parameter: "Galactic longitude",
        Value: object.catalogs?.coordinates?.galactic?.lon?.toFixed(6) || "NULL",
        Unit: schema.units.coordinates?.galactic?.lon || "NULL",
        Error: object.catalogs?.coordinates?.galactic?.e_lon?.toFixed(6) || "NULL",
        "Error unit": schema.units.coordinates?.galactic?.e_lon || "NULL",
      },
      {
        Parameter: "Galactic latitude",
        Value: object.catalogs?.coordinates?.galactic?.lat?.toFixed(6) || "NULL",
        Unit: schema.units.coordinates?.galactic?.lat || "NULL",
        Error: object.catalogs?.coordinates?.galactic?.e_lat?.toFixed(6) || "NULL",
        "Error unit": schema.units.coordinates?.galactic?.e_lat || "NULL",
      },
    ];

    const redshiftColumns = [
      { name: "Parameter" },
      { name: "Value" },
      { name: "Error" },
    ];

    const redshiftData = [
      {
        Parameter: "z",
        Value: object.catalogs?.redshift?.z?.toFixed(6) || "NULL",
        Error: object.catalogs?.redshift?.e_z?.toFixed(6) || "NULL",
      },
    ];

    const velocityColumns = [
      { name: "Parameter" },
      { name: "Value" },
      { name: "Unit" },
      { name: "Error" },
      { name: "Error unit" },
    ];

    const velocityData = [
      {
        Parameter: "Heliocentric",
        Value: object.catalogs?.velocity?.heliocentric?.v?.toFixed(2) || "NULL",
        Unit: schema.units.velocity?.heliocentric?.v || "NULL",
        Error: object.catalogs?.velocity?.heliocentric?.e_v?.toFixed(2) || "NULL",
        "Error unit": schema.units.velocity?.heliocentric?.e_v || "NULL",
      },
      {
        Parameter: "Local Group",
        Value: object.catalogs?.velocity?.local_group?.v?.toFixed(2) || "NULL",
        Unit: schema.units.velocity?.local_group?.v || "NULL",
        Error: object.catalogs?.velocity?.local_group?.e_v?.toFixed(2) || "NULL",
        "Error unit": schema.units.velocity?.local_group?.e_v || "NULL",
      },
      {
        Parameter: "CMB (old)",
        Value: object.catalogs?.velocity?.cmb_old?.v?.toFixed(2) || "NULL",
        Unit: schema.units.velocity?.cmb_old?.v || "NULL",
        Error: object.catalogs?.velocity?.cmb_old?.e_v?.toFixed(2) || "NULL",
        "Error unit": schema.units.velocity?.cmb_old?.e_v || "NULL",
      },
      {
        Parameter: "CMB",
        Value: object.catalogs?.velocity?.cmb?.v?.toFixed(2) || "NULL",
        Unit: schema.units.velocity?.cmb?.v || "NULL",
        Error: object.catalogs?.velocity?.cmb?.e_v?.toFixed(2) || "NULL",
        "Error unit": schema.units.velocity?.cmb?.e_v || "NULL",
      },
    ];

    return (
      <div className="space-y-6 p-4 rounded-lg">
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
            <h2 className="text-2xl font-bold text-white mb-2">
              {object.catalogs?.designation?.name || `PGC ${object.pgc}`}
            </h2>
            <p className="text-gray-300">PGC: {object.pgc}</p>
          </div>
        </div>

        {object.catalogs?.coordinates && (
          <CommonTable
            columns={coordinatesColumns}
            data={coordinatesData}
          >
            <h2 className="text-xl font-bold text-white">Coordinates</h2>
            <p className="text-gray-300">Celestial coordinates of the object</p>
          </CommonTable>
        )}

        {object.catalogs?.redshift && (
          <CommonTable
            columns={redshiftColumns}
            data={redshiftData}
          >
            <h2 className="text-xl font-bold text-white">Redshift</h2>
            <p className="text-gray-300">Redshift measurements</p>
          </CommonTable>
        )}

        {object.catalogs?.velocity && (
          <CommonTable
            columns={velocityColumns}
            data={velocityData}
          >
            <h2 className="text-xl font-bold text-white">Velocity</h2>
            <p className="text-gray-300">Velocity measurements with respect to different apexes</p>
          </CommonTable>
        )}
      </div>
    );
  };

  const renderNotFound = () => (
    <div className="text-center">
      <Button onClick={handleBackToResults} className="mb-4">
        Back
      </Button>
      <p className="text-gray-300">Object not found.</p>
    </div>
  );

  return (
    <div className="p-4">
      <SearchBar onSearch={handleSearch} logoSize="small" showLogo={true} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      ) : object ? (
        renderObjectDetails()
      ) : (
        renderNotFound()
      )}
    </div>
  );
};
