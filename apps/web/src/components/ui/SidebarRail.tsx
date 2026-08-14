import { forwardRef, type ButtonHTMLAttributes } from "react";

export function sidebarRailControlClassName(active: boolean): string {
  return `w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 cursor-pointer ${
    active
      ? "bg-accent text-accent-fg"
      : "text-muted hover:bg-surface hover:text-primary"
  }`;
}

export const SidebarRailButton = forwardRef<
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
