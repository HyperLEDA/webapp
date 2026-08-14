import { ReactElement } from "react";
import {
  Catalogs,
  PhotometryTotalMeasurement,
} from "../../clients/backend/types.gen";
import {
  magsysGroupFromMeasurements,
  photometryFilterVlines,
} from "../../lib/astronomy/photometryFilters";
import { createPlot, PlotView } from "../core/Plot";
import {
  bibcodeMarkdownSelect,
  CatalogCard,
  CatalogNoData,
} from "./CatalogCard";

function photometryTotalSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, pt.band
, pt.mag
, pt.e_mag
, b.waveref AS wavelength
, cb.magsys
, pt.method
, ${bibcodeMarkdownSelect()}
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
}): ReactElement {
  const measurements = catalogs.photometry_total ?? [];
  const hasData = measurements.length > 0;
  const sorted = [...measurements].sort((a, b) => a.wavelength - b.wavelength);
  const x = sorted.map((m) => m.wavelength);
  const y = sorted.map((m) => m.mag);
  const yErrors = sorted.map((m) => m.e_mag);
  const details = sorted.map(formatPhotometryDetails);
  const magsysGroup = magsysGroupFromMeasurements(sorted.map((m) => m.magsys));
  const plotProps = createPlot()
    .plot(x, y, yErrors, details)
    .vlines(photometryFilterVlines(magsysGroup))
    .xlabel("λ (Å)")
    .ylabel("mag")
    .invertY()
    .logX()
    .toProps();

  return (
    <CatalogCard
      title="Total photometry"
      variant="block"
      anchorId={anchorId}
      originalDataSql={hasData ? photometryTotalSqlQuery(pgc) : undefined}
      className={className}
    >
      {hasData && plotProps ? <PlotView {...plotProps} /> : <CatalogNoData />}
    </CatalogCard>
  );
}
