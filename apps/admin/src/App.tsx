import { useMemo } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
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
  TableDetailsPage,
  TablesPage,
} from "@hyperleda/lib/pages";
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

function Layout() {
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
              {showOpenProductionButton ? (
                <NavButton
                  label="Open this page on production"
                  onClick={() => openCurrentPathOnOrigin(productionAdmin)}
                >
                  <MdOpenInNew size={20} />
                </NavButton>
              ) : null}
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
              <AuthNavControl />
              <ThemeSwitcher />
            </>
          }
        >
          <NavItem to="/" end label="Admin">
            <MdAdminPanelSettings size={20} />
          </NavItem>
          <NavItem to="/tables" label="Tables">
            <MdTableChart size={20} />
          </NavItem>
          <NavItem to="/data-catalog" label="Data catalog">
            <MdAccountTree size={20} />
          </NavItem>
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
          <Route path="/" element={<AdminPage />} />
          <Route path="/merge-pgc" element={<AdminMergePgcPage />} />
          <Route path="/login" element={<LoginPage />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
