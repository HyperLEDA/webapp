import { useMemo } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { MdAdminPanelSettings, MdOpenInNew, MdPublic } from "react-icons/md";
import {
  Layout as SharedLayout,
  NavRail,
  NavButton,
  NavItem,
  ThemeSwitcher,
} from "@hyperleda/ui";

const productionAdmin = "https://admin.leda.sao.ru";
const localWebOrigin = "http://localhost:5173";

function openCurrentPathOnOrigin(targetInput: string): void {
  const { origin } = new URL(targetInput);
  window.location.assign(
    `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function sameEnvWebOrigin(): string {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localWebOrigin;
  }
  if (hostname.startsWith("admin.")) {
    return `${protocol}//${hostname.slice("admin.".length)}`;
  }
  return `${protocol}//${hostname}`;
}

function HomePage() {
  return (
    <>
      <h1>Admin</h1>
      <p>Placeholder — tools will live here.</p>
    </>
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
                  window.location.assign(sameEnvWebOrigin());
                }}
              >
                <MdPublic size={20} />
              </NavButton>
              <ThemeSwitcher />
            </>
          }
        >
          <NavItem to="/" end label="Admin">
            <MdAdminPanelSettings size={20} />
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
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
