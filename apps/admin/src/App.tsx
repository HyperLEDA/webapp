import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { MdAdminPanelSettings } from "react-icons/md";
import { Layout, NavRail, NavItem, ThemeSwitcher } from "@hyperleda/ui";

function HomePage() {
  return (
    <>
      <h1>Admin</h1>
      <p>Placeholder — tools will live here.</p>
    </>
  );
}

function AdminLayout() {
  return (
    <Layout
      navbar={
        <NavRail footer={<ThemeSwitcher />}>
          <NavItem to="/" end label="Admin">
            <MdAdminPanelSettings size={20} />
          </NavItem>
        </NavRail>
      }
    >
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
