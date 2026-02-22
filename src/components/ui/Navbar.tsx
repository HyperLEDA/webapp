import { NavLink } from "react-router-dom";
import { MdSearch, MdTableChart } from "react-icons/md";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search" },
  { to: "/tables", icon: <MdTableChart size={20} />, label: "Tables" },
];

export function Navbar() {
  return (
    <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 gap-2 bg-[#1a1a1a] z-20">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          title={item.label}
          className={({ isActive }) =>
            `w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200 ${
              isActive
                ? "bg-green-600 text-white"
                : "text-neutral-400 hover:bg-neutral-700 hover:text-white"
            }`
          }
        >
          {item.icon}
        </NavLink>
      ))}
    </nav>
  );
}
