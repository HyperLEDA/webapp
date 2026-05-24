import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdAccountTree,
  MdInfo,
  MdLogin,
  MdLogout,
  MdOpenInNew,
  MdSearch,
  MdTableChart,
} from "react-icons/md";
import { clearAuthToken, isLoggedIn } from "../../auth/token";
import { logoutEnforced } from "../../clients/admin/sdk.gen";
import { adminClient } from "../../clients/config";
import { Link } from "../core/Link";
import { AppTooltip } from "./AppTooltip";
import { SidebarRailButton, sidebarRailControlClassName } from "./SidebarRail";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search", end: true },
  {
    to: "/tables",
    icon: <MdTableChart size={20} />,
    label: "Tables",
    end: true,
  },
  {
    to: "/data-catalog",
    icon: <MdAccountTree size={20} />,
    label: "Data catalog",
    end: false,
  },
];

const configuredProductionWeb = "https://leda.sao.ru";

function openCurrentPathOnOrigin(productionWebInput: string): void {
  const { origin } = new URL(productionWebInput);
  window.location.assign(
    `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function Navbar() {
  const navigate = useNavigate();
  const [footerOpen, setFooterOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const showOpenProductionButton = useMemo(() => {
    if (!configuredProductionWeb) {
      return false;
    }
    try {
      return window.location.origin !== new URL(configuredProductionWeb).origin;
    } catch {
      return false;
    }
  }, []);

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

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    try {
      await logoutEnforced({
        client: adminClient,
        body: {},
      });
    } finally {
      clearAuthToken();
      navigate("/login");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 pb-4 gap-2 bg-surface-2 z-20">
        {navItems.map((item) => (
          <AppTooltip key={item.to} content={item.label} placement="right">
            <NavLink
              to={item.to}
              end={item.end ?? true}
              className={({ isActive }) =>
                sidebarRailControlClassName(isActive)
              }
            >
              {item.icon}
            </NavLink>
          </AppTooltip>
        ))}

        <div className="mt-auto flex flex-col gap-2 items-center">
          {showOpenProductionButton ? (
            <AppTooltip
              content="Open this page on production"
              placement="right"
            >
              <SidebarRailButton
                onClick={() => openCurrentPathOnOrigin(configuredProductionWeb)}
              >
                <MdOpenInNew size={20} />
              </SidebarRailButton>
            </AppTooltip>
          ) : null}
          {isLoggedIn() ? (
            <AppTooltip content="Logout" placement="right">
              <SidebarRailButton onClick={handleLogout} disabled={loggingOut}>
                <MdLogout size={20} />
              </SidebarRailButton>
            </AppTooltip>
          ) : (
            <AppTooltip content="Login" placement="right">
              <NavLink
                to="/login"
                end
                className={({ isActive }) =>
                  sidebarRailControlClassName(isActive)
                }
              >
                <MdLogin size={20} />
              </NavLink>
            </AppTooltip>
          )}
          <ThemeSwitcher />
          <SidebarRailButton
            ref={infoButtonRef}
            active={footerOpen}
            onClick={() => setFooterOpen(!footerOpen)}
          >
            <MdInfo size={20} />
          </SidebarRailButton>
        </div>
      </nav>

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
