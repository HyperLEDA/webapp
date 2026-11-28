import { tapSync } from "@leda/lib/clients/backend";
import type { TapSyncResponse } from "@leda/lib/clients/backend";
import { backendClient } from "@leda/lib/clients";
import { formatApiError } from "./apiError";

export {
  describeUnknownError,
  formatApiError,
  formatCaughtError,
} from "./apiError";

export type TapCellValue = string | number;

export interface TapTableColumn {
  name: string;
}

export interface TapTableData {
  columns: TapTableColumn[];
  rows: Record<string, TapCellValue>[];
}

export const DEFAULT_SQL_EXAMPLE =
  "SELECT * FROM layer2.designations WHERE pgc = 67872";

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
