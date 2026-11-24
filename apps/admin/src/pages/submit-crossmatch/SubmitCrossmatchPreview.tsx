import { ReactElement } from "react";
import { CellPrimitive, Column, CommonTable, Link } from "@leda/lib/ui";
import type { PreviewSubmitCrossmatchRow } from "../../clients/admin";
import { publicObjectUrl } from "../../origins";
import { renderParameterMatches } from "../crossmatch/parameters";

const columns: Column[] = [
  { slug: "record_id", label: "record id" },
  { slug: "pgc", label: "pgc" },
  { slug: "parameters", label: "parameters" },
];

function renderPgc(pgc: number | null | undefined): CellPrimitive {
  if (pgc === null || pgc === undefined) {
    return "new one";
  }
  const objectLink = publicObjectUrl(pgc);
  return (
    <Link href={objectLink.href} external={objectLink.external}>
      {pgc}
    </Link>
  );
}

function previewTableRows(
  rows: PreviewSubmitCrossmatchRow[],
): Record<string, CellPrimitive>[] {
  return rows.map((row) => ({
    record_id: <Link href={`/records/${row.record_id}`}>{row.record_id}</Link>,
    pgc: renderPgc(row.pgc),
    parameters: renderParameterMatches(row.outcome, row.parameters),
  }));
}

export function SubmitCrossmatchPreview({
  sampleCount,
  newCount,
  existingCount,
  rows,
}: {
  sampleCount: number;
  newCount: number;
  existingCount: number;
  rows: PreviewSubmitCrossmatchRow[];
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0 space-y-4">
      <div>
        <h3 className="font-semibold text-primary mb-1">Preview</h3>
        <p className="text-sm text-muted">
          Sample of {sampleCount} eligible records · {newCount} new ·{" "}
          {existingCount} existing
          {rows.length > 0 && rows.length < sampleCount
            ? ` · showing first ${rows.length}`
            : null}
        </p>
      </div>
      {sampleCount === 0 ? (
        <p className="text-sm text-muted">
          No records satisfy your criteria. Did you use all of the parameters
          above in the cross-identification?
        </p>
      ) : (
        <CommonTable columns={columns} data={previewTableRows(rows)} />
      )}
    </section>
  );
}
