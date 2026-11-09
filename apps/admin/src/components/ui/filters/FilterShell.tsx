import { ReactElement, ReactNode, Ref } from "react";
import { MdClose } from "react-icons/md";

export const filterControlClassName = "text-sm leading-none text-primary";

interface FilterShellProps {
  title?: string;
  disabled?: boolean;
  onClear?: () => void;
  children: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
}

export function FilterShell({
  title,
  disabled = false,
  onClear,
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
      {onClear ? (
        <button
          type="button"
          aria-label="Clear filter"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
          className="shrink-0 flex items-center justify-center pr-1.5 text-muted hover:text-primary disabled:cursor-not-allowed"
        >
          <MdClose className="w-3.5 h-3.5" />
        </button>
      ) : null}
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
        className={`invisible flex items-center whitespace-pre px-2 ${
          endPad ? "gap-2" : ""
        } ${filterControlClassName}`}
      >
        <span>{text || " "}</span>
        {endPad ? <span className="text-xs">▾</span> : null}
      </span>
      <div className="absolute inset-0 flex items-center">{children}</div>
    </div>
  );
}
