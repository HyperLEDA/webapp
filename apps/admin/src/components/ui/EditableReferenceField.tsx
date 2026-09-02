import classNames from "classnames";
import {
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MdEdit, MdKeyboardArrowDown } from "react-icons/md";
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

interface CollapsibleReferenceDisplayProps {
  displayValue: string;
}

function CollapsibleReferenceDisplay({
  displayValue,
}: CollapsibleReferenceDisplayProps): ReactElement {
  const contentRef = useRef<HTMLPreElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setIsCollapsible(false);
  }, [displayValue]);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || expanded) {
      return;
    }

    function updateOverflow(): void {
      const current = contentRef.current;
      if (!current) {
        return;
      }
      const overflowing = current.scrollHeight > current.clientHeight + 1;
      setIsOverflowing(overflowing);
      setIsCollapsible(overflowing);
    }

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [displayValue, expanded]);

  function handleExpand(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setExpanded(true);
  }

  function handleCollapse(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setExpanded(false);
  }

  const showExpandControls = !expanded && isOverflowing;

  return (
    <div className="relative min-w-0 flex-1">
      <pre
        ref={contentRef}
        className={classNames(
          "min-w-0 whitespace-pre-wrap break-words text-sm",
          !expanded && "line-clamp-5",
          displayValue === "—" && "text-muted",
        )}
      >
        {displayValue}
      </pre>
      {showExpandControls ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent"
          />
          <button
            type="button"
            aria-label="Expand cell"
            className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface-2 p-0.5 text-muted hover:text-primary cursor-pointer"
            onClick={handleExpand}
          >
            <MdKeyboardArrowDown className="w-4 h-4" aria-hidden />
          </button>
        </>
      ) : null}
      {expanded && isCollapsible ? (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            aria-label="Collapse cell"
            className="flex rounded-full border border-border bg-surface-2 p-0.5 text-muted hover:text-primary cursor-pointer"
            onClick={handleCollapse}
          >
            <MdKeyboardArrowDown className="w-4 h-4 rotate-180" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function defaultTextareaRows(field: ReferenceFieldDescriptor): number {
  return field.input.kind === "json" ? 4 : 3;
}

function textareaRowsForDraft(
  field: ReferenceFieldDescriptor,
  draft: string,
): number | undefined {
  if (field.input.kind !== "textarea" && field.input.kind !== "json") {
    return undefined;
  }

  const lineCount = draft.split("\n").length;
  return Math.max(defaultTextareaRows(field), lineCount);
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

  function startEdit(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="min-w-0" onKeyDown={handleKeyDown}>
        <ReferenceFieldInput
          field={field}
          value={draft}
          onChange={setDraft}
          schema={schema}
          table={table}
          disabled={saving}
          autoFocus
          rows={textareaRowsForDraft(field, draft)}
          onCommit={() => void commitEdit()}
        />
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  const displayValue = formatReferenceDisplay(value);

  return (
    <div className="group/editable flex items-start gap-2 min-w-0">
      <CollapsibleReferenceDisplay displayValue={displayValue} />
      <button
        type="button"
        aria-label={`Edit ${field.name}`}
        disabled={saving}
        className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer opacity-0 group-hover/editable:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
        onClick={startEdit}
      >
        <MdEdit className="w-4 h-4" />
      </button>
    </div>
  );
}
