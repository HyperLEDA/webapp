import { ReactElement } from "react";
import type { PreviewCrossmatchRow } from "../clients/admin";

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

export function CrossmatchPreview({
  rows,
  totalCount,
}: {
  rows: PreviewCrossmatchRow[];
  totalCount: number;
}): ReactElement {
  return (
    <section className="mt-8 w-full min-w-0">
      <h3 className="font-semibold text-primary mb-2">Preview</h3>
      <p className="text-sm text-muted mb-2">
        Showing {rows.length} of {totalCount} records
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-primary">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  record id
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  designation
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">ra</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">dec</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  status
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  triage
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  reason
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  candidates
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  neighbors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.record_id}>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    {row.record_id}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.designation?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {formatCoord(row.ra)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {formatCoord(row.dec)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.triage}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.reason || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {row.candidates.length > 0
                      ? row.candidates.join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatNeighbors(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
