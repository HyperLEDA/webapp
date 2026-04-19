import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import { NotFoundPage } from "./pages/NotFound";
import { CrossmatchResultsPage } from "./pages/CrossmatchResults";
import { RecordCrossmatchDetailsPage } from "./pages/RecordCrossmatchDetails";
import { TablesPage } from "./pages/Tables";
import { DataCatalogPage } from "./pages/DataCatalog";
import { Layout } from "./components/ui/Layout";
import { SearchBar } from "./components/ui/Searchbar";
import { LoginPage } from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <>
                <SearchBar logoSize="large" />
                <HomePage />
              </>
            }
          />
          <Route path="/query" element={<SearchResultsPage />} />
          <Route
            path="/object/:pgcId"
            element={
              <>
                <SearchBar />
                <ObjectDetailsPage />
              </>
            }
          />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/data-catalog" element={<DataCatalogPage />} />
          <Route
            path="/data-catalog/:schemaName/:tableName"
            element={<DataCatalogPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/crossmatch" element={<CrossmatchResultsPage />} />
          <Route
            path="/records/:recordId/crossmatch"
            element={
              <>
                <SearchBar />
                <RecordCrossmatchDetailsPage />
              </>
            }
          />
          <Route
            path="*"
            element={
              <>
                <SearchBar />
                <NotFoundPage />
              </>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
