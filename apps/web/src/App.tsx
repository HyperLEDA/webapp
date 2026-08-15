import { ReactElement, useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout as SharedLayout, Loading } from "@hyperleda/lib/ui";
import { sameEnvAdminOrigin } from "@hyperleda/lib/origins";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import { NotFoundPage } from "./pages/NotFound";
import { Navbar } from "./components/ui/Navbar";
import { SearchBar } from "./components/ui/Searchbar";
import {
  AdminMergePgcPage,
  AdminPage,
  CrossmatchResultsPage,
  DataCatalogPage,
  LoginPage,
  RecordCrossmatchDetailsPage,
} from "@hyperleda/lib/pages";

function RedirectToAdminPage(): ReactElement {
  useEffect(() => {
    window.location.replace(
      `${sameEnvAdminOrigin()}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }, []);

  return <Loading />;
}

function Layout() {
  return (
    <SharedLayout navbar={<Navbar />}>
      <Outlet />
    </SharedLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <>
                <SearchBar logoSize="large" autoFocus />
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
          <Route path="/table/:tableName" element={<RedirectToAdminPage />} />
          <Route path="/tables" element={<RedirectToAdminPage />} />
          <Route path="/data-catalog" element={<DataCatalogPage />} />
          <Route path="/data-catalog/query" element={<DataCatalogPage />} />
          <Route
            path="/data-catalog/:schemaName/:tableName"
            element={<DataCatalogPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/merge-pgc" element={<AdminMergePgcPage />} />
          <Route path="/crossmatch" element={<CrossmatchResultsPage />} />
          <Route
            path="/records/:recordId/crossmatch"
            element={<RecordCrossmatchDetailsPage />}
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
