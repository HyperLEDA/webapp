import { ReactElement, MouseEvent } from "react";
import { MdMyLocation } from "react-icons/md";
import { Button, CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type {
  PreviewCrossmatchRow,
  PreviewCrossmatchStat,
} from "../../clients/admin";
import { Accordion } from "../../components/ui";
import { publicObjectUrl } from "../../origins";
import { renderParameterMatches } from "./parameters";

const previewColumns: Column[] = [
  { slug: "locate", label: "" },
  { slug: "designation", label: "designation" },
  { slug: "status", label: "status" },
  { slug: "triage", label: "triage" },
  { slug: "parameters", label: "parameters" },
  { slug: "candidates", label: "candidates" },
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
    parameters: renderParameterMatches(row.status, row.parameters),
    candidates: renderCandidates(row.candidates),
  }));
}

function statKey(stat: PreviewCrossmatchStat, index: number): string {
  return `${stat.status}:${stat.triage}:${index}`;
}

function StatAccordionTitle({
  stat,
}: {
  stat: PreviewCrossmatchStat;
}): ReactElement {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary">
      <span className="font-semibold">{stat.status}</span>
      <span className="text-subtle">{stat.triage}</span>
      <span>{renderParameterMatches(stat.status, stat.parameters)}</span>
      <span className="text-muted">
        {stat.count} · {stat.percent}%
      </span>
    </span>
  );
}

export function CrossmatchPreview({
  totalCount,
  eligibleCount,
  sampleCount,
  statistics,
  onLocate,
}: {
  totalCount: number;
  eligibleCount: number;
  sampleCount: number;
  statistics: PreviewCrossmatchStat[];
  onLocate: (recordId: string) => void;
}): ReactElement {
  const scope =
    eligibleCount === totalCount
      ? `${sampleCount} of ${totalCount} records`
      : `${sampleCount} of ${eligibleCount} eligible (${totalCount} total)`;
  return (
    <section className="mt-8 w-full min-w-0 space-y-4">
      <div>
        <h3 className="font-semibold text-primary mb-1">Statistics</h3>
        <p className="text-sm text-muted">Based on {scope}</p>
      </div>

      <div className="space-y-2">
        {statistics.map((stat, index) => (
          <Accordion
            key={statKey(stat, index)}
            title={<StatAccordionTitle stat={stat} />}
          >
            {stat.rows.length === 0 ? (
              <p className="text-sm text-muted">No example rows</p>
            ) : (
              <CommonTable
                columns={previewColumns}
                data={previewTableRows(stat.rows, onLocate)}
              />
            )}
          </Accordion>
        ))}
      </div>
    </section>
  );
}
