import { ReactElement } from "react";

interface DropdownFilterOption {
  value: string;
  label?: string;
}

interface DropdownFilterProps {
  title: string;
  options: DropdownFilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function DropdownFilter({
  title,
  options,
  value,
  onChange,
}: DropdownFilterProps): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-subtle mb-1">
        {title}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-2 border border-border rounded px-3 py-2 text-primary h-10 w-full"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label || option.value}
          </option>
        ))}
      </select>
    </div>
  );
}
