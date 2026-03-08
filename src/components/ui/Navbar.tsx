import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { MdInfo, MdSearch, MdTableChart } from "react-icons/md";
import { Hint } from "../core/Hint";
import { Link } from "../core/Link";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search" },
  { to: "/tables", icon: <MdTableChart size={20} />, label: "Tables" },
];

export function Navbar() {
  const [footerOpen, setFooterOpen] = useState(false);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const clickedInside =
        infoPanelRef.current?.contains(e.target as Node) ||
        infoButtonRef.current?.contains(e.target as Node);
      if (!clickedInside) {
        setFooterOpen(false);
      }
    }

    if (footerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [footerOpen]);

  return (
    <>
      <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 pb-4 gap-2 bg-[#1a1a1a] z-20">
        {navItems.map((item) => (
          <Hint
            key={item.to}
            hintContent={item.label}
            position="right"
            trigger="child"
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
          </Hint>
        ))}

        <div className="mt-auto">
          <button
            ref={infoButtonRef}
            onClick={() => setFooterOpen(!footerOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 cursor-pointer ${
              footerOpen
                ? "bg-[#646cff] text-white"
                : "text-neutral-400 hover:bg-neutral-700 hover:text-white"
            }`}
          >
            <MdInfo size={20} />
          </button>
        </div>
      </nav>

      <div
        ref={infoPanelRef}
        className={`fixed left-14 bottom-4 z-20 border-1 rounded-lg py-3 px-4 shadow-lg backdrop-blur-sm bg-[#1a1a1a] transition-all duration-300 ease-in-out ${
          footerOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="prose prose-invert prose-a:no-underline prose-sm leading-relaxed">
          <div>
            Information:{" "}
            <Link href="https://hyperleda.github.io/" external>
              The next generation of the HyperLeda database
            </Link>
          </div>
          <div>
            Original version:{" "}
            <Link href="http://atlas.obs-hp.fr/hyperleda/" external>
              OHP Mirror
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
