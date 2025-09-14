import { ReactElement } from "react";

interface DropdownOption {
  value: string;
  label?: string;
}

interface DropdownProps {
  title: string;
  options: DropdownOption[];
  defaultValue: string;
  value: string;
  onChange: (value: string) => void;
}

export function Dropdown({
  title,
  options,
  value,
  onChange,
}: DropdownProps): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {title}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
