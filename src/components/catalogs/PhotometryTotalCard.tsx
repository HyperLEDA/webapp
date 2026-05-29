import { ReactElement } from "react";
import {
  Catalogs,
  PhotometryTotalMeasurement,
} from "../../clients/backend/types.gen";
import { isLoggedIn } from "../../auth/token";
import { buildPhotometryTotalSqlQuery } from "../../lib/sql";
import { Plot } from "../core/Plot";
import { useAnchoredElement } from "../../hooks/useAnchoredElement";
import { CardActionsMenu } from "../ui/CardActionsMenu";
import { CardAnchorLink } from "../ui/CardAnchorLink";
import { CatalogCardAction } from "./CatalogCard";
import { originalDataAction } from "./catalogActions";

function formatPhotometryDetails(
  measurement: PhotometryTotalMeasurement,
): string {
  const lines = [
    `Band: ${measurement.band}`,
    `λ: ${measurement.wavelength} Å`,
    `mag: ${measurement.mag}${measurement.e_mag !== null && measurement.e_mag !== undefined ? ` ± ${measurement.e_mag}` : ""}`,
    `Method: ${measurement.method}`,
  ];

  if (measurement.magsys) {
    lines.push(`Magnitude system: ${measurement.magsys}`);
  }

  return lines.join("\n");
}

export function PhotometryTotalCard({
  catalogs,
  pgc,
}: {
  catalogs: Catalogs;
  pgc: number;
}): ReactElement | null {
  const measurements = catalogs.photometry_total;
  if (!measurements?.length) {
    return null;
  }

  const sorted = [...measurements].sort((a, b) => a.wavelength - b.wavelength);
  const x = sorted.map((m) => m.wavelength);
  const y = sorted.map((m) => m.mag);
  const yErrors = sorted.map((m) => m.e_mag);
  const details = sorted.map(formatPhotometryDetails);

  const actions: CatalogCardAction[] = isLoggedIn()
    ? [originalDataAction(buildPhotometryTotalSqlQuery(pgc))]
    : [];
  const hasActions = actions.length > 0;
  const { ref, highlighted } = useAnchoredElement("photometry");

  return (
    <div
      ref={ref}
      id="photometry"
      className={`col-span-full rounded-lg border border-border bg-surface p-3${highlighted ? " card-anchor-highlight" : ""}`}
    >
      <div
        className={
          hasActions
            ? "group/card flex items-start justify-between gap-2 mb-2"
            : "group/card mb-2"
        }
      >
        <h3 className="text-base font-semibold min-w-0 flex items-center gap-1.5">
          Total photometry
          <CardAnchorLink anchorId="photometry" />
        </h3>
        {hasActions && <CardActionsMenu actions={actions} />}
      </div>
      <Plot
        x={x}
        y={y}
        yErrors={yErrors}
        details={details}
        xLabel="λ (Å)"
        yLabel="mag"
      />
    </div>
  );
}
