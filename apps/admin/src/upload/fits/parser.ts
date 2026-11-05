import {
  AsciiTableHDU,
  BinaryTableHDU,
  FITSFile,
  FITSParser,
  type FITSAsciiTableColumn,
  type FITSBinaryTableColumn,
  type FITSComplex,
  type FITSTableCellValue,
} from "jsfitsio";

import type { ColumnDescription, DatatypeEnum } from "../../clients/admin";
import type { ParseOptions, ParseResult, ParsedRow } from "../types";

export interface FitsConfig {
  hduIndex: number;
}

export function defaultFitsConfig(_filename: string): FitsConfig {
  return { hduIndex: 1 };
}

function isStringCell(value: FITSTableCellValue): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

function isNumberCell(value: FITSTableCellValue): value is number {
  return Object.prototype.toString.call(value) === "[object Number]";
}

function isBigintCell(value: FITSTableCellValue): value is bigint {
  return Object.prototype.toString.call(value) === "[object BigInt]";
}

function isBooleanCell(value: FITSTableCellValue): value is boolean {
  return Object.prototype.toString.call(value) === "[object Boolean]";
}

function isComplexCell(value: FITSTableCellValue): value is FITSComplex {
  return Object.prototype.toString.call(value) === "[object Object]";
}

type JsonCell =
  string | number | null | JsonCell[] | { real: number; imaginary: number };

function jsonCell(value: FITSTableCellValue): JsonCell {
  if (value === null) {
    return null;
  }
  if (isStringCell(value)) {
    return value;
  }
  if (isBooleanCell(value)) {
    return value ? "T" : "F";
  }
  if (isBigintCell(value)) {
    return value.toString();
  }
  if (isNumberCell(value)) {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => jsonCell(item));
  }
  if (isComplexCell(value)) {
    return { real: value.real, imaginary: value.imaginary };
  }
  return null;
}

function isJsonString(value: JsonCell): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

function cellToString(value: FITSTableCellValue): string {
  const rendered = jsonCell(value);
  if (rendered === null) {
    return "";
  }
  if (isJsonString(rendered)) {
    return rendered;
  }
  return JSON.stringify(rendered);
}

function columnName(name: string | null, index: number): string {
  const trimmed = name?.trim() ?? "";
  if (trimmed === "") {
    return `column_${index + 1}`;
  }
  return trimmed;
}

function describeColumn(
  name: string,
  dataType: DatatypeEnum,
  unit: string | null,
): ColumnDescription {
  const trimmed = unit?.trim() ?? "";
  if (trimmed === "") {
    return { name, data_type: dataType };
  }
  return { name, data_type: dataType, unit: trimmed };
}

function binaryDataType(column: FITSBinaryTableColumn): DatatypeEnum {
  if (column.repeat !== 1) {
    return "string";
  }
  switch (column.type) {
    case "UINT8":
    case "INT16":
    case "INT32":
    case "INT64":
      return "integer";
    case "FLOAT32":
    case "FLOAT64":
      return "double";
    case "LOGICAL":
    case "BIT":
    case "CHAR":
    case "COMPLEX64":
    case "COMPLEX128":
    case "UNKNOWN":
      return "string";
    default:
      return "string";
  }
}

function asciiDataType(column: FITSAsciiTableColumn): DatatypeEnum {
  switch (column.type) {
    case "INTEGER":
      return "integer";
    case "FLOAT":
    case "EXPONENTIAL":
    case "DOUBLE":
      return "double";
    case "CHAR":
    case "UNKNOWN":
      return "string";
    default:
      return "string";
  }
}

function readFitsBytes(rawData: Uint8Array): FITSFile {
  const descriptor = Object.getOwnPropertyDescriptor(
    FITSParser,
    "processFITSFile",
  );
  if (descriptor === undefined || descriptor.value === undefined) {
    throw new Error("Unable to read FITS file");
  }
  // SAFETY: jsfitsio 3.1.0 implements this static method as
  // processFITSFile(rawData, options) => FITSFile. The published types mark
  // it private, and loadFITSFile only accepts filesystem paths and http(s) URLs.
  const fits = descriptor.value(rawData, {}) as FITSFile;
  if (!(fits instanceof FITSFile)) {
    throw new Error("Unable to read FITS file");
  }
  return fits;
}

function tableFromFits(
  fits: FITSFile,
  hduIndex: number,
): BinaryTableHDU | AsciiTableHDU {
  const hdu = fits.getHDU(hduIndex);
  if (hdu === null) {
    throw new Error(`HDU ${hduIndex} does not exist`);
  }
  if (hdu instanceof BinaryTableHDU || hdu instanceof AsciiTableHDU) {
    return hdu;
  }
  throw new Error(`HDU ${hduIndex} is not a table`);
}

function descriptionsFor(
  table: BinaryTableHDU | AsciiTableHDU,
): ColumnDescription[] {
  if (table instanceof BinaryTableHDU) {
    return table.columns.map((column, index) =>
      describeColumn(
        columnName(column.name, index),
        binaryDataType(column),
        column.unit,
      ),
    );
  }
  return table.columns.map((column, index) =>
    describeColumn(
      columnName(column.name, index),
      asciiDataType(column),
      column.unit,
    ),
  );
}

export async function parseFits(
  source: Blob,
  config: FitsConfig,
  options: ParseOptions = {},
): Promise<ParseResult> {
  if (!Number.isInteger(config.hduIndex) || config.hduIndex < 0) {
    throw new Error("Invalid HDU index");
  }

  const rawData = new Uint8Array(await source.arrayBuffer());
  if (rawData.byteLength === 0) {
    throw new Error("FITS file is empty");
  }

  const table = tableFromFits(readFitsBytes(rawData), config.hduIndex);
  const columnDescriptions = descriptionsFor(table);
  const columns = columnDescriptions.map((column) => column.name);
  const limit = options.truncate;
  const rowCount =
    limit === undefined
      ? table.rowCount
      : Math.min(table.rowCount, Math.max(0, limit));
  const rows: ParsedRow[] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = table.getRow(rowIndex);
    const row: ParsedRow = {};
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      row[columns[columnIndex]] = cellToString(cells[columnIndex] ?? null);
    }
    rows.push(row);
  }

  return { columns, rows, columnDescriptions };
}
