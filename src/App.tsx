import React, { useState } from "react";
import axios from "axios";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

interface PGCObject {
  pgc: number;
  catalogs: Record<string, Record<string, unknown>>;
}

const API_BASE_URL = "http://89.169.133.242/api/v1/query/simple";

function App() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [results, setResults] = useState<PGCObject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedObject, setSelectedObject] = useState<PGCObject | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.get<{ data: { objects: PGCObject[] } }>(
        API_BASE_URL,
        {
          params: { name: searchQuery, page_size: 10 },
        }
      );
      setResults(response.data.data.objects || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleObjectClick = (object: PGCObject) => {
    setSelectedObject(object);
  };

  const handleBackToResults = () => {
    setSelectedObject(null);
  };

  return (
    <div className="p-4">
      <header className="text-center mb-4 w-full max-w-4xl mx-auto">
        <img
          src="./src/assets/logo.png"
          alt="HyperLeda Logo"
          className="h-16 mx-auto"
        />
        <div className="flex mt-4 w-full max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Search for an object..."
            className="border rounded px-2 py-1 mt-4 flex-grow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button onClick={handleSearch} className="ml-2 mt-2">
            Search
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : selectedObject ? (
        <div>
          <Button onClick={handleBackToResults} className="mb-4">
            Back to Results
          </Button>
          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-2">
                PGC {selectedObject.pgc}
              </h2>
              <pre>
                Catalogs: {JSON.stringify(selectedObject.catalogs, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.map((object) => (
            <Card
              key={object.pgc}
              className="cursor-pointer hover:shadow-lg"
              onClick={() => handleObjectClick(object)}
            >
              <CardContent>
                <h2 className="text-lg font-bold">PGC {object.pgc}</h2>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
