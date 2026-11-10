import { lazy, ReactElement, Suspense, useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout as SharedLayout, Loading } from "@leda/lib/ui";
import { sameEnvAdminOrigin } from "@leda/lib/origins";
import { HomePage } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFound";
import { Navbar } from "./components/ui/Navbar";
import { SearchBar } from "./components/ui/Searchbar";

const SearchResultsPage = lazy(() =>
  import("./pages/SearchResults").then((m) => ({
    default: m.SearchResultsPage,
  })),
);
const ObjectDetailsPage = lazy(() =>
  import("./pages/ObjectDetails").then((m) => ({
    default: m.ObjectDetailsPage,
  })),
);
const SqlQueryPage = lazy(() =>
  import("./pages/SqlQuery").then((m) => ({ default: m.SqlQueryPage })),
);
const CalculatorsPage = lazy(() =>
  import("./pages/Calculators").then((m) => ({ default: m.CalculatorsPage })),
);
const ReddeningCalculatorPage = lazy(() =>
  import("./pages/ReddeningCalculator").then((m) => ({
    default: m.ReddeningCalculatorPage,
  })),
);

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
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
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
          <Route path="/records/:recordId" element={<RedirectToAdminPage />} />
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
