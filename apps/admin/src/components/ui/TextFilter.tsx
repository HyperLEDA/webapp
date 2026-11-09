import { ReactElement } from "react";
import { FilterShell, filterControlClassName } from "./FilterShell";

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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            onEnter();
          }
        }}
        placeholder={placeholder}
        className={`h-[1em] min-w-0 w-full appearance-none border-0 bg-transparent px-2 placeholder:text-muted focus:outline-none truncate ${filterControlClassName}`}
      />
    </FilterShell>
  );
}
