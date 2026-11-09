import { ReactElement } from "react";
import {
  FilterAutoWidth,
  FilterShell,
  filterControlClassName,
} from "./FilterShell";

interface TextFieldProps {
  title?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  defaultValue?: string;
}

export function TextFilter({
  title,
  value,
  onChange,
  placeholder,
  onEnter,
  defaultValue,
}: TextFieldProps): ReactElement {
  const showClear = defaultValue !== undefined && value !== defaultValue;

  return (
    <FilterShell
      title={title}
      onClear={showClear ? () => onChange(defaultValue) : undefined}
    >
      <FilterAutoWidth text={value || placeholder || ""}>
        <input
          size={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              onEnter();
            }
          }}
          placeholder={placeholder}
          className={`h-[1em] w-full min-w-0 appearance-none border-0 bg-transparent px-2 placeholder:text-muted focus:outline-none truncate ${filterControlClassName}`}
        />
      </FilterAutoWidth>
    </FilterShell>
  );
}
