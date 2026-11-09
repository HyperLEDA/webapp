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
      className={`relative inline-flex h-8 max-w-xs items-center rounded border border-border bg-surface-2 ${
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

interface FilterAutoWidthProps {
  text: string;
  endPad?: boolean;
  children: ReactNode;
}

export function FilterAutoWidth({
  text,
  endPad = false,
  children,
}: FilterAutoWidthProps): ReactElement {
  return (
    <div className="relative inline-block max-w-full min-w-0">
      <span
        aria-hidden="true"
        className={`invisible block whitespace-pre pl-2 ${
          endPad ? "pr-5" : "pr-2"
        } ${filterControlClassName}`}
      >
        {text || " "}
      </span>
      <div className="absolute inset-0 flex items-center">{children}</div>
    </div>
  );
}
