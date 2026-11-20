import { ReactElement, useEffect, useMemo, useState } from "react";
import { SkyViewer, type SkyEllipse, type SkySource } from "@leda/lib/ui";
import {
  crossmatchOutcomeLabel,
  type CrossmatchOutcomeLabel,
  type PreviewSkyRow,
} from "./outcome";

const RECORD_COLOR = "#38bdf8";
const NEW_COLOR = "#38bdf8";
const EXISTING_COLOR = "#22c55e";
const PENDING_COLOR = "#f59e0b";
const NEIGHBOR_COLOR = "#94a3b8";
const SEARCH_RADIUS_COLOR = "#38bdf8";

const OUTCOME_COLORS = {
  new: NEW_COLOR,
  existing: EXISTING_COLOR,
  pending: PENDING_COLOR,
} satisfies Record<CrossmatchOutcomeLabel, string>;

function neighborColor(pgc: number, row: PreviewSkyRow): string {
  if (!row.candidates.includes(pgc)) {
    return NEIGHBOR_COLOR;
  }
  return OUTCOME_COLORS[crossmatchOutcomeLabel(row)];
}

function sourcesForRow(row: PreviewSkyRow): SkySource[] {
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
  const diameterDeg = (2 * radiusArcsec) / 3600;
  return Math.max(0.01, diameterDeg * 3);
}

function firstSkyRowId(rows: PreviewSkyRow[]): string | null {
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
}: {
  rows: PreviewSkyRow[];
  radiusArcsec: number;
  selectedRecordId: string | null;
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

  const searchEllipse = useMemo((): SkyEllipse[] => {
    if (
      !selected ||
      selected.ra === null ||
      selected.ra === undefined ||
      selected.dec === null ||
      selected.dec === undefined
    ) {
      return [];
    }
    const radiusDeg = radiusArcsec / 3600;
    return [
      {
        ra: selected.ra,
        dec: selected.dec,
        aDeg: radiusDeg,
        bDeg: radiusDeg,
        color: SEARCH_RADIUS_COLOR,
      },
    ];
  }, [radiusArcsec, selected]);

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
    <aside className="w-full min-w-0 rounded border border-border bg-surface-2 p-4 flex flex-col gap-3 overflow-hidden">
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
        className="w-full max-w-[28rem] aspect-square"
        additionalSources={sources}
        ellipses={searchEllipse}
      />
    </aside>
  );
}

export function useCrossmatchSkySelection(
  rows: PreviewSkyRow[] | null,
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
