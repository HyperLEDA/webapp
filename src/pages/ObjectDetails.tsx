import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PGCObject } from "../clients/backend";
import { SearchBar } from "../components/ui/searchbar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import axios from "axios";
import { API_BASE_URL } from "../clients/backend";

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
        const response = await axios.get<{ data: { objects: PGCObject[] } }>(
          API_BASE_URL,
          {
            params: { pgcs: pgcId, page_size: 10 },
          }
        );

        if (
          response.data.data.objects &&
          response.data.data.objects.length > 0
        ) {
          setObject(response.data.data.objects[0]);
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
    navigate(-1); // Go back to previous page
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
          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-2">PGC {object.pgc}</h2>
              <pre>Catalogs: {JSON.stringify(object.catalogs, null, 2)}</pre>
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
