import classNames from "classnames";
import { KeyboardEvent, ReactElement, useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";
import { formatCaughtError } from "@leda/lib/tap";

export interface EditableInputProps {
  draft: string;
  setDraft: (value: string) => void;
  commit: () => void;
  cancel: () => void;
  saving: boolean;
  inputClassName?: string;
}

export interface EditableFieldType<T> {
  formatValue: (value: T) => string;
  parseDraft: (draft: string) => T;
  renderInput: (props: EditableInputProps) => ReactElement;
  formatDisplay?: (value: T) => string;
  isEmpty?: (value: T) => boolean;
  isUnchanged?: (draft: string, value: T) => boolean;
  trimOnCommit?: boolean;
  revertOnError?: boolean;
  emptyDisplayValue?: string;
  align?: "center" | "start";
}

function stringInput(props: EditableInputProps): ReactElement {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      props.commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      props.cancel();
    }
  }

  return (
    <input
      type="text"
      value={props.draft}
      onChange={(event) => props.setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      disabled={props.saving}
      className={classNames(
        "w-full bg-transparent border border-border rounded px-2 py-0.5 text-primary flex-1 min-w-0",
        props.inputClassName,
      )}
      autoFocus
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export const stringFieldType: EditableFieldType<string> = {
  formatValue: (value) => value,
  parseDraft: (draft) => draft,
  renderInput: stringInput,
  trimOnCommit: true,
  revertOnError: true,
};

interface EditableTextFieldSharedProps {
  editLabel: string;
  saving?: boolean;
  displayClassName?: string;
  inputClassName?: string;
  align?: "center" | "start";
  emptyDisplayValue?: string;
}

interface StringEditableTextFieldProps extends EditableTextFieldSharedProps {
  value: string;
  onCommit: (value: string) => void | Promise<void>;
  fieldType?: undefined;
  renderDisplay?: (value: string) => ReactElement;
}

interface TypedEditableTextFieldProps<T> extends EditableTextFieldSharedProps {
  value: T;
  onCommit: (value: T) => void | Promise<void>;
  fieldType: EditableFieldType<T>;
  renderDisplay?: (value: T) => ReactElement;
}

interface EditableTextFieldInnerProps<T> extends EditableTextFieldSharedProps {
  value: T;
  onCommit: (value: T) => void | Promise<void>;
  fieldType: EditableFieldType<T>;
  renderDisplay?: (value: T) => ReactElement;
}

function EditableTextFieldInner<T>({
  value,
  onCommit,
  editLabel,
  saving = false,
  fieldType,
  renderDisplay,
  displayClassName,
  inputClassName,
  align,
  emptyDisplayValue,
}: EditableTextFieldInnerProps<T>): ReactElement {
  const trimOnCommit = fieldType.trimOnCommit ?? true;
  const revertOnError = fieldType.revertOnError ?? true;
  const resolvedAlign = align ?? fieldType.align ?? "center";
  const resolvedEmptyDisplayValue =
    emptyDisplayValue ?? fieldType.emptyDisplayValue;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => fieldType.formatValue(value));
  const [error, setError] = useState<string | null>(null);

  function toDraft(nextValue: T): string {
    return fieldType.formatValue(nextValue);
  }

  function isValueEmpty(nextValue: T): boolean {
    if (fieldType.isEmpty) {
      return fieldType.isEmpty(nextValue);
    }
    return !fieldType.formatValue(nextValue);
  }

  function toDisplay(nextValue: T): string {
    if (isValueEmpty(nextValue) && resolvedEmptyDisplayValue) {
      return resolvedEmptyDisplayValue;
    }
    return fieldType.formatDisplay
      ? fieldType.formatDisplay(nextValue)
      : fieldType.formatValue(nextValue);
  }

  useEffect(() => {
    if (!editing) {
      setDraft(fieldType.formatValue(value));
      setError(null);
    }
  }, [value, editing, fieldType]);

  function startEdit(): void {
    setDraft(toDraft(value));
    setError(null);
    setEditing(true);
  }

  function cancelEdit(): void {
    setDraft(toDraft(value));
    setError(null);
    setEditing(false);
  }

  async function handleCommit(): Promise<void> {
    const nextDraft = trimOnCommit ? draft.trim() : draft;
    const shouldCommit = fieldType.isUnchanged
      ? !fieldType.isUnchanged(nextDraft, value)
      : nextDraft !== fieldType.formatValue(value);

    if (!shouldCommit) {
      setEditing(false);
      setError(null);
      return;
    }

    try {
      await onCommit(fieldType.parseDraft(nextDraft));
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(formatCaughtError(err));
      if (revertOnError) {
        setDraft(toDraft(value));
      }
    }
  }

  function defaultRender(nextValue: T): ReactElement {
    const displayValue = toDisplay(nextValue);

    return (
      <span
        className={classNames(
          displayClassName,
          isValueEmpty(nextValue) && resolvedEmptyDisplayValue && "text-muted",
        )}
      >
        {displayValue}
      </span>
    );
  }

  function renderValue(nextValue: T): ReactElement {
    if (isValueEmpty(nextValue) && resolvedEmptyDisplayValue) {
      return defaultRender(nextValue);
    }

    if (renderDisplay) {
      return renderDisplay(nextValue);
    }

    return defaultRender(nextValue);
  }

  if (editing) {
    return (
      <div className="min-w-0">
        {fieldType.renderInput({
          draft,
          setDraft,
          commit: () => void handleCommit(),
          cancel: cancelEdit,
          saving,
          inputClassName,
        })}
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={classNames(
        "group/editable flex gap-2 min-w-0",
        resolvedAlign === "start" ? "items-start" : "items-center",
      )}
    >
      <div className="min-w-0 flex-1">{renderValue(value)}</div>
      <button
        type="button"
        aria-label={editLabel}
        disabled={saving}
        className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer opacity-0 group-hover/editable:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
        onClick={(event) => {
          event.stopPropagation();
          startEdit();
        }}
      >
        <MdEdit className="w-4 h-4" />
      </button>
    </div>
  );
}

export function EditableTextField(
  props: StringEditableTextFieldProps,
): ReactElement;
export function EditableTextField<T>(
  props: TypedEditableTextFieldProps<T>,
): ReactElement;
export function EditableTextField<T>(
  props: StringEditableTextFieldProps | TypedEditableTextFieldProps<T>,
): ReactElement {
  if (props.fieldType) {
    return <EditableTextFieldInner {...props} fieldType={props.fieldType} />;
  }

  return (
    <EditableTextFieldInner
      value={props.value}
      onCommit={props.onCommit}
      editLabel={props.editLabel}
      saving={props.saving}
      renderDisplay={props.renderDisplay}
      displayClassName={props.displayClassName}
      inputClassName={props.inputClassName}
      align={props.align}
      emptyDisplayValue={props.emptyDisplayValue}
      fieldType={stringFieldType}
    />
  );
}
