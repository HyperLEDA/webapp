import type { ReferenceFieldDescriptor } from "../../clients/admin";
import type { FieldInputConfig, FieldOption } from "./FieldInput";
import {
  formatReferenceValue,
  parseDraftValue,
  type ReferenceValue,
} from "./referenceValues";
import type { EditableFieldProps } from "./EditableField";

export function fieldInputForReferenceField(
  field: ReferenceFieldDescriptor,
  loadOptions?: (query: string) => Promise<FieldOption[]>,
): FieldInputConfig {
  if (field.input.kind === "select") {
    return {
      kind: "select",
      options: field.input.options ?? [],
    };
  }

  if (field.input.kind === "reference" && loadOptions) {
    return { kind: "autocomplete", loadOptions };
  }

  if (field.input.kind === "textarea") {
    return { kind: "textarea" };
  }

  if (field.input.kind === "json") {
    return { kind: "json" };
  }

  if (field.input.kind === "number") {
    return { kind: "number" };
  }

  return { kind: "text" };
}

export function referenceFieldProps(
  field: ReferenceFieldDescriptor,
  value: ReferenceValue | undefined,
  loadOptions: ((query: string) => Promise<FieldOption[]>) | undefined,
  onSave: (value: ReferenceValue) => void | Promise<void>,
  options?: { saving?: boolean },
): EditableFieldProps<ReferenceValue> {
  return {
    value: value ?? null,
    formatValue: formatReferenceValue,
    parseDraft: (draft) => parseDraftValue(field, draft),
    input: fieldInputForReferenceField(field, loadOptions),
    onSave,
    editLabel: `Edit ${field.name}`,
    saving: options?.saving,
    align: "start",
    emptyDisplayValue: "—",
    trimOnCommit: false,
    revertOnError: false,
    isEmpty: (nextValue) => formatReferenceValue(nextValue) === "",
    isUnchanged: (draft, nextValue) => {
      try {
        const parsed = parseDraftValue(field, draft);
        return JSON.stringify(parsed) === JSON.stringify(nextValue ?? null);
      } catch {
        return false;
      }
    },
    displayClassName:
      field.input.kind === "json"
        ? "font-mono whitespace-pre-wrap"
        : field.input.kind === "textarea"
          ? "whitespace-pre-wrap"
          : undefined,
  };
}
