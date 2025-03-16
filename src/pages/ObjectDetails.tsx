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
        const response = await backendClient.querySimple({
          pgcs: [Number(pgcId)],
        });

        if (response.objects && response.objects.length > 0) {
          setObject(response.objects[0]);
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
            <AladinViewer
              ra={object.catalogs.icrs.ra}
              dec={object.catalogs.icrs.dec}
              fov={0.02}
              survey="P/DSS2/color"
              className="w-96 h-96"
            />
            <div className="ml-4 w-full">
              <Card className="mb-4" title="PGC">
                <CardContent>{object.pgc}</CardContent>
              </Card>
              <Card className="mb-4" title="J2000">
                <table>
                  <tbody>
                    <tr>
                      <td className="font-medium pr-4">Right Ascension</td>
                      <td>
                        {object.catalogs.icrs.ra} ± {object.catalogs.icrs.e_ra}{" "}
                        deg
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium pr-4">Declination</td>
                      <td>
                        {object.catalogs.icrs.dec} ±{" "}
                        {object.catalogs.icrs.e_dec} deg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
              <Card title="Name">
                <CardContent>{object.catalogs.designation.design}</CardContent>
              </Card>
            </div>
          </div>
          <Card className="mt-4" title="Velocity">
            <CardContent>
              {object.catalogs.redshift.cz} ± {object.catalogs.redshift.e_cz}{" "}
              km/s
            </CardContent>
          </Card>
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
