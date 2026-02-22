import { NavLink } from "react-router-dom";
import { Tooltip } from "flowbite-react";
import { MdSearch, MdTableChart } from "react-icons/md";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search" },
  { to: "/tables", icon: <MdTableChart size={20} />, label: "Tables" },
];

export function Navbar() {
  return (
    <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 gap-2 bg-[#1a1a1a] z-20">
      {navItems.map((item) => (
        <Tooltip
          key={item.to}
          content={item.label}
          placement="right"
          arrow={false}
          className="bg-gray-600 z-10 backdrop-blur-sm bg-opacity-99 border-1"
        >
          <NavLink
            to={item.to}
            end
            className={({ isActive }) =>
              `w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 ${
                isActive
                  ? "bg-[#646cff] text-white"
                  : "text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`
            }
          >
            {item.icon}
          </NavLink>
        </Tooltip>
      ))}
    </nav>
  );
}
