import { ReactElement, MouseEvent } from "react";
import { MdMyLocation } from "react-icons/md";
import { Button, CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type {
  PreviewCrossmatchRow,
  PreviewCrossmatchStat,
} from "../../clients/admin";
import { Accordion } from "../../components/ui";
import { publicObjectUrl } from "../../origins";
import { candidateCountLabel } from "./outcome";
import { renderParameterMatches } from "./parameters";

const previewColumns: Column[] = [
  { slug: "locate", label: "" },
  { slug: "designation", label: "designation" },
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
    candidates: renderCandidates(row.candidates),
  }));
}

function statKey(stat: PreviewCrossmatchStat, index: number): string {
  return `${stat.triage}:${stat.status}:${index}`;
}

function StatAccordionTitle({
  stat,
}: {
  stat: PreviewCrossmatchStat;
}): ReactElement {
  const count = candidateCountLabel(stat.status);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary">
      <span className="font-semibold">
        {count} {count === "1" ? "candidate" : "candidates"}
      </span>
      <span>{renderParameterMatches(stat.status, stat.parameters)}</span>
      <span className="text-muted">{stat.percent}%</span>
    </span>
  );
}

function StatisticsGroup({
  title,
  emptyLabel,
  statistics,
  sampleCount,
  onLocate,
}: {
  title: string;
  emptyLabel: string;
  statistics: PreviewCrossmatchStat[];
  sampleCount: number;
  onLocate: (recordId: string) => void;
}): ReactElement {
  const count = statistics.reduce((sum, stat) => sum + stat.count, 0);
  const percent =
    sampleCount > 0 ? Math.round((1000 * count) / sampleCount) / 10 : 0;
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-primary">
        {title}
        <span className="ml-2 font-normal text-muted">{percent}%</span>
      </h4>
      {statistics.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        statistics.map((stat, index) => (
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
        ))
      )}
    </div>
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
  const pending = statistics.filter((stat) => stat.triage === "pending");
  const resolved = statistics.filter((stat) => stat.triage === "resolved");
  return (
    <section className="mt-8 w-full min-w-0 space-y-6">
      <div>
        <h3 className="font-semibold text-primary mb-1">Preview results</h3>
        <p className="text-sm text-muted">
          Based on a sample of {sampleCount} records. {eligibleCount} records
          pass row filter. {totalCount} records total. You can expand and see up
          to 10 examples in each category below.
        </p>
      </div>

      <StatisticsGroup
        title="For manual review"
        emptyLabel="No records for manual review in the sample"
        statistics={pending}
        sampleCount={sampleCount}
        onLocate={onLocate}
      />

      <StatisticsGroup
        title="Resolved automatically"
        emptyLabel="No automatically resolved records in the sample"
        statistics={resolved}
        sampleCount={sampleCount}
        onLocate={onLocate}
      />
    </section>
  );
}
