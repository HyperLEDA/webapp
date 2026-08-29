import { ReactElement, useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout as SharedLayout, Loading } from "@leda/lib/ui";
import { sameEnvAdminOrigin } from "@leda/lib/origins";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { ObjectDetailsPage } from "./pages/ObjectDetails";
import { NotFoundPage } from "./pages/NotFound";
import { SqlQueryPage } from "./pages/SqlQuery";
import { CalculatorsPage } from "./pages/Calculators";
import { ReddeningCalculatorPage } from "./pages/ReddeningCalculator";
import { Navbar } from "./components/ui/Navbar";
import { SearchBar } from "./components/ui/Searchbar";

function adminRedirectPath(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/") {
    return "/tasks";
  }
  if (pathname.startsWith("/admin/")) {
    return pathname.slice("/admin".length);
  }
  return pathname;
}

function RedirectToAdminPage(): ReactElement {
  useEffect(() => {
    const path = adminRedirectPath(window.location.pathname);
    window.location.replace(
      `${sameEnvAdminOrigin()}${path}${window.location.search}${window.location.hash}`,
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
          <Route path="/sql" element={<SqlQueryPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />
          <Route
            path="/calculators/reddening"
            element={<ReddeningCalculatorPage />}
          />
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
          <Route path="/admin" element={<RedirectToAdminPage />} />
          <Route path="/admin/merge-pgc" element={<RedirectToAdminPage />} />
          <Route path="/crossmatch" element={<RedirectToAdminPage />} />
          <Route
            path="/records/:recordId/crossmatch"
            element={<RedirectToAdminPage />}
          />
          <Route path="/data-catalog" element={<RedirectToAdminPage />} />
          <Route path="/data-catalog/query" element={<RedirectToAdminPage />} />
          <Route
            path="/data-catalog/:schemaName/:tableName"
            element={<RedirectToAdminPage />}
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
