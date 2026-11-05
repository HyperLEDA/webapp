import { formatApiError } from "@leda/lib/tap";

import {
  addData,
  createTable,
  type AddDataRequest,
  type ColumnDescription,
  type DataType,
} from "../clients/admin";
import { adminClient } from "../clients";
import type { ParsedRow } from "./types";

export const UPLOAD_BATCH_SIZE = 10_000;

const PREVIEW_ROW_LIMIT = 100;

export { PREVIEW_ROW_LIMIT };

export interface UploadTableInput {
  tableName: string;
  description: string;
  bibcode: string;
  datatype: DataType;
  columns: ColumnDescription[];
  rows: ParsedRow[];
  onProgress?: (completedBatches: number, totalBatches: number) => void;
}

function coerceValue(
  value: string,
  dataType: ColumnDescription["data_type"],
): string | number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  if (dataType === "integer" || dataType === "double") {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return value;
}

function coerceRow(
  row: ParsedRow,
  columns: ColumnDescription[],
): AddDataRequest["data"][number] {
  const item: AddDataRequest["data"][number] = {};
  for (const column of columns) {
    item[column.name] = coerceValue(row[column.name] ?? "", column.data_type);
  }
  return item;
}

async function uploadBatches(
  input: UploadTableInput,
  actionDescription: string,
  offset: number,
  completed: number,
  totalBatches: number,
): Promise<void> {
  if (offset >= input.rows.length) {
    return;
  }

  const response = await addData({
    client: adminClient,
    body: {
      table_name: input.tableName,
      data: input.rows
        .slice(offset, offset + UPLOAD_BATCH_SIZE)
        .map((row) => coerceRow(row, input.columns)),
      action_description: actionDescription,
    },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error) || "Failed to upload data");
  }

  const nextCompleted = completed + 1;
  input.onProgress?.(nextCompleted, totalBatches);
  await uploadBatches(
    input,
    actionDescription,
    offset + UPLOAD_BATCH_SIZE,
    nextCompleted,
    totalBatches,
  );
}

export async function uploadTable(input: UploadTableInput): Promise<void> {
  const actionDescription = `Upload table ${input.tableName}`;
  const created = await createTable({
    client: adminClient,
    body: {
      table_name: input.tableName,
      description: input.description,
      bibcode: input.bibcode,
      datatype: input.datatype,
      columns: input.columns,
      action_description: actionDescription,
    },
  });
  if (created.error) {
    throw new Error(formatApiError(created.error) || "Failed to create table");
  }

  await uploadBatches(
    input,
    actionDescription,
    0,
    0,
    Math.ceil(input.rows.length / UPLOAD_BATCH_SIZE),
  );
}
