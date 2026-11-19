import { ReactElement, MouseEvent } from "react";
import { MdMyLocation } from "react-icons/md";
import { Button, CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type {
  PreviewCrossmatchRow,
  PreviewCrossmatchStat,
} from "../../clients/admin";
import { publicObjectUrl } from "../../origins";

const previewColumns: Column[] = [
  { slug: "locate", label: "" },
  { slug: "designation", label: "designation" },
  { slug: "status", label: "status" },
  { slug: "triage", label: "triage" },
  { slug: "reason", label: "reason" },
  { slug: "candidates", label: "candidates" },
];

const statsColumns: Column[] = [
  { slug: "status", label: "status" },
  { slug: "triage", label: "triage" },
  { slug: "reason", label: "reason" },
  { slug: "count", label: "count" },
  { slug: "percent", label: "%" },
];

function stopRowClick(event: MouseEvent): void {
  event.stopPropagation();
}

function renderLocate(
  row: PreviewCrossmatchRow,
  onLocate: (recordId: string) => void,
): CellPrimitive {
  if (
    row.ra === null ||
    row.ra === undefined ||
    row.dec === null ||
    row.dec === undefined
  ) {
    return <div />;
  }
  return (
    <Button
      type="button"
      transparent
      hoverText="Locate"
      onClick={(event) => {
        event.stopPropagation();
        onLocate(row.record_id);
      }}
    >
      <MdMyLocation className="w-4 h-4 text-muted" />
    </Button>
  );
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
  onLocate: (recordId: string) => void,
): Record<string, CellPrimitive>[] {
  return rows.map((row) => ({
    locate: renderLocate(row, onLocate),
    designation: (
      <span onClick={stopRowClick}>
        <Link href={`/records/${row.record_id}`}>
          {row.designation?.trim() || row.record_id}
        </Link>
      </span>
    ),
    status: row.status,
    triage: row.triage,
    reason: row.reason || "—",
    candidates: renderCandidates(row.candidates),
  }));
}

function statsTableRows(
  statistics: PreviewCrossmatchStat[],
): Record<string, CellPrimitive>[] {
  return statistics.map((stat) => ({
    status: stat.status,
    triage: stat.triage,
    reason: stat.reason || "—",
    count: String(stat.count),
    percent: `${stat.percent}%`,
  }));
}

export function CrossmatchPreview({
  rows,
  totalCount,
  sampleCount,
  statistics,
  onLocate,
}: {
  rows: PreviewCrossmatchRow[];
  totalCount: number;
  sampleCount: number;
  statistics: PreviewCrossmatchStat[];
  onLocate: (recordId: string) => void;
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0 space-y-8">
      <CommonTable columns={statsColumns} data={statsTableRows(statistics)}>
        <div>
          <h3 className="font-semibold text-primary mb-1">Statistics</h3>
          <p className="text-sm text-muted">
            Based on {sampleCount} of {totalCount} records
          </p>
        </div>
      </CommonTable>

      <CommonTable
        columns={previewColumns}
        data={previewTableRows(rows, onLocate)}
      >
        <div>
          <h3 className="font-semibold text-primary mb-1">Preview</h3>
          <p className="text-sm text-muted">
            Showing {rows.length} random records from the sample above
          </p>
        </div>
      </CommonTable>
    </section>
  );
}
