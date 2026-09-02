import classNames from "classnames";
import {
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { SuggestibleInput } from "@leda/lib/ui";

const SEARCH_DEBOUNCE_MS = 300;

export interface FieldOption {
  value: string;
  label: string;
  description?: string | null;
}

export type FieldInputConfig =
  | { kind: "text" }
  | { kind: "number" }
  | { kind: "textarea"; rows?: number }
  | { kind: "json"; rows?: number }
  | { kind: "select"; options: { value: unknown; label: string }[] }
  | {
      kind: "autocomplete";
      loadOptions: (query: string) => Promise<FieldOption[]>;
    };

export interface FieldInputProps {
  input: FieldInputConfig;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  appearance?: "form" | "inline";
  onSave?: () => void;
  onCancel?: () => void;
  commitOnChange?: boolean;
}

function controlClassName(
  appearance: "form" | "inline",
  className?: string,
): string {
  return classNames(
    appearance === "inline"
      ? "w-full bg-transparent border border-border rounded px-2 py-0.5 text-primary flex-1 min-w-0"
      : "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm",
    className,
  );
}

function defaultTextareaRows(input: FieldInputConfig): number {
  if (input.kind === "json") {
    return 4;
  }
  if (input.kind === "textarea") {
    return 3;
  }
  return 3;
}

function textareaRowsForValue(input: FieldInputConfig, value: string): number {
  if (input.kind !== "textarea" && input.kind !== "json") {
    return defaultTextareaRows(input);
  }
  const lineCount = value.split("\n").length;
  return Math.max(input.rows ?? defaultTextareaRows(input), lineCount);
}

function handleSingleLineKeyDown(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  onSave?: () => void,
  onCancel?: () => void,
): void {
  if (event.key === "Escape" && onCancel) {
    event.preventDefault();
    onCancel();
    return;
  }
  if (event.key === "Enter" && onSave) {
    event.preventDefault();
    onSave();
  }
}

function handleMultilineKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onSave?: () => void,
  onCancel?: () => void,
): void {
  if (event.key === "Escape" && onCancel) {
    event.preventDefault();
    onCancel();
    return;
  }
  if (event.key === "Enter" && event.metaKey && onSave) {
    event.preventDefault();
    onSave();
  }
}

interface AutocompleteInputProps {
  loadOptions: (query: string) => Promise<FieldOption[]>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

function AutocompleteInput({
  loadOptions,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  onSave,
  onCancel,
}: AutocompleteInputProps): ReactElement {
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [options, setOptions] = useState<FieldOption[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      requestIdRef.current += 1;
    },
    [],
  );

  function scheduleOptionsLoad(query: string): void {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      void (async () => {
        try {
          const loaded = await loadOptions(query);
          if (requestId !== requestIdRef.current) {
            return;
          }
          setOptionsError(null);
          setOptions(loaded);
        } catch (err) {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setOptionsError(
            err instanceof Error ? err.message : "Failed to load options",
          );
          setOptions([]);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
  }

  function renderSuggestions(query: string): ReactNode[] {
    const needle = query.trim().toLowerCase();
    return options
      .filter((option) => {
        if (!needle) {
          return true;
        }
        return (
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle)
        );
      })
      .map((option) => (
        <button
          key={option.value}
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(option.value);
            onSave?.();
          }}
        >
          <div>{option.label}</div>
          {option.description ? (
            <div className="text-xs text-muted">{option.description}</div>
          ) : null}
        </button>
      ));
  }

  return (
    <div className="min-w-0">
      <SuggestibleInput
        value={value}
        onChange={(nextValue) => {
          onChange(nextValue);
          scheduleOptionsLoad(nextValue);
        }}
        getSuggestions={renderSuggestions}
        disabled={disabled}
        autoFocus={autoFocus}
        className={className}
        onKeyDown={(event) => handleSingleLineKeyDown(event, onSave, onCancel)}
        onFocus={() => scheduleOptionsLoad(value)}
      />
      {optionsError ? (
        <p className="mt-1 text-xs text-danger">{optionsError}</p>
      ) : null}
    </div>
  );
}

export function FieldInput({
  input,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  appearance = "form",
  onSave,
  onCancel,
  commitOnChange = false,
}: FieldInputProps): ReactElement {
  const resolvedClassName = controlClassName(appearance, className);

  if (input.kind === "select") {
    return (
      <select
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.value);
          if (commitOnChange) {
            onSave?.();
          }
        }}
        className={resolvedClassName}
        onClick={(event) => event.stopPropagation()}
      >
        <option value="">Select…</option>
        {input.options.map((option) => (
          <option key={String(option.value)} value={String(option.value ?? "")}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (input.kind === "autocomplete") {
    return (
      <AutocompleteInput
        loadOptions={input.loadOptions}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        className={resolvedClassName}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  if (input.kind === "textarea" || input.kind === "json") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={textareaRowsForValue(input, value)}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => handleMultilineKeyDown(event, onSave, onCancel)}
        className={classNames(resolvedClassName, "font-mono resize-y")}
        onClick={(event) => event.stopPropagation()}
      />
    );
  }

  return (
    <input
      type={input.kind === "number" ? "number" : "text"}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => handleSingleLineKeyDown(event, onSave, onCancel)}
      className={resolvedClassName}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

interface LabeledFieldInputProps extends FieldInputProps {
  label: string;
  required?: boolean;
}

export function LabeledFieldInput({
  label,
  required = false,
  ...props
}: LabeledFieldInputProps): ReactElement {
  return (
    <div className="min-w-0">
      <span
        className={classNames(
          "block mb-1 text-xs font-semibold whitespace-nowrap",
          required ? "text-warning" : "text-subtle",
        )}
      >
        {label}
      </span>
      <FieldInput {...props} />
    </div>
  );
}
