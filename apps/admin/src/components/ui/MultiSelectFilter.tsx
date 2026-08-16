import { ReactElement, useEffect, useRef, useState } from "react";

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
}

export function MultiSelectFilter({
  title,
  placeholder = "Status",
  options,
  values,
  onChange,
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
    selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder;

  function toggleValue(value: string): void {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div ref={containerRef} className="relative min-w-[10rem]">
      <label className="block text-sm font-medium text-subtle mb-1">
        {title}
      </label>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="bg-surface-2 border border-border rounded px-3 py-2 text-primary h-10 w-full text-left flex items-center justify-between gap-2"
      >
        <span className={selectedLabels.length === 0 ? "text-muted" : ""}>
          {summary}
        </span>
        <span aria-hidden="true" className="text-subtle text-xs">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 w-full bg-surface-2 border border-border rounded shadow-lg py-1"
        >
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <label
                key={option.value}
                role="option"
                aria-selected={checked}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-3 cursor-pointer text-primary"
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
  );
}
