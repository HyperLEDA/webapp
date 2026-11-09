import { ReactElement } from "react";
import {
  FilterAutoWidth,
  FilterShell,
  filterControlClassName,
} from "./FilterShell";

interface NumberFilterProps {
  title?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  defaultValue?: string;
}

export function NumberFilter({
  title,
  value,
  onChange,
  placeholder,
  onEnter,
  defaultValue,
}: NumberFilterProps): ReactElement {
  const showClear = defaultValue !== undefined && value !== defaultValue;

  return (
    <FilterShell
      title={title}
      onClear={showClear ? () => onChange(defaultValue) : undefined}
    >
      <FilterAutoWidth text={value || placeholder || ""}>
        <input
          type="number"
          size={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              onEnter();
            }
          }}
          placeholder={placeholder}
          className={`h-[1em] w-full min-w-0 appearance-none border-0 bg-transparent px-2 placeholder:text-muted focus:outline-none truncate [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${filterControlClassName}`}
        />
      </FilterAutoWidth>
    </FilterShell>
  );
}
