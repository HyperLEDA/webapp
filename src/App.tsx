import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import { NotFoundPage } from "./pages/NotFound";
import { TableDetailsPage } from "./pages/TableDetails";
import { CrossmatchResultsPage } from "./pages/CrossmatchResults";
import { RecordCrossmatchDetailsPage } from "./pages/RecordCrossmatchDetails";
import { Layout } from "./components/ui/layout";
import { SearchBar } from "./components/ui/searchbar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <SearchBar logoSize="large" />
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
              <SearchBar />
              <ObjectDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/table/:tableName"
          element={
            <Layout>
              <SearchBar />
              <TableDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/crossmatch"
          element={
            <Layout>
              <CrossmatchResultsPage />
            </Layout>
          }
        />
        <Route
          path="/records/:recordId/crossmatch"
          element={
            <Layout>
              <SearchBar />
              <RecordCrossmatchDetailsPage />
            </Layout>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <SearchBar />
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
