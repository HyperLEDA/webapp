import { useEffect, useMemo, useRef, useState } from "react";
import { MdCode, MdInfo, MdOpenInNew, MdSearch } from "react-icons/md";
import {
  NavRail,
  NavButton,
  NavItem,
  ThemeSwitcher,
  BackendSwitcher,
} from "@leda/lib/ui";
import { Link } from "@leda/lib/ui";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search", end: true },
  { to: "/sql", icon: <MdCode size={20} />, label: "SQL", end: true },
];

const configuredProductionWeb = "https://leda.sao.ru";

function openCurrentPathOnOrigin(productionWebInput: string): void {
  const { origin } = new URL(productionWebInput);
  window.location.assign(
    `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function Navbar() {
  const [footerOpen, setFooterOpen] = useState(false);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const showOpenProductionButton = useMemo(() => {
    try {
      return window.location.origin !== new URL(configuredProductionWeb).origin;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const clickedInside =
        // SAFETY: `contains` expects a DOM Node; event targets inside the document are Nodes.
        infoPanelRef.current?.contains(e.target as Node) ||
        // SAFETY: `contains` expects a DOM Node; event targets inside the document are Nodes.
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
      <NavRail
        footer={
          <>
            {showOpenProductionButton ? (
              <NavButton
                label="Open this page on production"
                onClick={() => openCurrentPathOnOrigin(configuredProductionWeb)}
              >
                <MdOpenInNew size={20} />
              </NavButton>
            ) : null}
            {import.meta.env.DEV ? <BackendSwitcher /> : null}
            <ThemeSwitcher />
            <NavButton
              ref={infoButtonRef}
              label="Information"
              active={footerOpen}
              onClick={() => setFooterOpen(!footerOpen)}
            >
              <MdInfo size={20} />
            </NavButton>
          </>
        }
      >
        {navItems.map((item) => (
          <NavItem key={item.to} to={item.to} end={item.end} label={item.label}>
            {item.icon}
          </NavItem>
        ))}
      </NavRail>

      <div
        ref={infoPanelRef}
        className={`fixed left-14 bottom-4 z-20 border border-border rounded-lg py-3 px-4 shadow-lg backdrop-blur-sm bg-surface-2 transition-all duration-300 ease-in-out ${
          footerOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="prose dark:prose-invert prose-a:no-underline prose-sm leading-relaxed">
          <div>
            Information:{" "}
            <Link href="https://hyperleda.github.io/" external>
              The next generation of the LEDA database
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
