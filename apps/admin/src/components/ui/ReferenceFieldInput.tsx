import classNames from "classnames";
import {
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReferenceFieldDescriptor } from "../../clients/admin";
import { listReferenceFieldOptions } from "../../clients/admin";
import { adminClient } from "../../clients";
import { SuggestibleInput } from "@leda/lib/ui";
import { formatApiError } from "@leda/lib/tap";

const SEARCH_DEBOUNCE_MS = 300;
const OPTION_PAGE_SIZE = 10;

interface ReferenceFieldInputProps {
  field: ReferenceFieldDescriptor;
  value: string;
  onChange: (value: string) => void;
  schema: string;
  table: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onCommit?: () => void;
}

function inputClassName(className?: string): string {
  return classNames(
    "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm",
    className,
  );
}

interface ReferenceAutocompleteInputProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  schema: string;
  table: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onCommit?: () => void;
  onKeyDown?: KeyboardEventHandler;
}

type KeyboardEventHandler = (
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void;

function ReferenceAutocompleteInput({
  fieldName,
  value,
  onChange,
  schema,
  table,
  disabled = false,
  autoFocus = false,
  className,
  onCommit,
  onKeyDown,
}: ReferenceAutocompleteInputProps): ReactElement {
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [options, setOptions] = useState<
    { value: string; label: string; description?: string | null }[]
  >([]);
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
        const response = await listReferenceFieldOptions({
          client: adminClient,
          path: { schema, table, field: fieldName },
          query: {
            query: query.trim() || undefined,
            page: 0,
            page_size: OPTION_PAGE_SIZE,
          },
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (response.error) {
          setOptionsError(formatApiError(response.error));
          setOptions([]);
          return;
        }

        setOptionsError(null);
        setOptions(
          response.data.data.items.map((item) => ({
            value: String(item.value ?? ""),
            label: item.label,
            description: item.description,
          })),
        );
      })();
    }, SEARCH_DEBOUNCE_MS);
  }

  function renderSuggestions(query: string): ReactNode[] {
    return options
      .filter((option) => {
        if (!query.trim()) {
          return true;
        }
        const needle = query.trim().toLowerCase();
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
            onCommit?.();
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
    <div className="min-w-48">
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
        onKeyDown={onKeyDown}
        onFocus={() => scheduleOptionsLoad(value)}
      />
      {optionsError ? (
        <p className="mt-1 text-xs text-danger">{optionsError}</p>
      ) : null}
    </div>
  );
}

export function ReferenceFieldInput({
  field,
  value,
  onChange,
  schema,
  table,
  disabled = false,
  autoFocus = false,
  className,
  onCommit,
}: ReferenceFieldInputProps): ReactElement {
  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    if (event.key === "Enter" && onCommit) {
      event.preventDefault();
      onCommit();
    }
  }

  if (field.input.kind === "select") {
    const selectOptions = field.input.options ?? [];

    return (
      <select
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.value);
          onCommit?.();
        }}
        className={inputClassName(className)}
      >
        <option value="">Select…</option>
        {selectOptions.map((option) => (
          <option key={String(option.value)} value={String(option.value ?? "")}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.input.kind === "reference") {
    return (
      <ReferenceAutocompleteInput
        fieldName={field.name}
        value={value}
        onChange={onChange}
        schema={schema}
        table={table}
        disabled={disabled}
        autoFocus={autoFocus}
        className={className}
        onCommit={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  if (field.input.kind === "textarea" || field.input.kind === "json") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={field.input.kind === "json" ? 4 : 3}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.metaKey && onCommit) {
            event.preventDefault();
            onCommit();
          }
        }}
        className={classNames(inputClassName(className), "font-mono resize-y")}
      />
    );
  }

  return (
    <input
      type={field.input.kind === "number" ? "number" : "text"}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      className={inputClassName(className)}
    />
  );
}
