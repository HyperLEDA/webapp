import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { backendClient, SearchPGCObject } from "../clients/backend";
import { SearchBar } from "../components/ui/searchbar";
import { AladinViewer } from "../components/ui/aladin";
import { Card, CardContent } from "../components/ui/card";

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<SearchPGCObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pagesize") || "10");

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        navigate("/");
        return;
      }

      setLoading(true);
      try {
        const response = await backendClient.query(query, page - 1, pageSize);
        setResults(response.objects);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, navigate, pageSize, page]);

  const handleObjectClick = (object: SearchPGCObject) => {
    navigate(`/object/${object.pgc}`);
  };

  const handleSearch = (newQuery: string) => {
    if (newQuery.trim()) {
      navigate(`/query?q=${encodeURIComponent(newQuery)}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    navigate(
      `/query?q=${encodeURIComponent(
        query
      )}&page=${newPage}&pagesize=${pageSize}`
    );
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
            <>
              {results.map((object) => (
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
                    className="cursor-pointer hover:shadow-lg flex-grow ml-4"
                    onClick={() => handleObjectClick(object)}
                  >
                    <CardContent>
                      <h2 className="text-lg">PGC {object.pgc}</h2>
                    </CardContent>
                    <CardContent>
                      <h2 className="text-lg">
                        Name: {object.catalogs.designation.design}
                      </h2>
                    </CardContent>
                    <CardContent>
                      <h2 className="text-lg">
                        J2000: {object.catalogs.icrs.ra} deg,{" "}
                        {object.catalogs.icrs.dec} deg
                      </h2>
                    </CardContent>
                  </Card>
                </div>
              ))}
              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={results.length < pageSize}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-center">No results found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
};
