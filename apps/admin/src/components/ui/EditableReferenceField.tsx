import classNames from "classnames";
import { KeyboardEvent, ReactElement, useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";
import type { ReferenceFieldDescriptor } from "../../clients/admin";
import {
  formatReferenceDisplay,
  parseDraftValue,
  type ReferenceValue,
} from "./referenceValues";
import { ReferenceFieldInput } from "./ReferenceFieldInput";

interface EditableReferenceFieldProps {
  field: ReferenceFieldDescriptor;
  value: ReferenceValue | undefined;
  schema: string;
  table: string;
  saving?: boolean;
  onCommit: (value: ReferenceValue) => void | Promise<void>;
}

export function EditableReferenceField({
  field,
  value,
  schema,
  table,
  saving = false,
  onCommit,
}: EditableReferenceFieldProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatReferenceDisplay(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(formatReferenceDisplay(value));
      setError(null);
    }
  }, [value, editing]);

  function cancelEdit(): void {
    setDraft(formatReferenceDisplay(value));
    setError(null);
    setEditing(false);
  }

  async function commitEdit(): Promise<void> {
    try {
      const parsed = parseDraftValue(field, draft);
      const current = value ?? null;
      if (JSON.stringify(parsed) === JSON.stringify(current)) {
        setEditing(false);
        return;
      }
      await onCommit(parsed);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  if (editing) {
    return (
      <div className="min-w-48" onKeyDown={handleKeyDown}>
        <ReferenceFieldInput
          field={field}
          value={draft}
          onChange={setDraft}
          schema={schema}
          table={table}
          disabled={saving}
          autoFocus
          onCommit={() => void commitEdit()}
        />
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  const displayValue = formatReferenceDisplay(value);

  return (
    <div className="group/editable flex items-start gap-2 min-w-0">
      <pre
        className={classNames(
          "min-w-0 flex-1 whitespace-pre-wrap break-words text-sm",
          displayValue === "—" && "text-muted",
        )}
      >
        {displayValue}
      </pre>
      <button
        type="button"
        aria-label={`Edit ${field.name}`}
        disabled={saving}
        className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer opacity-0 group-hover/editable:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
        onClick={(event) => {
          event.stopPropagation();
          setEditing(true);
        }}
      >
        <MdEdit className="w-4 h-4" />
      </button>
    </div>
  );
}
