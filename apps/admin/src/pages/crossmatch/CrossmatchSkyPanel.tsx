import { ReactElement, useEffect, useMemo, useState } from "react";
import { SkyViewer, type SkySource } from "@leda/lib/ui";
import type { PreviewCrossmatchRow } from "../../clients/admin";
import { crossmatchOutcomeLabel, type CrossmatchOutcomeLabel } from "./outcome";

const RECORD_COLOR = "#38bdf8";
const NEW_COLOR = "#38bdf8";
const EXISTING_COLOR = "#22c55e";
const PENDING_COLOR = "#f59e0b";
const NEIGHBOR_COLOR = "#94a3b8";

const OUTCOME_COLORS = {
  new: NEW_COLOR,
  existing: EXISTING_COLOR,
  pending: PENDING_COLOR,
} satisfies Record<CrossmatchOutcomeLabel, string>;

function neighborColor(pgc: number, row: PreviewCrossmatchRow): string {
  if (!row.candidates.includes(pgc)) {
    return NEIGHBOR_COLOR;
  }
  return OUTCOME_COLORS[crossmatchOutcomeLabel(row)];
}

function sourcesForRow(row: PreviewCrossmatchRow): SkySource[] {
  const designation = row.designation?.trim();
  const recordSource: SkySource | null =
    row.ra !== null &&
    row.ra !== undefined &&
    row.dec !== null &&
    row.dec !== undefined
      ? {
          ra: row.ra,
          dec: row.dec,
          label: designation || row.record_id,
          id: row.record_id,
          color: RECORD_COLOR,
        }
      : null;

  const neighbors: SkySource[] = row.neighbors.map((neighbor) => ({
    ra: neighbor.ra,
    dec: neighbor.dec,
    label: neighbor.design?.trim() || `PGC ${neighbor.pgc}`,
    id: neighbor.pgc,
    color: neighborColor(neighbor.pgc, row),
    description: `${neighbor.distance_arcsec}"`,
  }));

  return recordSource ? [recordSource, ...neighbors] : neighbors;
}

function fovForRadius(radiusArcsec: number): number {
  return Math.max(0.01, (radiusArcsec / 3600) * 3);
}

function firstSkyRowId(rows: PreviewCrossmatchRow[]): string | null {
  const row = rows.find(
    (item) =>
      item.ra !== null &&
      item.ra !== undefined &&
      item.dec !== null &&
      item.dec !== undefined,
  );
  return row?.record_id ?? null;
}

export function CrossmatchSkyPanel({
  rows,
  radiusArcsec,
  selectedRecordId,
  onSelect,
}: {
  rows: PreviewCrossmatchRow[];
  radiusArcsec: number;
  selectedRecordId: string | null;
  onSelect: (recordId: string) => void;
}): ReactElement {
  const selected =
    rows.find((row) => row.record_id === selectedRecordId) ??
    rows.find(
      (row) =>
        row.ra !== null &&
        row.ra !== undefined &&
        row.dec !== null &&
        row.dec !== undefined,
    ) ??
    null;

  const sources = useMemo(
    () => (selected ? sourcesForRow(selected) : []),
    [selected],
  );

  if (rows.length === 0) {
    return (
      <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 text-sm text-muted">
        Run preview to see sky matches.
      </aside>
    );
  }

  if (
    !selected ||
    selected.ra === null ||
    selected.ra === undefined ||
    selected.dec === null ||
    selected.dec === undefined
  ) {
    return (
      <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 text-sm text-muted">
        No preview rows have coordinates for a sky view.
      </aside>
    );
  }

  return (
    <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 flex flex-col gap-3 overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: NEW_COLOR }}
          />
          new
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: EXISTING_COLOR }}
          />
          existing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: PENDING_COLOR }}
          />
          pending
        </span>
      </div>

      <SkyViewer
        key={selected.record_id}
        backend="aladin"
        ra={selected.ra}
        dec={selected.dec}
        fov={fovForRadius(radiusArcsec)}
        className="w-full aspect-square max-h-[28rem]"
        additionalSources={sources}
      />

      <ul className="flex-1 overflow-y-auto divide-y divide-border -mx-1 min-h-0">
        {rows.map((row) => {
          const active = row.record_id === selected.record_id;
          const label = row.designation?.trim() || row.record_id;
          const outcome = crossmatchOutcomeLabel(row);
          const hasCoords =
            row.ra !== null &&
            row.ra !== undefined &&
            row.dec !== null &&
            row.dec !== undefined;
          return (
            <li key={row.record_id}>
              <button
                type="button"
                disabled={!hasCoords}
                onClick={() => onSelect(row.record_id)}
                className={`w-full text-left px-2 py-2 transition-colors ${
                  active ? "bg-surface" : "hover:bg-surface/60"
                } ${hasCoords ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-primary truncate">
                    {label}
                  </span>
                  <span className="text-xs text-muted shrink-0">{outcome}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {row.candidates.length > 0
                    ? `candidates ${row.candidates.join(", ")}`
                    : "No candidates"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function useCrossmatchSkySelection(
  rows: PreviewCrossmatchRow[] | null,
): [string | null, (recordId: string) => void] {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!rows) {
      setSelectedRecordId(null);
      return;
    }
    setSelectedRecordId((current) => {
      if (current && rows.some((row) => row.record_id === current)) {
        return current;
      }
      return firstSkyRowId(rows);
    });
  }, [rows]);

  return [selectedRecordId, setSelectedRecordId];
}
