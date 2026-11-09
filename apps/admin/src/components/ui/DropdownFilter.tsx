import { ReactElement } from "react";
import { FilterShell, filterControlClassName } from "./FilterShell";

interface DropdownFilterOption {
  value: string;
  label?: string;
}

interface DropdownFilterProps {
  title: string;
  options: DropdownFilterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DropdownFilter({
  title,
  options,
  value,
  onChange,
  disabled = false,
}: DropdownFilterProps): ReactElement {
  return (
    <FilterShell title={title} disabled={disabled}>
      <div className="relative min-w-0 flex-1">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[1em] w-full appearance-none border-0 bg-transparent py-0 pr-5 pl-2 focus:outline-none ${filterControlClassName} ${
            disabled ? "cursor-not-allowed" : ""
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label || option.value}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-xs text-subtle"
        >
          ▾
        </span>
      </div>
    </FilterShell>
  );
}
