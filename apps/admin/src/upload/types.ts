export type ParsedRow = Record<string, string>;

export interface ParseResult {
  columns: string[];
  rows: ParsedRow[];
}

export interface ParseOptions {
  truncate?: number;
}
