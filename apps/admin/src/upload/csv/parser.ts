import type { ParseOptions, ParseResult, ParsedRow } from "../types";

export interface CsvConfig {
  separator: string;
  skipLines: number;
}

export function defaultCsvConfig(filename: string): CsvConfig {
  const separator = filename.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  return { separator, skipLines: 0 };
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function isBlankRecord(record: string[]): boolean {
  return record.every((cell) => cell.trim() === "");
}

function splitRecords(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (text.startsWith(separator, index)) {
      row.push(field);
      field = "";
      index += separator.length;
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export async function parseCsv(
  source: Blob,
  config: CsvConfig,
  options: ParseOptions = {},
): Promise<ParseResult> {
  if (!config.separator) {
    throw new Error("Separator is empty");
  }

  const records = splitRecords(stripBom(await source.text()), config.separator);
  const skip = Math.max(0, Math.floor(config.skipLines) || 0);
  const body = records.slice(skip).filter((record) => !isBlankRecord(record));
  if (body.length === 0) {
    throw new Error("File has no header row");
  }
  const header = body[0];

  const columns = header.map(
    (name, index) => name.trim() || `column_${index + 1}`,
  );
  const limit = options.truncate;
  const dataRecords = body.slice(1);
  const selected =
    limit === undefined
      ? dataRecords
      : dataRecords.slice(0, Math.max(0, limit));

  const rows: ParsedRow[] = selected.map((record) => {
    const row: ParsedRow = {};
    for (let index = 0; index < columns.length; index += 1) {
      row[columns[index]] = record[index] ?? "";
    }
    return row;
  });

  return { columns, rows };
}
