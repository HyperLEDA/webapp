import { ReactElement } from "react";
import { CellPrimitive, Column, CommonTable } from "@leda/lib/ui";
import type { PreviewRow } from "../clients/admin";

function renderMutedCell(value: CellPrimitive): ReactElement {
  return <span className="text-muted">{String(value)}</span>;
}

function previewEntries(
  row: PreviewRow,
  inputColumns: string[],
  fields: string[],
): [string, CellPrimitive][] {
  const entries: [string, CellPrimitive][] = [["record_id", row.record_id]];
  for (const column of inputColumns) {
    entries.push([`in:${column}`, String(row.inputs[column] ?? "")]);
  }
  if (row.skipped_reason) {
    const reason = row.skipped_reason;
    for (const [index, field] of fields.entries()) {
      const value = index === 0 ? <span className="italic">{reason}</span> : "";
      entries.push([`out:${field}`, value]);
    }
  } else {
    for (const field of fields) {
      entries.push([`out:${field}`, String(row.outputs[field] ?? "")]);
    }
  }
  return entries;
}

export function StructuredUploadPreview({
  rows,
  fields,
  eligibleCount,
  totalCount,
}: {
  rows: PreviewRow[];
  fields: string[];
  eligibleCount: number;
  totalCount: number;
}): ReactElement {
  const inputColumns = [
    ...new Set(rows.flatMap((row) => Object.keys(row.inputs))),
  ];
  const columns: Column[] = [
    { slug: "record_id", label: "record id" },
    ...inputColumns.map((column) => ({
      slug: `in:${column}`,
      label: `${column} (in)`,
      renderCell: renderMutedCell,
    })),
    ...fields.map((field) => ({
      slug: `out:${field}`,
      label: field,
    })),
  ];
  const data = rows.map((row) =>
    Object.fromEntries(previewEntries(row, inputColumns, fields)),
  );

  return (
    <section className="mt-8 w-full min-w-0 space-y-6">
      <div>
        <h3 className="font-semibold text-primary mb-1">Preview results</h3>
        <p className="text-sm text-muted">
          {eligibleCount} / {totalCount} rows eligible
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No rows returned.</p>
      ) : (
        <CommonTable columns={columns} data={data} />
      )}
    </section>
  );
}
