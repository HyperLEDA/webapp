import { tapSync } from "../clients/backend/sdk.gen";
import type {
  TapSyncResponse,
  ValidationError,
} from "../clients/backend/types.gen";
import { backendClient } from "../clients/config";
import type { CellPrimitive, Column } from "../components/ui/CommonTable";

export const DEFAULT_SQL_EXAMPLE =
  "SELECT * FROM layer2.designations WHERE pgc = 67872";

export function formatApiError(error: unknown): string {
  const detail = (error as { detail?: ValidationError[] }).detail;
  if (detail?.length) {
    return detail.map((e) => e.msg).join(", ");
  }
  return JSON.stringify(error);
}

export async function executeSqlQuery(sql: string): Promise<TapSyncResponse> {
  const response = await tapSync({
    client: backendClient,
    query: { query: sql },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  if (!response.data?.data) {
    throw new Error("No data received from server");
  }
  return response.data.data;
}

export function cellValue(value: unknown): CellPrimitive {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return value;
  }
  return String(value);
}

export function syncPayloadToTable(payload: TapSyncResponse): {
  columns: Column[];
  rows: Record<string, CellPrimitive>[];
} {
  const syncTable = payload.resource.table;
  const syncColumns = syncTable.columns;
  const columns: Column[] = syncColumns.map((c) => ({ name: c.name }));
  const rows = (syncTable.data ?? []).map((row) => {
    const out: Record<string, CellPrimitive> = {};
    for (let i = 0; i < syncColumns.length; i++) {
      out[syncColumns[i].name] = cellValue(row[i]);
    }
    return out;
  });
  return { columns, rows };
}

export function defaultSelectForTable(tableName: string, limit = 25): string {
  return `SELECT * FROM ${tableName} LIMIT ${limit}`;
}

export function buildPhotometryTotalSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, pt.band
, cb.magsys
, pt.method
, b.waveref AS wavelength
, pt.mag
, pt.e_mag
, bib.code AS bibcode
FROM photometry.total AS pt
  JOIN layer0.records AS r ON pt.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
  JOIN photometry.calib_bands AS cb ON pt.band = cb.id
  JOIN photometry.bands AS b ON cb.band = b.id
WHERE r.pgc = ${pgc}`;
}

export function buildEquatorialSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, i.ra
, i.dec
, i.e_ra
, i.e_dec
, bib.code AS bibcode
FROM icrs.data AS i
  JOIN layer0.records AS r ON i.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
}

export function buildRedshiftSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, c.cz
, c.e_cz
, bib.code AS bibcode
FROM cz.data AS c
  JOIN layer0.records AS r ON c.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
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
