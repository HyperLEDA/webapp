import { defaultCsvConfig, parseCsv, type CsvConfig } from "./csv/parser";
import { defaultFitsConfig, parseFits, type FitsConfig } from "./fits/parser";
import type { ParseOptions, ParseResult } from "./types";

export interface FileTypeDefinition<TId extends string, TConfig> {
  id: TId;
  label: string;
  extensions: string[];
  defaultConfig: (filename: string) => TConfig;
  parse: (
    source: Blob,
    config: TConfig,
    options?: ParseOptions,
  ) => Promise<ParseResult>;
}

export const CSV_FILE_TYPE: FileTypeDefinition<"csv", CsvConfig> = {
  id: "csv",
  label: "CSV",
  extensions: [".csv", ".tsv", ".txt"],
  defaultConfig: defaultCsvConfig,
  parse: parseCsv,
};

export const FITS_FILE_TYPE: FileTypeDefinition<"fits", FitsConfig> = {
  id: "fits",
  label: "FITS",
  extensions: [".fits", ".fit", ".fts"],
  defaultConfig: defaultFitsConfig,
  parse: parseFits,
};

export const FILE_TYPES = [CSV_FILE_TYPE, FITS_FILE_TYPE];

export type FileTypeId = (typeof FILE_TYPES)[number]["id"];

export function matchFileType(
  filename: string,
): (typeof FILE_TYPES)[number] | undefined {
  const lower = filename.toLowerCase();
  return FILE_TYPES.find((type) =>
    type.extensions.some((extension) => lower.endsWith(extension)),
  );
}

export function tableNameFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return stem
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
