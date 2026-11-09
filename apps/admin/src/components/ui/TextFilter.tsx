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
}

export function TextFilter({
  title,
  value,
  onChange,
  placeholder,
  onEnter,
}: TextFieldProps): ReactElement {
  return (
    <FilterShell title={title}>
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
