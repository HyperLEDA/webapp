import { ReactElement, ReactNode, Ref } from "react";

export const filterControlClassName = "text-sm leading-none text-primary";

interface FilterShellProps {
  title?: string;
  disabled?: boolean;
  children: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
}

export function FilterShell({
  title,
  disabled = false,
  children,
  containerRef,
}: FilterShellProps): ReactElement {
  return (
    <div
      ref={containerRef}
      className={`relative inline-flex h-8 min-w-[10rem] max-w-xs items-center overflow-hidden rounded border border-border bg-surface-2 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {title ? (
        <span
          className={`shrink-0 border-r border-border px-2 whitespace-nowrap ${filterControlClassName}`}
        >
          {title}
        </span>
      ) : null}
      {children}
    </div>
  );
}
