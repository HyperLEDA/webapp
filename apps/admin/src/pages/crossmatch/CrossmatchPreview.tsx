import { ReactElement } from "react";
import { CellPrimitive, Column, CommonTable } from "@leda/lib/ui";
import type { PreviewCrossmatchRow } from "../../clients/admin";

const columns: Column[] = [
  { slug: "record_id", label: "record id" },
  { slug: "designation", label: "designation" },
  { slug: "ra", label: "ra" },
  { slug: "dec", label: "dec" },
  { slug: "status", label: "status" },
  { slug: "triage", label: "triage" },
  { slug: "reason", label: "reason" },
  { slug: "candidates", label: "candidates" },
  { slug: "neighbors", label: "neighbors" },
];

function formatNeighbors(row: PreviewCrossmatchRow): string {
  if (row.neighbors.length === 0) {
    return "—";
  }
  return row.neighbors
    .map((neighbor) => {
      const label = neighbor.design?.trim() || `PGC ${neighbor.pgc}`;
      return `${label} (${neighbor.distance_arcsec}")`;
    })
    .join(", ");
}

function formatCoord(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

function previewTableRows(
  rows: PreviewCrossmatchRow[],
): Record<string, CellPrimitive>[] {
  return rows.map((row) => ({
    record_id: row.record_id,
    designation: row.designation?.trim() || "—",
    ra: formatCoord(row.ra),
    dec: formatCoord(row.dec),
    status: row.status,
    triage: row.triage,
    reason: row.reason || "—",
    candidates: row.candidates.length > 0 ? row.candidates.join(", ") : "—",
    neighbors: formatNeighbors(row),
  }));
}

export function CrossmatchPreview({
  rows,
  totalCount,
}: {
  rows: PreviewCrossmatchRow[];
  totalCount: number;
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0">
      <CommonTable columns={columns} data={previewTableRows(rows)}>
        <div>
          <h3 className="font-semibold text-primary mb-1">Preview</h3>
          <p className="text-sm text-muted">
            Showing {rows.length} of {totalCount} records
          </p>
        </div>
      </CommonTable>
    </section>
  );
}
