import classNames from "classnames";
import { ReactElement, useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";
import { formatCaughtError } from "@leda/lib/tap";
import { FieldInput, type FieldInputConfig } from "./FieldInput";

export interface EditableFieldProps<T> {
  value: T;
  formatValue: (value: T) => string;
  parseDraft: (draft: string) => T;
  input: FieldInputConfig;
  onSave: (value: T) => void | Promise<void>;
  editLabel: string;
  saving?: boolean;
  displayClassName?: string;
  inputClassName?: string;
  align?: "center" | "start";
  emptyDisplayValue?: string;
  renderDisplay?: (value: T) => ReactElement;
  trimOnCommit?: boolean;
  revertOnError?: boolean;
  isEmpty?: (value: T) => boolean;
  isUnchanged?: (draft: string, value: T) => boolean;
}

export interface StringEditableFieldProps extends Omit<
  EditableFieldProps<string>,
  "formatValue" | "parseDraft" | "input"
> {
  input?: FieldInputConfig;
}

function multilineSaveShortcutLabel(): string {
  if (!("navigator" in globalThis)) {
    return "Ctrl+Enter";
  }
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘↵" : "Ctrl+Enter";
}

function EditableFieldInner<T>({
  value,
  formatValue,
  parseDraft,
  input,
  onSave,
  editLabel,
  saving = false,
  displayClassName,
  inputClassName,
  align = "center",
  emptyDisplayValue,
  renderDisplay,
  trimOnCommit = true,
  revertOnError = true,
  isEmpty,
  isUnchanged,
}: EditableFieldProps<T>): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatValue(value));
  const [error, setError] = useState<string | null>(null);
  const multilineSaveShortcut = multilineSaveShortcutLabel();

  function valueIsEmpty(nextValue: T): boolean {
    if (isEmpty) {
      return isEmpty(nextValue);
    }
    return !formatValue(nextValue);
  }

  function toDisplay(nextValue: T): string {
    if (valueIsEmpty(nextValue) && emptyDisplayValue) {
      return emptyDisplayValue;
    }
    return formatValue(nextValue);
  }

  useEffect(() => {
    if (!editing) {
      setDraft(formatValue(value));
      setError(null);
    }
  }, [value, editing, formatValue]);

  function startEdit(): void {
    setDraft(formatValue(value));
    setError(null);
    setEditing(true);
  }

  function cancelEdit(): void {
    setDraft(formatValue(value));
    setError(null);
    setEditing(false);
  }

  async function handleSave(): Promise<void> {
    const nextDraft = trimOnCommit ? draft.trim() : draft;
    const changed = isUnchanged
      ? !isUnchanged(nextDraft, value)
      : nextDraft !== formatValue(value);

    if (!changed) {
      setEditing(false);
      setError(null);
      return;
    }

    try {
      await onSave(parseDraft(nextDraft));
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(formatCaughtError(err));
      if (revertOnError) {
        setDraft(formatValue(value));
      }
    }
  }

  function defaultRender(nextValue: T): ReactElement {
    return (
      <span
        className={classNames(
          displayClassName,
          valueIsEmpty(nextValue) && emptyDisplayValue && "text-muted",
        )}
      >
        {toDisplay(nextValue)}
      </span>
    );
  }

  function renderValue(nextValue: T): ReactElement {
    if (valueIsEmpty(nextValue) && emptyDisplayValue) {
      return defaultRender(nextValue);
    }
    if (renderDisplay) {
      return renderDisplay(nextValue);
    }
    return defaultRender(nextValue);
  }

  if (editing) {
    const saveShortcut =
      input.kind === "textarea" || input.kind === "json"
        ? multilineSaveShortcut
        : "↵";

    return (
      <div className="min-w-0">
        <FieldInput
          input={input}
          value={draft}
          onChange={setDraft}
          disabled={saving}
          autoFocus
          appearance="inline"
          className={inputClassName}
          onSave={() => void handleSave()}
          onCancel={cancelEdit}
          commitOnChange={input.kind === "select"}
        />
        {input.kind !== "select" ? (
          <div className="mt-1 flex gap-2 text-xs text-muted">
            <span className="flex items-center gap-0.5">
              {saveShortcut} save
            </span>
            <span className="flex items-center gap-0.5">Esc cancel</span>
          </div>
        ) : null}
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={classNames(
        "group/editable flex gap-2 min-w-0",
        align === "start" ? "items-start" : "items-center",
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

export function EditableField<T>(props: EditableFieldProps<T>): ReactElement;
export function EditableField(props: StringEditableFieldProps): ReactElement;
export function EditableField<T>(
  props: EditableFieldProps<T> | StringEditableFieldProps,
): ReactElement {
  if ("parseDraft" in props) {
    return <EditableFieldInner {...props} />;
  }

  return (
    <EditableFieldInner
      value={props.value}
      formatValue={(v) => v}
      parseDraft={(d) => d}
      input={props.input ?? { kind: "text" }}
      onSave={props.onSave}
      editLabel={props.editLabel}
      saving={props.saving}
      displayClassName={props.displayClassName}
      inputClassName={props.inputClassName}
      align={props.align}
      emptyDisplayValue={props.emptyDisplayValue}
      renderDisplay={props.renderDisplay}
      trimOnCommit={props.trimOnCommit ?? true}
      revertOnError={props.revertOnError ?? true}
      isEmpty={props.isEmpty}
      isUnchanged={props.isUnchanged}
    />
  );
}
