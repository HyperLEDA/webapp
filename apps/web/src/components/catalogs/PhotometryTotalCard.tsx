import { ReactElement } from "react";
import {
  Catalogs,
  PhotometryTotalMeasurement,
} from "@leda/lib/clients/backend";
import {
  magsysGroupFromMeasurements,
  photometryFilterVlines,
} from "../../lib/astronomy/photometryFilters";
import { createPlot, PlotView, readPlotCssToken } from "../core/Plot";
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
  label: string,
): string {
  const error = measurement.e_mag ?? null;
  const lines = [
    label,
    `Band: ${measurement.band}`,
    `λ: ${measurement.wavelength} Å`,
    `mag: ${measurement.mag}${error === null ? "" : ` ± ${error}`}`,
    `Method: ${measurement.method}`,
  ];

  if (measurement.magsys) {
    lines.push(`Magnitude system: ${measurement.magsys}`);
  }

  return lines.join("\n");
}

function sortMeasurements(
  measurements: PhotometryTotalMeasurement[],
): PhotometryTotalMeasurement[] {
  return [...measurements].sort((a, b) => a.wavelength - b.wavelength);
}

function seriesFromMeasurements(
  measurements: PhotometryTotalMeasurement[],
  label: string,
) {
  const sorted = sortMeasurements(measurements);
  return {
    x: sorted.map((m) => m.wavelength),
    y: sorted.map((m) => m.mag),
    yErrors: sorted.map((m) => m.e_mag ?? null),
    details: sorted.map((m) => formatPhotometryDetails(m, label)),
    label,
  };
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
  const observed = catalogs.photometry_total ?? [];
  const corrected = catalogs.photometry_total_corrected ?? [];
  const hasObserved = observed.length > 0;
  const hasCorrected = corrected.length > 0;
  const hasData = hasObserved || hasCorrected;

  const magsysSource = hasObserved ? observed : corrected;
  const magsysGroup = magsysGroupFromMeasurements(
    magsysSource.map((m) => m.magsys),
  );

  const plotBuilder = createPlot()
    .vlines(photometryFilterVlines(magsysGroup))
    .xlabel("λ (Å)")
    .ylabel("mag")
    .invertY()
    .logX();

  if (hasObserved) {
    const { x, y, yErrors, details, label } = seriesFromMeasurements(
      observed,
      "Observed",
    );
    plotBuilder.plot(
      x,
      y,
      yErrors,
      details,
      readPlotCssToken("--token-accent"),
      label,
    );
  }

  if (hasCorrected) {
    const { x, y, yErrors, details, label } = seriesFromMeasurements(
      corrected,
      "Corrected",
    );
    plotBuilder.plot(
      x,
      y,
      yErrors,
      details,
      readPlotCssToken("--token-success"),
      label,
    );
  }

  const plotProps = plotBuilder.toProps();

  return (
    <CatalogCard
      title="Total photometry"
      variant="block"
      anchorId={anchorId}
      originalDataSql={hasData ? photometryTotalSqlQuery(pgc) : undefined}
      className={className}
    >
      {hasData ? <PlotView {...plotProps} /> : <CatalogNoData />}
    </CatalogCard>
  );
}
