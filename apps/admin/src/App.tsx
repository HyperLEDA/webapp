import { useMemo } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import {
  MdAdminPanelSettings,
  MdAccountTree,
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
} from "@hyperleda/lib/pages";
import { TableDetailsPage, TablesPage } from "./pages";
import { isLoggedIn, useIsLoggedIn } from "@hyperleda/lib/auth";
import { sameEnvWebOrigin } from "@hyperleda/lib/origins";
import {
  AuthNavControl,
  Layout as SharedLayout,
  NavRail,
  NavButton,
  NavItem,
  ThemeSwitcher,
} from "@hyperleda/lib/ui";

const productionAdmin = "https://admin.leda.sao.ru";

function openCurrentPathOnOrigin(targetInput: string): void {
  const { origin } = new URL(targetInput);
  window.location.assign(
    `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function RequireAuth() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
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
              <NavItem to="/" end label="Admin">
                <MdAdminPanelSettings size={20} />
              </NavItem>
              <NavItem to="/tables" label="Tables">
                <MdTableChart size={20} />
              </NavItem>
              <NavItem to="/data-catalog" label="Data catalog">
                <MdAccountTree size={20} />
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
            <Route path="/" element={<AdminPage authGuard={false} />} />
            <Route
              path="/merge-pgc"
              element={<AdminMergePgcPage authGuard={false} />}
            />
            <Route path="/tables" element={<TablesPage />} />
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
