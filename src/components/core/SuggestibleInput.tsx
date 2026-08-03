import {
  KeyboardEventHandler,
  FocusEventHandler,
  ReactElement,
  ReactNode,
} from "react";
import classNames from "classnames";

interface SuggestibleInputProps {
  value: string;
  onChange: (value: string) => void;
  getSuggestions: (value: string) => ReactNode[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}

export function SuggestibleInput({
  value,
  onChange,
  getSuggestions,
  placeholder,
  disabled,
  className,
  onKeyDown,
  onFocus,
  onBlur,
}: SuggestibleInputProps): ReactElement {
  const suggestions = getSuggestions(value);

  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        className={classNames(
          "bg-surface-2 border border-border rounded px-3 py-2 w-full text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          className,
        )}
      />
      {suggestions.length > 0 ? (
        <ul
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded border border-border bg-surface shadow-sm divide-y divide-border"
          role="listbox"
        >
          {suggestions.map((node, index) => (
            <li key={index} role="option">
              {node}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
