import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { MdAdminPanelSettings } from "react-icons/md";
import {
  Layout,
  Navbar,
  navRailControlClassName,
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

function AdminLayout() {
  return (
    <Layout
      navbar={
        <Navbar tone="admin" footer={<ThemeSwitcher />}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => navRailControlClassName(isActive)}
            title="Admin"
          >
            <MdAdminPanelSettings size={20} />
          </NavLink>
        </Navbar>
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
