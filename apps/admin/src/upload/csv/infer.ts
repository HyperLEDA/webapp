import type { ColumnDescription, DatatypeEnum } from "../../clients/admin";
import type { ParsedRow } from "../types";

const INTEGER = /^-?\d+$/;
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

function inferDataType(values: string[]): DatatypeEnum {
  const present = values
    .map((value) => value.trim())
    .filter((value) => value !== "");
  if (present.length === 0) {
    return "string";
  }
  if (present.every((value) => INTEGER.test(value))) {
    return "integer";
  }
  if (present.every((value) => NUMBER.test(value))) {
    return "double";
  }
  return "string";
}

export function inferColumns(
  columns: string[],
  rows: ParsedRow[],
): ColumnDescription[] {
  return columns.map((name) => ({
    name,
    data_type: inferDataType(rows.map((row) => row[name] ?? "")),
  }));
}
