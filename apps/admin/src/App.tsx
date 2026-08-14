import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { MdAdminPanelSettings } from "react-icons/md";
import {
  Layout as SharedLayout,
  NavRail,
  NavItem,
  ThemeSwitcher,
} from "@hyperleda/ui";

function HomePage() {
  return (
    <>
      <h1>Admin</h1>
      <p>Placeholder — tools will live here.</p>
    </>
  );
}

function Layout() {
  return (
    <SharedLayout
      navbar={
        <NavRail footer={<ThemeSwitcher />}>
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
