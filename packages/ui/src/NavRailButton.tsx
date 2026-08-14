import { forwardRef, type ButtonHTMLAttributes } from "react";
import { navRailControlClassName } from "./navRail";

export const NavRailButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function NavRailButton({ active = false, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={
        className
          ? `${navRailControlClassName(active)} ${className}`
          : navRailControlClassName(active)
      }
      {...rest}
    />
  );
});
