import { Outlet } from "react-router-dom";
import { Layout as SharedLayout } from "@hyperleda/ui";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <SharedLayout navbar={<Navbar />}>
      <Outlet />
    </SharedLayout>
  );
}
