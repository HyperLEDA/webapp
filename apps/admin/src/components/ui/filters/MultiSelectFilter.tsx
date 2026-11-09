import { ReactElement, useEffect, useRef, useState } from "react";
import {
  FilterAutoWidth,
  FilterShell,
  filterControlClassName,
} from "./FilterShell";

interface MultiSelectFilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  title: string;
  placeholder?: string;
  options: MultiSelectFilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  defaultValue?: string[];
}

function sameValues(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function MultiSelectFilter({
  title,
  placeholder = "Status",
  options,
  values,
  onChange,
  defaultValue,
}: MultiSelectFilterProps): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (
        containerRef.current &&
        // SAFETY: `contains` expects a DOM Node; event targets inside the document are Nodes.
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  const summary =
    selectedLabels.length === 0 ? placeholder : selectedLabels.join(", ");
  const showClear =
    defaultValue !== undefined && !sameValues(values, defaultValue);

  function toggleValue(value: string): void {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <FilterShell
      title={title}
      containerRef={containerRef}
      onClear={showClear ? () => onChange(defaultValue) : undefined}
    >
      <FilterAutoWidth text={summary} endPad>
        <div className="relative w-full min-w-0">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((current) => !current)}
            className={`flex w-full min-w-0 items-center justify-between gap-2 border-0 bg-transparent px-2 text-left ${filterControlClassName}`}
          >
            <span
              className={`truncate ${selectedLabels.length === 0 ? "text-muted" : ""}`}
            >
              {summary}
            </span>
            <span aria-hidden="true" className="shrink-0 text-xs text-subtle">
              ▾
            </span>
          </button>
          {open ? (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="absolute top-full left-0 z-20 mt-1 min-w-full w-max rounded border border-border bg-surface-2 py-1 shadow-lg"
            >
              {options.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <label
                    key={option.value}
                    role="option"
                    aria-selected={checked}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-surface-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(option.value)}
                      className="rounded border-border"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </FilterAutoWidth>
    </FilterShell>
  );
}
