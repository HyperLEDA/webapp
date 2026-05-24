import { ReactElement } from "react";

interface TextFieldProps {
  title: string;
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
    <div>
      <label className="block text-sm font-medium text-subtle mb-1">
        {title}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            onEnter();
          }
        }}
        placeholder={placeholder}
        className="bg-surface-2 border border-border rounded px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent h-10 w-full"
      />
    </div>
  );
}
