import { useMemo } from "react";
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
  MdOpenInNew,
  MdPublic,
  MdTableChart,
} from "react-icons/md";
import {
  AdminMergePgcPage,
  AdminPage,
  CrossmatchResultsPage,
  DataCatalogPage,
  LoginPage,
  RecordCrossmatchDetailsPage,
  SqlQueryPage,
  TableDetailsPage,
  TablesPage,
} from "./pages";
import { isLoggedIn, useIsLoggedIn } from "./auth";
import { AuthNavControl } from "./components/AuthNavControl";
import { sameEnvWebOrigin } from "@leda/lib/origins";
import {
  Layout as SharedLayout,
  NavRail,
  NavButton,
  NavItem,
  ThemeSwitcher,
} from "@leda/lib/ui";

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
              <AuthNavControl />
              <ThemeSwitcher />
            </>
          }
        >
          {loggedIn ? (
            <>
              <NavItem to="/tables" label="Tables">
                <MdTableChart size={20} />
              </NavItem>
              <NavItem to="/data-catalog" label="Data catalog">
                <MdAccountTree size={20} />
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
      <Outlet />
    </SharedLayout>
  );
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
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/sql" element={<SqlQueryPage />} />
            <Route path="/data-catalog" element={<DataCatalogPage />} />
            <Route path="/data-catalog/query" element={<DataCatalogPage />} />
            <Route
              path="/data-catalog/:schemaName/:tableName"
              element={<DataCatalogPage />}
            />
            <Route path="/table/:tableName" element={<TableDetailsPage />} />
            <Route path="/crossmatch" element={<CrossmatchResultsPage />} />
            <Route
              path="/records/:recordId/crossmatch"
              element={<RecordCrossmatchDetailsPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
