import type { ColumnDescription } from "../clients/admin";

export type ParsedRow = Record<string, string>;

export interface ParseResult {
  columns: string[];
  rows: ParsedRow[];
  columnDescriptions?: ColumnDescription[];
}

export interface ParseOptions {
  truncate?: number;
}
