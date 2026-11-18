import { ReactElement, MouseEvent } from "react";
import { CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type { PreviewCrossmatchRow } from "../../clients/admin";
import { publicObjectUrl } from "../../origins";
import { crossmatchOutcomeLabel } from "./outcome";

const columns: Column[] = [
  { slug: "record_id", label: "record id" },
  { slug: "designation", label: "designation" },
  { slug: "ra", label: "ra" },
  { slug: "dec", label: "dec" },
  { slug: "status", label: "status" },
  { slug: "reason", label: "reason" },
  { slug: "candidates", label: "candidates" },
];

function stopRowClick(event: MouseEvent): void {
  event.stopPropagation();
}

function formatCoord(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

function renderCandidates(candidates: number[]): CellPrimitive {
  if (candidates.length === 0) {
    return "—";
  }
  return (
    <span
      className="inline-flex flex-wrap gap-x-2 gap-y-1"
      onClick={stopRowClick}
    >
      {candidates.map((pgc) => {
        const objectLink = publicObjectUrl(pgc);
        return (
          <Link key={pgc} href={objectLink.href} external={objectLink.external}>
            {pgc}
          </Link>
        );
      })}
    </span>
  );
}

function previewTableRows(
  rows: PreviewCrossmatchRow[],
): Record<string, CellPrimitive>[] {
  return rows.map((row) => ({
    record_id: (
      <span onClick={stopRowClick}>
        <Link href={`/records/${row.record_id}`}>{row.record_id}</Link>
      </span>
    ),
    designation: row.designation?.trim() || "—",
    ra: formatCoord(row.ra),
    dec: formatCoord(row.dec),
    status: crossmatchOutcomeLabel(row),
    reason: row.reason || "—",
    candidates: renderCandidates(row.candidates),
  }));
}

export function CrossmatchPreview({
  rows,
  totalCount,
  onSelectRecord,
}: {
  rows: PreviewCrossmatchRow[];
  totalCount: number;
  onSelectRecord?: (recordId: string) => void;
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0">
      <CommonTable
        columns={columns}
        data={previewTableRows(rows)}
        onRowClick={
          onSelectRecord
            ? (_row, rowIndex) => onSelectRecord(rows[rowIndex].record_id)
            : undefined
        }
      >
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
