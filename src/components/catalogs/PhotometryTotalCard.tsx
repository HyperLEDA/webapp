import { ReactElement } from "react";
import {
  Catalogs,
  PhotometryTotalMeasurement,
} from "../../clients/backend/types.gen";
import { Plot } from "../core/Plot";
import { CatalogCard } from "./CatalogCard";

function photometryTotalSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, pt.band
, cb.magsys
, pt.method
, b.waveref AS wavelength
, pt.mag
, pt.e_mag
, bib.code AS bibcode
FROM photometry.total AS pt
  JOIN layer0.records AS r ON pt.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
  JOIN photometry.calib_bands AS cb ON pt.band = cb.id
  JOIN photometry.bands AS b ON cb.band = b.id
WHERE r.pgc = ${pgc}`;
}

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
  anchorId,
  className,
}: {
  catalogs: Catalogs;
  pgc: number;
  anchorId?: string;
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

  return (
    <CatalogCard
      title="Total photometry"
      variant="block"
      anchorId={anchorId}
      originalDataSql={photometryTotalSqlQuery(pgc)}
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
