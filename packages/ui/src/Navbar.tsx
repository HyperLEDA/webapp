import type { ReactElement, ReactNode } from "react";

export type NavbarTone = "web" | "admin";

const toneClassName: Record<NavbarTone, string> = {
  web: "bg-surface-2",
  admin: "navbar-tone-admin",
};

export function Navbar({
  tone,
  children,
  footer,
}: {
  tone: NavbarTone;
  children?: ReactNode;
  footer?: ReactNode;
}): ReactElement {
  return (
    <nav
      className={`fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 pb-4 gap-2 z-20 ${toneClassName[tone]}`}
    >
      {children}
      {footer ? (
        <div className="mt-auto flex flex-col gap-2 items-center">{footer}</div>
      ) : null}
    </nav>
  );
}
