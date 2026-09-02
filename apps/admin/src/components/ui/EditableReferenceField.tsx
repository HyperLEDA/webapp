import { KeyboardEvent, ReactElement, useMemo } from "react";
import type { ReferenceFieldDescriptor } from "../../clients/admin";
import { EditableFieldType, EditableTextField } from "./EditableTextField";
import { ReferenceFieldInput } from "./ReferenceFieldInput";
import {
  formatReferenceValue,
  parseDraftValue,
  type ReferenceValue,
} from "./referenceValues";

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

function handleEscapeKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  cancel: () => void,
): void {
  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
}

export function referenceFieldType(
  field: ReferenceFieldDescriptor,
  schema: string,
  table: string,
): EditableFieldType<ReferenceValue> {
  return {
    formatValue: (value) => formatReferenceValue(value),
    parseDraft: (draft) => parseDraftValue(field, draft),
    trimOnCommit: false,
    revertOnError: false,
    emptyDisplayValue: "—",
    align: "start",
    isEmpty: (value) => formatReferenceValue(value) === "",
    isUnchanged: (draft, value) => {
      try {
        const parsed = parseDraftValue(field, draft);
        return JSON.stringify(parsed) === JSON.stringify(value ?? null);
      } catch {
        return false;
      }
    },
    renderInput: ({ draft, setDraft, commit, cancel, saving }) => (
      <div onKeyDown={(event) => handleEscapeKeyDown(event, cancel)}>
        <ReferenceFieldInput
          field={field}
          value={draft}
          onChange={setDraft}
          schema={schema}
          table={table}
          disabled={saving}
          autoFocus
          rows={textareaRowsForDraft(field, draft)}
          onCommit={commit}
        />
      </div>
    ),
  };
}

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
  const fieldType = useMemo(
    () => referenceFieldType(field, schema, table),
    [field, schema, table],
  );

  return (
    <EditableTextField<ReferenceValue>
      value={value ?? null}
      fieldType={fieldType}
      editLabel={`Edit ${field.name}`}
      saving={saving}
      onCommit={onCommit}
    />
  );
}
