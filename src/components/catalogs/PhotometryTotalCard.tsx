import { ReactElement } from "react";
import {
  Catalogs,
  PhotometryTotalMeasurement,
} from "../../clients/backend/types.gen";
import { isLoggedIn } from "../../auth/token";
import { buildPhotometryTotalSqlQuery } from "../../lib/sql";
import { Plot } from "../core/Plot";
import { CatalogCard, CatalogCardAction } from "./CatalogCard";
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
  className,
}: {
  catalogs: Catalogs;
  pgc: number;
  className?: string;
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

  return (
    <CatalogCard
      title="Total photometry"
      variant="block"
      anchorId="photometry"
      actions={actions}
      className={className}
    >
      <Plot
        x={x}
        y={y}
        yErrors={yErrors}
        details={details}
        xLabel="λ (Å)"
        yLabel="mag"
      />
    </CatalogCard>
  );
}
