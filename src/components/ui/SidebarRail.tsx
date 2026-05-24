import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Tooltip } from "flowbite-react";

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

export function SidebarTooltip({
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
      className="bg-surface-2 z-10 backdrop-blur-sm bg-opacity-99 border border-border"
    >
      {children}
    </Tooltip>
  );
}
