import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import { AppTooltip } from "./AppTooltip";

function navRailControlClassName(active: boolean): string {
  return `w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 cursor-pointer ${
    active
      ? "bg-accent text-accent-fg"
      : "text-muted hover:bg-surface hover:text-primary"
  }`;
}

export function NavRail({
  children,
  footer,
}: {
  children?: ReactNode;
  footer?: ReactNode;
}): ReactElement {
  return (
    <nav className="fixed left-0 top-0 h-screen w-12 flex flex-col items-center pt-4 pb-4 gap-2 z-20 bg-surface-2">
      {children}
      {footer ? (
        <div className="mt-auto flex flex-col gap-2 items-center">{footer}</div>
      ) : null}
    </nav>
  );
}

export const NavButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; label: string }
>(function NavButton(
  { active = false, className, label, ...rest },
  ref,
): ReactElement {
  return (
    <AppTooltip content={label} placement="right">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={
          className
            ? `${navRailControlClassName(active)} ${className}`
            : navRailControlClassName(active)
        }
        {...rest}
      />
    </AppTooltip>
  );
});

export function NavItem({
  label,
  children,
  ...rest
}: {
  label: string;
  children?: ReactNode;
} & Omit<NavLinkProps, "className" | "children">): ReactElement {
  return (
    <AppTooltip content={label} placement="right">
      <NavLink
        aria-label={label}
        className={({ isActive }) => navRailControlClassName(isActive)}
        {...rest}
      >
        {children}
      </NavLink>
    </AppTooltip>
  );
}
