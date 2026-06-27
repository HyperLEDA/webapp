import classNames from "classnames";
import { KeyboardEvent, ReactElement, useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";

interface EditableTextFieldProps {
  value: string;
  onCommit: (value: string) => void | Promise<void>;
  renderDisplay?: (value: string) => ReactElement;
  editLabel: string;
  saving?: boolean;
  inputClassName?: string;
  displayClassName?: string;
}

export function EditableTextField({
  value,
  onCommit,
  renderDisplay,
  editLabel,
  saving = false,
  inputClassName,
  displayClassName,
}: EditableTextFieldProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  function startEdit(): void {
    setDraft(value);
    setEditing(true);
  }

  function cancelEdit(): void {
    setDraft(value);
    setEditing(false);
  }

  async function handleCommit(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }

    try {
      await onCommit(trimmed);
      setEditing(false);
    } catch {
      setDraft(value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCommit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  function defaultRender(displayValue: string): ReactElement {
    return <span className={displayClassName}>{displayValue}</span>;
  }

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={classNames(
          "w-full bg-transparent border border-border rounded px-2 py-0.5 text-primary flex-1 min-w-0",
          inputClassName,
        )}
        autoFocus
        onClick={(event) => event.stopPropagation()}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        {(renderDisplay ?? defaultRender)(value)}
      </div>
      <button
        type="button"
        aria-label={editLabel}
        className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer"
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
