import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  BrowserRouter,
  Routes,
  Route,
  useSearchParams,
  useNavigate,
  useParams,
} from "react-router-dom";
import { SearchBar } from "./components/ui/searchbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Footer } from "./components/ui/footer";
import { AladinViewer } from "./components/ui/aladin";

interface PGCObject {
  pgc: number;
  catalogs: Catalogs;
}

interface Catalogs {
  designation: Designation;
  icrs: ICRS;
  redshift: Redshift;
}

interface Designation {
  design: string;
}

interface ICRS {
  ra: number;
  dec: number;
  e_ra: number;
  e_dec: number;
}

interface Redshift {
  cz: number;
  e_cz: number;
}

const API_BASE_URL = "http://89.169.133.242/api/v1/query/simple";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}

const homePageMarkdown = `
Examples:
- Search by name:
	- Simple: [IC1445](/query?q=IC1445)
`;

function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="p-4">
      <SearchBar onSearch={handleSearch} logoSize="large" />
      <div className="max-w-4xl mx-auto mt-8 prose prose-invert leading-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {homePageMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function SearchResultsPage() {
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
}

function ObjectDetailsPage() {
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
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/query"
          element={
            <Layout>
              <SearchResultsPage />
            </Layout>
          }
        />
        <Route
          path="/object/:pgcId"
          element={
            <Layout>
              <ObjectDetailsPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
