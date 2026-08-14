import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <Navbar />
      <div className="ml-12 flex flex-col flex-grow min-h-screen">
        <div className="flex-grow p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
