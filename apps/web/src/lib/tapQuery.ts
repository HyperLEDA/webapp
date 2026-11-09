import type { TapSyncResponse } from "@leda/lib/clients/backend";

const MAXREC = "50";

interface DachsColumn {
  name: string;
  datatype: string;
  arraysize?: string | null;
  unit?: string | null;
}

interface DachsTable {
  columns: DachsColumn[];
  data: unknown[][];
}

export function tapBaseUrl(backendBaseUrl: string): string {
  const hostname = new URL(backendBaseUrl).hostname;
  return `https://tap.${hostname}/tap`;
}

function parseDachsTable(text: string): DachsTable {
  const payload: DachsTable = JSON.parse(text);
  if (!Array.isArray(payload.columns) || !Array.isArray(payload.data)) {
    throw new Error("Unexpected TAP response");
  }
  return payload;
}

export function dachsJsonToSyncResponse(table: DachsTable): TapSyncResponse {
  return {
    resource: {
      name: "TAP Sync Result",
      table: {
        columns: table.columns.map((column) => ({
          name: column.name,
          datatype: column.datatype,
          arraysize: column.arraysize,
          unit: column.unit,
        })),
        data: table.data,
      },
    },
  };
}

export function queryStatusError(body: string): string | null {
  const infoPattern = /<INFO\b([^>]*)>([\s\S]*?)<\/INFO>/gi;
  for (const match of body.matchAll(infoPattern)) {
    const attrs = match[1];
    const text = match[2].trim();
    const name = /\bname=["']([^"']+)["']/i.exec(attrs)?.[1];
    const value = /\bvalue=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (name === "QUERY_STATUS" && value === "ERROR") {
      return text || "Query failed";
    }
  }
  return null;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

export async function queryTap(
  baseUrl: string,
  sql: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TapSyncResponse> {
  const body = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    QUERY: sql,
    MAXREC: MAXREC,
    FORMAT: "json",
  });
  const response = await fetchImpl(`${baseUrl}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      queryStatusError(text) ?? `TAP request failed (${response.status})`,
    );
  }
  if (isJsonResponse(response)) {
    return dachsJsonToSyncResponse(parseDachsTable(text));
  }
  const error = queryStatusError(text);
  if (error) {
    throw new Error(error);
  }
  throw new Error("Unexpected TAP response");
}
