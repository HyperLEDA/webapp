import { ReactElement } from "react";
import { CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type { PreviewSubmitCrossmatchRow } from "../../clients/admin";

const columns: Column[] = [
  { slug: "record_id", label: "record id" },
  { slug: "outcome", label: "outcome" },
  { slug: "pgc", label: "pgc" },
];

function outcomeLabel(outcome: string): string {
  if (outcome === "new") {
    return "new PGC";
  }
  if (outcome === "existing") {
    return "existing PGC";
  }
  return outcome;
}

function previewTableRows(
  rows: PreviewSubmitCrossmatchRow[],
): Record<string, CellPrimitive>[] {
  return rows.map((row) => ({
    record_id: <Link href={`/records/${row.record_id}`}>{row.record_id}</Link>,
    outcome: outcomeLabel(row.outcome),
    pgc: row.pgc ?? "—",
  }));
}

export function SubmitCrossmatchPreview({
  totalCount,
  eligibleCount,
  newCount,
  existingCount,
  rows,
}: {
  totalCount: number;
  eligibleCount: number;
  newCount: number;
  existingCount: number;
  rows: PreviewSubmitCrossmatchRow[];
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0 space-y-4">
      <div>
        <h3 className="font-semibold text-primary mb-1">Preview</h3>
        <p className="text-sm text-muted">
          {eligibleCount} / {totalCount} records eligible · {newCount} new ·{" "}
          {existingCount} existing
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No eligible records in the sample.</p>
      ) : (
        <CommonTable columns={columns} data={previewTableRows(rows)} />
      )}
    </section>
  );
}
