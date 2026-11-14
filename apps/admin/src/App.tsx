import { lazy, ReactElement, Suspense, useMemo } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  MdAdminPanelSettings,
  MdAccountTree,
  MdCode,
  MdLibraryBooks,
  MdListAlt,
  MdOpenInNew,
  MdPublic,
  MdSchedule,
  MdTableChart,
} from "react-icons/md";
import { LoginPage } from "./pages/Login";
import { isLoggedIn, useIsLoggedIn, clearAuthToken } from "./auth";
import { AuthNavControl } from "./components/AuthNavControl";
import { sameEnvTasksOrigin, sameEnvWebOrigin } from "@leda/lib/origins";
import {
  Layout as SharedLayout,
  Loading,
  NavRail,
  NavButton,
  NavItem,
  ThemeSwitcher,
  BackendSwitcher,
} from "@leda/lib/ui";
const AdminMergePgcPage = lazy(() =>
  import("./pages/AdminMergePgc").then((m) => ({
    default: m.AdminMergePgcPage,
  })),
);
const AdminStructuredUploadPage = lazy(() =>
  import("./pages/AdminStructuredUpload").then((m) => ({
    default: m.AdminStructuredUploadPage,
  })),
);
const AdminPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminPage })),
);
const DataCatalogPage = lazy(() =>
  import("./pages/DataCatalog").then((m) => ({ default: m.DataCatalogPage })),
);
const RecordsPage = lazy(() =>
  import("./pages/Records").then((m) => ({ default: m.RecordsPage })),
);
const RecordCrossmatchDetailsPage = lazy(() =>
  import("./pages/RecordCrossmatchDetails").then((m) => ({
    default: m.RecordCrossmatchDetailsPage,
  })),
);
const ReferenceDetailsPage = lazy(() =>
  import("./pages/ReferenceDetails").then((m) => ({
    default: m.ReferenceDetailsPage,
  })),
);
const ReferencesPage = lazy(() =>
  import("./pages/References").then((m) => ({ default: m.ReferencesPage })),
);
const SqlQueryPage = lazy(() =>
  import("./pages/SqlQuery").then((m) => ({ default: m.SqlQueryPage })),
);
const TableDetailsPage = lazy(() =>
  import("./pages/TableDetails").then((m) => ({ default: m.TableDetailsPage })),
);
const TablesPage = lazy(() =>
  import("./pages/Tables").then((m) => ({ default: m.TablesPage })),
);
const TableUploadPage = lazy(() =>
  import("./pages/TableUpload").then((m) => ({ default: m.TableUploadPage })),
);

const productionAdmin = "https://admin.leda.sao.ru";

function openCurrentPathOnOrigin(targetInput: string): void {
  const { origin } = new URL(targetInput);
  window.location.assign(
    `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function RequireAuth() {
  const location = useLocation();
  if (!isLoggedIn()) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

function Layout() {
  const loggedIn = useIsLoggedIn();
  const showOpenProductionButton = useMemo(() => {
    try {
      return window.location.origin !== new URL(productionAdmin).origin;
    } catch {
      return false;
    }
  }, []);

  return (
    <SharedLayout
      navbar={
        <NavRail
          footer={
            <>
              {loggedIn && showOpenProductionButton ? (
                <NavButton
                  label="Open this page on production"
                  onClick={() => openCurrentPathOnOrigin(productionAdmin)}
                >
                  <MdOpenInNew size={20} />
                </NavButton>
              ) : null}
              {loggedIn ? (
                <NavButton
                  label="Open public interface"
                  onClick={() => {
                    window.open(
                      sameEnvWebOrigin(),
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <MdPublic size={20} />
                </NavButton>
              ) : null}
              {loggedIn ? (
                <NavButton
                  label="Open tasks"
                  onClick={() => {
                    window.open(
                      sameEnvTasksOrigin(),
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <MdSchedule size={20} />
                </NavButton>
              ) : null}
              <AuthNavControl />
              {import.meta.env.DEV ? (
                <BackendSwitcher onBeforeSwitch={clearAuthToken} />
              ) : null}
              <ThemeSwitcher />
            </>
          }
        >
          {loggedIn ? (
            <>
              <NavItem to="/tables" label="Tables">
                <MdTableChart size={20} />
              </NavItem>
              <NavItem to="/records" label="Records">
                <MdListAlt size={20} />
              </NavItem>
              <NavItem to="/data-catalog" label="Data catalog">
                <MdAccountTree size={20} />
              </NavItem>
              <NavItem to="/references" label="References">
                <MdLibraryBooks size={20} />
              </NavItem>
              <NavItem to="/sql" label="SQL">
                <MdCode size={20} />
              </NavItem>
              <NavItem to="/tasks" label="Tasks">
                <MdAdminPanelSettings size={20} />
              </NavItem>
            </>
          ) : null}
        </NavRail>
      }
    >
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </SharedLayout>
  );
}

function RedirectCrossmatchList(): ReactElement {
  const { search } = useLocation();
  return <Navigate to={`/records${search}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/tables" replace />} />
            <Route path="/tasks" element={<AdminPage />} />
            <Route path="/merge-pgc" element={<AdminMergePgcPage />} />
            <Route
              path="/structured-upload"
              element={<AdminStructuredUploadPage />}
            />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/tables/upload" element={<TableUploadPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route
              path="/references/:schema/:table"
              element={<ReferenceDetailsPage />}
            />
            <Route path="/sql" element={<SqlQueryPage />} />
            <Route path="/data-catalog" element={<DataCatalogPage />} />
            <Route path="/data-catalog/query" element={<DataCatalogPage />} />
            <Route
              path="/data-catalog/:schemaName/:tableName"
              element={<DataCatalogPage />}
            />
            <Route path="/table/:tableName" element={<TableDetailsPage />} />
            <Route path="/crossmatch" element={<RedirectCrossmatchList />} />
            <Route
              path="/records/:recordId"
              element={<RecordCrossmatchDetailsPage />}
            />
            <Route
              path="/records/:recordId/crossmatch"
              element={<Navigate to=".." relative="path" replace />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
