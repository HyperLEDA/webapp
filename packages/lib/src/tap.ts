import { tapSync } from "@hyperleda/lib/clients/backend";
import type {
  TapSyncResponse,
  ValidationError,
} from "@hyperleda/lib/clients/backend";
import { backendClient } from "@hyperleda/lib/clients";

export type TapCellValue = string | number;

export interface TapTableColumn {
  name: string;
}

export interface TapTableData {
  columns: TapTableColumn[];
  rows: Record<string, TapCellValue>[];
}

interface ApiErrorPayload {
  detail?: ValidationError[];
}

export const DEFAULT_SQL_EXAMPLE =
  "SELECT * FROM layer2.designations WHERE pgc = 67872";

export function formatCaughtError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function describeUnknownError(
  error: string | ApiErrorPayload | ValidationError[] | null | undefined,
): string {
  if (error === null || error === undefined) {
    return String(error);
  }
  if (Object(error) !== error) {
    return String(error);
  }
  return JSON.stringify(error);
}

export function formatApiError(
  error: string | ApiErrorPayload | ValidationError[] | null | undefined,
): string {
  if (error === null || error === undefined) {
    return "Unknown error";
  }
  if (Array.isArray(error)) {
    return error.length
      ? error.map((entry) => entry.msg).join(", ")
      : JSON.stringify(error);
  }
  if (Object(error) !== error) {
    return String(error);
  }
  // SAFETY: Remaining errors are API payloads after array and primitive checks.
  const payload = error as ApiErrorPayload;
  if (payload.detail?.length) {
    return payload.detail.map((entry) => entry.msg).join(", ");
  }
  return JSON.stringify(payload);
}

export async function executeSqlQuery(sql: string): Promise<TapSyncResponse> {
  const response = await tapSync({
    client: backendClient,
    query: { query: sql },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  return response.data.data;
}

type TapJsonCell = string | number | boolean | null;

function isTapNumber(value: string | number | boolean): value is number {
  return Number.isFinite(value);
}

export function cellValue(
  value: string | number | boolean | null | undefined,
): TapCellValue {
  if (value === null || value === undefined) {
    return "—";
  }
  if (isTapNumber(value)) {
    return value;
  }
  return String(value);
}

export function syncPayloadToTable(payload: TapSyncResponse): TapTableData {
  const syncTable = payload.resource.table;
  const syncColumns = syncTable.columns;
  const columns: TapTableColumn[] = syncColumns.map((c) => ({ name: c.name }));
  const rows = syncTable.data.map((row) => {
    const out: Record<string, TapCellValue> = {};
    for (let i = 0; i < syncColumns.length; i++) {
      // SAFETY: TAP sync rows contain JSON scalar cell values.
      const raw = row[i] as TapJsonCell | undefined;
      out[syncColumns[i].name] = cellValue(raw);
    }
    return out;
  });
  return { columns, rows };
}

export function defaultSelectForTable(tableName: string, limit = 25): string {
  return `SELECT * FROM ${tableName} LIMIT ${limit}`;
}

export function parseSqlPermalink(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
