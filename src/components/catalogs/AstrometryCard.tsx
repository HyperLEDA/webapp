import { ReactElement } from "react";
import { MdContentCopy, MdSearch } from "react-icons/md";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import {
  buildNedPositionSearchUrl,
  Declination,
  EQUATORIAL_COPY_FORMATS,
  EquatorialDecimalDegrees,
  formatEquatorialForCopy,
  RightAscension,
  Quantity,
} from "../core/Astronomy";
import { CatalogCard, CatalogCardAction, Field } from "./CatalogCard";

function equatorialSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, i.ra
, i.dec
, i.e_ra
, i.e_dec
, bib.code AS bibcode
FROM icrs.data AS i
  JOIN layer0.records AS r ON i.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
}

export function AstrometryCard({
  catalogs,
  schema,
  pgc,
  anchorId,
  className,
}: {
  catalogs: Catalogs;
  schema: Schema;
  pgc: number;
  anchorId?: string;
  className?: string;
}): ReactElement | null {
  const equatorial = catalogs?.coordinates?.equatorial;
  const galactic = catalogs?.coordinates?.galactic;
  const hasEquatorial =
    equatorial?.ra !== undefined || equatorial?.dec !== undefined;
  const hasGalactic =
    galactic?.lon !== undefined || galactic?.lat !== undefined;
  const hasPrecision =
    equatorial?.e_ra !== undefined || equatorial?.e_dec !== undefined;

  if (!hasEquatorial && !hasGalactic) return null;

  const actions: CatalogCardAction[] = [];

  if (equatorial?.ra !== undefined && equatorial?.dec !== undefined) {
    for (const { id, title } of EQUATORIAL_COPY_FORMATS) {
      actions.push({
        title: `Copy ICRS as ${title}`,
        icon: MdContentCopy,
        onClick: () => {
          void navigator.clipboard.writeText(
            formatEquatorialForCopy(equatorial.ra, equatorial.dec, id),
          );
        },
      });
    }

    actions.push({
      title: "Search in NED",
      icon: MdSearch,
      href: buildNedPositionSearchUrl(equatorial.ra, equatorial.dec),
    });
  }

  const raUnit = schema.units.coordinates?.equatorial?.ra || "deg";
  const eRaUnit = schema.units.coordinates?.equatorial?.e_ra || raUnit;
  const eDecUnit = schema.units.coordinates?.equatorial?.e_dec || raUnit;
  const precisionErrors = [equatorial?.e_ra, equatorial?.e_dec].filter(
    (value): value is number => value !== undefined,
  );
  const precision =
    precisionErrors.length > 0
      ? precisionErrors.reduce((sum, value) => sum + value, 0) /
        precisionErrors.length
      : undefined;
  const precisionUnit =
    equatorial?.e_ra !== undefined
      ? eRaUnit
      : equatorial?.e_dec !== undefined
        ? eDecUnit
        : eRaUnit;

  return (
    <CatalogCard
      title="Astrometry"
      actions={actions}
      originalDataSql={equatorialSqlQuery(pgc)}
      anchorId={anchorId}
      className={className}
    >
      {hasEquatorial && (
        <>
          <Field label="ICRS">
            <span className="inline-flex flex-wrap items-center gap-x-2">
              {equatorial?.ra !== undefined && (
                <RightAscension value={equatorial.ra} />
              )}
              {equatorial?.dec !== undefined && (
                <Declination value={equatorial.dec} />
              )}
            </span>
          </Field>
          {equatorial?.ra !== undefined && equatorial?.dec !== undefined && (
            <Field label="ICRS">
              <EquatorialDecimalDegrees
                ra={equatorial.ra}
                dec={equatorial.dec}
              />
            </Field>
          )}
        </>
      )}
      {hasGalactic && (
        <Field label="Galactic">
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {galactic?.lon !== undefined && (
              <Quantity
                value={galactic.lon.toFixed(2)}
                unit={schema.units.coordinates?.galactic?.lon}
              />
            )}
            {galactic?.lat !== undefined && (
              <Quantity
                value={galactic.lat.toFixed(2)}
                unit={schema.units.coordinates?.galactic?.lat}
              />
            )}
          </span>
        </Field>
      )}
      {hasPrecision && precision !== undefined && (
        <Field label="Precision">
          ± <Quantity value={precision.toFixed(2)} unit={precisionUnit} />
        </Field>
      )}
    </CatalogCard>
  );
}
