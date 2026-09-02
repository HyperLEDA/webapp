import {
  KeyboardEventHandler,
  FocusEventHandler,
  ReactElement,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import classNames from "classnames";

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface SuggestibleInputProps {
  value: string;
  onChange: (value: string) => void;
  getSuggestions: (value: string) => ReactNode[];
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
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
  autoFocus,
  className,
  onKeyDown,
  onFocus,
  onBlur,
}: SuggestibleInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);
  const suggestions = getSuggestions(value);
  const showSuggestions = focused && suggestions.length > 0;

  useLayoutEffect(() => {
    if (!showSuggestions) {
      setDropdownPosition(null);
      return;
    }

    function updatePosition(): void {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      const rect = input.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showSuggestions, value]);

  return (
    <div className="relative w-full min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={classNames(
          "bg-surface-2 border border-border rounded px-3 py-2 w-full text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          className,
        )}
      />
      {showSuggestions && dropdownPosition ? (
        <ul
          className="fixed z-50 max-h-60 overflow-auto rounded border border-border bg-surface shadow-sm divide-y divide-border"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
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
