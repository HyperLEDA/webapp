import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SearchBar } from "../components/ui/searchbar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { backendClient, PGCObject } from "../clients/backend";
import { AladinViewer } from "../components/ui/aladin";

export const ObjectDetailsPage: React.FC = () => {
  const { pgcId } = useParams<{ pgcId: string }>();
  const [object, setObject] = useState<PGCObject | null>(null);
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

  return (
    <div className="p-4">
      <SearchBar onSearch={handleSearch} logoSize="small" showLogo={true} />

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : object ? (
        <div>
          <Button onClick={handleBackToResults} className="mb-4">
            Back
          </Button>
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
                <Card className="mb-4" title="Name">
                  <CardContent>{object.catalogs.designation.name}</CardContent>
                </Card>
              )}
              <Card className="mb-4" title="PGC">
                <CardContent>{object.pgc}</CardContent>
              </Card>
              {object.catalogs?.coordinates?.equatorial && (
                <Card className="mb-4" title="Coordinates">
                  <Card title="Equatorial">
                    <table>
                      <tr>
                        <td className="font-medium pr-4">Right Ascension</td>
                        <td>
                          {object.catalogs.coordinates.equatorial.ra.toFixed(2)} ± {object.catalogs.coordinates.equatorial.e_ra}{" "}
                          deg
                        </td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-4">Declination</td>
                        <td>
                          {object.catalogs.coordinates.equatorial.dec.toFixed(2)} ±{" "}
                          {object.catalogs.coordinates.equatorial.e_dec} deg
                        </td>
                      </tr>
                    </table>
                  </Card>
                  <Card title="Galactic">
                    <table>
                      <tr>
                        <td className="font-medium pr-4">Galactic latitude</td>
                        <td>
                          {object.catalogs.coordinates.galactic.lat.toFixed(2)} ± {object.catalogs.coordinates.galactic.e_lat}{" "}
                          deg
                        </td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-4">Galactic longitude</td>
                        {object.catalogs.coordinates.galactic.lon.toFixed(2)} ± {object.catalogs.coordinates.galactic.e_lon}{" "} deg
                        <td>
                        </td>
                      </tr>
                    </table>
                  </Card>
                </Card>
              )}
            </div>
          </div>
          {object.catalogs?.velocity?.redshift && (
            <Card className="mt-4" title="Velocity">
              <CardContent>
                <table>
                  <tr>
                    <td className="font-medium pr-4">cz</td>
                    <td>
                      {object.catalogs.velocity.heliocentric.v} ± {object.catalogs.velocity.heliocentric.e_v}{" "} km/s
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-4">z</td>
                    {object.catalogs.velocity.redshift.z} ± {object.catalogs.velocity.redshift.e_z}{" "}
                    <td>
                    </td>
                  </tr>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center">
          <Button onClick={handleBackToResults} className="mb-4">
            Back
          </Button>
          <p>Object not found.</p>
        </div>
      )}
    </div>
  );
};
