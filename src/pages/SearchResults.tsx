import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PGCObject } from "../clients/backend";
import axios from "axios";
import { API_BASE_URL } from "../clients/backend";
import { SearchBar } from "../components/ui/searchbar";
import { AladinViewer } from "../components/ui/aladin";
import { Card, CardContent } from "../components/ui/card";

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<PGCObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get<{ data: { objects: PGCObject[] } }>(
          API_BASE_URL,
          {
            params: { name: query, page_size: 10 },
          }
        );
        setResults(response.data.data.objects || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, navigate]);

  const handleObjectClick = (object: PGCObject) => {
    navigate(`/object/${object.pgc}`);
  };

  const handleSearch = (newQuery: string) => {
    if (newQuery.trim()) {
      navigate(`/query?q=${encodeURIComponent(newQuery)}`);
    }
  };

  return (
    <div className="p-4">
      <SearchBar
        initialValue={query}
        onSearch={handleSearch}
        logoSize="small"
      />

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.length > 0 ? (
            results.map((object) => (
              <div key={object.pgc} className="flex items-center w-full">
                <AladinViewer
                  ra={object.catalogs.icrs.ra}
                  dec={object.catalogs.icrs.dec}
                  fov={0.02}
                  survey="P/DSS2/color"
                  className="w-60 h-60"
                />
                <Card
                  key={object.pgc}
                  className="cursor-pointer hover:shadow-lg flex-grow"
                  onClick={() => handleObjectClick(object)}
                >
                  <CardContent>
                    <h2 className="text-lg font-bold">PGC {object.pgc}</h2>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <p className="text-center">No results found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
};
