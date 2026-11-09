import { ReactElement } from "react";
import {
  FilterAutoWidth,
  FilterShell,
  filterControlClassName,
} from "./FilterShell";

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
  defaultValue?: string;
}

export function DropdownFilter({
  title,
  options,
  value,
  onChange,
  disabled = false,
  defaultValue,
}: DropdownFilterProps): ReactElement {
  const selected =
    options.find((option) => option.value === value)?.label || value;
  const showClear =
    defaultValue !== undefined && value !== defaultValue && !disabled;

  return (
    <FilterShell
      title={title}
      disabled={disabled}
      onClear={showClear ? () => onChange(defaultValue) : undefined}
    >
      <FilterAutoWidth text={selected} endPad>
        <div className="relative w-full min-w-0">
          <select
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`h-[1em] w-full min-w-0 appearance-none border-0 bg-transparent py-0 pr-5 pl-2 focus:outline-none ${filterControlClassName} ${
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
      </FilterAutoWidth>
    </FilterShell>
  );
}
