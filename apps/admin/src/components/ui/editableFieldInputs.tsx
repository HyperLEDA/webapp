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

export interface EditableInputProps {
  draft: string;
  setDraft: (value: string) => void;
  commit: () => void;
  cancel: () => void;
  saving: boolean;
  inputClassName?: string;
}

export type EditableInputConfig =
  | { kind: "text" }
  | { kind: "number" }
  | { kind: "textarea"; rows?: number }
  | { kind: "json"; rows?: number }
  | { kind: "select"; options: { value: unknown; label: string }[] }
  | {
      kind: "reference";
      schema: string;
      table: string;
      fieldName: string;
    };

type KeyboardEventHandler = (
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void;

interface EditableFieldInputProps {
  input: EditableInputConfig;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  requirementLabel?: string;
  required?: boolean;
  onCommit?: () => void;
  onCancel?: () => void;
}

function inputClassName(className?: string): string {
  return classNames(
    "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm",
    className,
  );
}

function editableInputClassName(className?: string): string {
  return classNames(
    "w-full bg-transparent border border-border rounded px-2 py-0.5 text-primary flex-1 min-w-0",
    className,
  );
}

function RequirementFieldShell({
  label,
  required,
  children,
}: {
  label: string;
  required: boolean;
  children: ReactNode;
}): ReactElement {
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
      {children}
    </div>
  );
}

function handleCommitKeyDown(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  onCommit?: () => void,
): void {
  if (event.key === "Enter" && onCommit) {
    event.preventDefault();
    onCommit();
  }
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
        onKeyDown={onKeyDown}
        onFocus={() => scheduleOptionsLoad(value)}
      />
      {optionsError ? (
        <p className="mt-1 text-xs text-danger">{optionsError}</p>
      ) : null}
    </div>
  );
}

function renderInputControl({
  input,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  onCommit,
  onCancel,
  variant = "form",
}: {
  input: EditableInputConfig;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onCommit?: () => void;
  onCancel?: () => void;
  variant?: "form" | "editable";
}): ReactElement {
  const resolvedClassName =
    variant === "editable"
      ? editableInputClassName(className)
      : inputClassName(className);

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
      return;
    }
    handleCommitKeyDown(event, onCommit);
  }

  if (input.kind === "select") {
    return (
      <select
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.value);
          onCommit?.();
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

  if (input.kind === "reference") {
    return (
      <ReferenceAutocompleteInput
        fieldName={input.fieldName}
        value={value}
        onChange={onChange}
        schema={input.schema}
        table={input.table}
        disabled={disabled}
        autoFocus={autoFocus}
        className={resolvedClassName}
        onCommit={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  if (input.kind === "textarea" || input.kind === "json") {
    const rows = input.rows ?? (input.kind === "json" ? 4 : 3);

    return (
      <textarea
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key === "Enter" && event.metaKey && onCommit) {
            event.preventDefault();
            onCommit();
          }
        }}
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
      onKeyDown={handleKeyDown}
      className={resolvedClassName}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export function EditableFieldInput({
  input,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  className,
  requirementLabel,
  required = false,
  onCommit,
  onCancel,
}: EditableFieldInputProps): ReactElement {
  const control = renderInputControl({
    input,
    value,
    onChange,
    disabled,
    autoFocus,
    className,
    onCommit,
    onCancel,
    variant: "form",
  });

  if (!requirementLabel) {
    return control;
  }

  return (
    <RequirementFieldShell label={requirementLabel} required={required}>
      {control}
    </RequirementFieldShell>
  );
}

export function inputConfigForReferenceField(
  field: ReferenceFieldDescriptor,
  schema: string,
  table: string,
  rows?: number,
): EditableInputConfig {
  if (field.input.kind === "select") {
    return {
      kind: "select",
      options: field.input.options ?? [],
    };
  }

  if (field.input.kind === "reference") {
    return {
      kind: "reference",
      schema,
      table,
      fieldName: field.name,
    };
  }

  if (field.input.kind === "textarea") {
    return { kind: "textarea", rows };
  }

  if (field.input.kind === "json") {
    return { kind: "json", rows };
  }

  if (field.input.kind === "number") {
    return { kind: "number" };
  }

  return { kind: "text" };
}

function defaultTextareaRows(input: EditableInputConfig): number | undefined {
  if (input.kind === "json") {
    return 4;
  }
  if (input.kind === "textarea") {
    return 3;
  }
  return undefined;
}

function textareaRowsForDraft(
  input: EditableInputConfig,
  draft: string,
): number | undefined {
  if (input.kind !== "textarea" && input.kind !== "json") {
    return undefined;
  }

  const lineCount = draft.split("\n").length;
  return Math.max(defaultTextareaRows(input) ?? 3, lineCount);
}

export function renderEditableInput(
  input: EditableInputConfig,
  props: EditableInputProps,
): ReactElement {
  const resolvedInput =
    input.kind === "textarea" || input.kind === "json"
      ? { ...input, rows: textareaRowsForDraft(input, props.draft) }
      : input;

  return renderInputControl({
    input: resolvedInput,
    value: props.draft,
    onChange: props.setDraft,
    disabled: props.saving,
    autoFocus: true,
    className: props.inputClassName,
    onCommit: props.commit,
    onCancel: props.cancel,
    variant: "editable",
  });
}

export function createInputRenderer(
  input: EditableInputConfig,
): (props: EditableInputProps) => ReactElement {
  return (props) => renderEditableInput(input, props);
}

export function editableInputForReferenceField(
  field: ReferenceFieldDescriptor,
  schema: string,
  table: string,
): EditableInputConfig {
  return inputConfigForReferenceField(field, schema, table);
}
