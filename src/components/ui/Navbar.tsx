import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { NavLink } from "react-router-dom";
import { Tooltip } from "flowbite-react";
import {
  MdInfo,
  MdLogin,
  MdOpenInNew,
  MdSearch,
  MdTableChart,
} from "react-icons/md";
import { Link } from "../core/Link";

const navItems = [
  { to: "/", icon: <MdSearch size={20} />, label: "Object search" },
  { to: "/tables", icon: <MdTableChart size={20} />, label: "Tables" },
];

function SidebarTooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <Tooltip
      content={content}
      placement="right"
      arrow={false}
      className="bg-gray-600 z-10 backdrop-blur-sm bg-opacity-99 border-1"
    >
      {children}
    </Tooltip>
  );
}

function sidebarRailControlClassName(active: boolean): string {
  return `w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 cursor-pointer ${
    active
      ? "bg-[#646cff] text-white"
      : "text-neutral-400 hover:bg-neutral-700 hover:text-white"
  }`;
}

const SidebarRailButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function SidebarRailButton({ active = false, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={
        className
          ? `${sidebarRailControlClassName(active)} ${className}`
          : sidebarRailControlClassName(active)
      }
      {...rest}
    />
  );
});

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

  return (
    <>
      <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 pb-4 gap-2 bg-[#1a1a1a] z-20">
        {navItems.map((item) => (
          <SidebarTooltip key={item.to} content={item.label}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                sidebarRailControlClassName(isActive)
              }
            >
              {item.icon}
            </NavLink>
          </SidebarTooltip>
        ))}

        <div className="mt-auto flex flex-col gap-2 items-center">
          {showOpenProductionButton ? (
            <SidebarTooltip content="Open this page on production">
              <SidebarRailButton
                onClick={() => openCurrentPathOnOrigin(configuredProductionWeb)}
              >
                <MdOpenInNew size={20} />
              </SidebarRailButton>
            </SidebarTooltip>
          ) : null}
          <SidebarTooltip content="Login">
            <NavLink
              to="/login"
              end
              className={({ isActive }) =>
                sidebarRailControlClassName(isActive)
              }
            >
              <MdLogin size={20} />
            </NavLink>
          </SidebarTooltip>
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
