import type {
  CreateReferenceRowRequest,
  ReferenceFieldDescriptor,
} from "../../clients/admin";

export type ReferenceValue = CreateReferenceRowRequest["row"][string];

export function formatReferenceValue(
  value: ReferenceValue | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value, null, 2);
  }
  if (Object(value) === value) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function formatReferenceDisplay(
  value: ReferenceValue | undefined,
): string {
  const formatted = formatReferenceValue(value);
  return formatted || "—";
}

function parseNumberValue(
  field: ReferenceFieldDescriptor,
  trimmed: string,
): number {
  if (field.data_type === "float") {
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error(`Field '${field.name}' must be a number`);
    }
    return parsed;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Field '${field.name}' must be an integer`);
  }
  return parsed;
}

function parseJsonDraft(trimmed: string, fieldName: string): ReferenceValue {
  try {
    // SAFETY: JSON.parse is typed as any; ReferenceValue is the JSON-compatible cell union on reference row payloads.
    return JSON.parse(trimmed) as ReferenceValue;
  } catch {
    throw new Error(`Field '${fieldName}' must contain valid JSON`);
  }
}

export function parseDraftValue(
  field: ReferenceFieldDescriptor,
  draft: string,
): ReferenceValue {
  const trimmed = draft.trim();

  if (trimmed === "") {
    if (field.nullable) {
      return null;
    }
    if (field.required) {
      throw new Error(`Field '${field.name}' is required`);
    }
    throw new Error(`Field '${field.name}' cannot be empty`);
  }

  if (
    field.input.kind === "number" ||
    (field.input.kind === "reference" &&
      ["float", "int", "long"].includes(field.data_type))
  ) {
    return parseNumberValue(field, trimmed);
  }

  if (field.input.kind === "json") {
    return parseJsonDraft(trimmed, field.name);
  }

  if (field.input.kind === "select") {
    const option = field.input.options?.find(
      (entry) => String(entry.value) === trimmed,
    );
    if (!option) {
      throw new Error(`Field '${field.name}' has an invalid option`);
    }
    return option.value;
  }

  return trimmed;
}

export function buildCreateRowPayload(
  fields: ReferenceFieldDescriptor[],
  drafts: Record<string, string>,
  touched: Set<string>,
) {
  const row: CreateReferenceRowRequest["row"] = {};

  for (const field of fields) {
    const draft = drafts[field.name] ?? "";
    const wasTouched = touched.has(field.name);

    if (!wasTouched && !field.required) {
      continue;
    }

    row[field.name] = parseDraftValue(field, draft);
  }

  return row;
}

export function referenceTableKey(schema: string, table: string): string {
  return `${schema}.${table}`;
}

export function fieldRequirementLabel(field: ReferenceFieldDescriptor): string {
  return field.required ? "Required" : "Optional";
}
