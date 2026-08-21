import { ReactElement } from "react";
import { MdContentCopy, MdSearch } from "react-icons/md";
import { Catalogs, Schema } from "@leda/lib/clients/backend";
import {
  buildNedPositionSearchUrl,
  EQUATORIAL_COPY_FORMATS,
  formatEquatorialForCopy,
} from "../../lib/astronomy/equatorial";
import {
  Declination,
  EquatorialDecimalDegrees,
  Quantity,
  RightAscension,
} from "@leda/lib/ui";
import {
  bibcodeMarkdownSelect,
  CatalogCard,
  CatalogCardAction,
  CatalogNoData,
  Field,
} from "./CatalogCard";

function equatorialSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, i.ra
, i.dec
, i.e_ra
, i.e_dec
, ${bibcodeMarkdownSelect()}
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
}): ReactElement {
  const coordinates = catalogs.coordinates;
  const hasData = coordinates !== null && coordinates !== undefined;

  const actions: CatalogCardAction[] = [];

  if (coordinates !== null && coordinates !== undefined) {
    for (const { id, title } of EQUATORIAL_COPY_FORMATS) {
      actions.push({
        title: `Copy ICRS as ${title}`,
        icon: MdContentCopy,
        onClick: () => {
          void navigator.clipboard.writeText(
            formatEquatorialForCopy(
              coordinates.equatorial.ra,
              coordinates.equatorial.dec,
              id,
            ),
          );
        },
      });
    }

    actions.push({
      title: "Search in NED",
      icon: MdSearch,
      href: buildNedPositionSearchUrl(
        coordinates.equatorial.ra,
        coordinates.equatorial.dec,
      ),
    });
  }

  const raUnit = schema.units.coordinates.equatorial.ra || "deg";
  const eRaUnit = schema.units.coordinates.equatorial.e_ra || raUnit;

  return (
    <CatalogCard
      title="Astrometry"
      actions={hasData ? actions : undefined}
      originalDataSql={hasData ? equatorialSqlQuery(pgc) : undefined}
      anchorId={anchorId}
      className={className}
    >
      {!hasData && <CatalogNoData />}
      {coordinates !== null && coordinates !== undefined && (
        <>
          <Field label="ICRS">
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <RightAscension value={coordinates.equatorial.ra} />
              <Declination value={coordinates.equatorial.dec} />
            </span>
          </Field>
          <Field label="ICRS">
            <EquatorialDecimalDegrees
              ra={coordinates.equatorial.ra}
              dec={coordinates.equatorial.dec}
            />
          </Field>
          <Field label="Galactic">
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <Quantity
                value={coordinates.galactic.lon.toFixed(4)}
                unit="°"
                spaced={false}
              />
              <Quantity
                value={coordinates.galactic.lat.toFixed(4)}
                unit="°"
                spaced={false}
              />
            </span>
          </Field>
          <Field label="Supergalactic">
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <Quantity
                value={coordinates.supergalactic.lon.toFixed(4)}
                unit="°"
                spaced={false}
              />
              <Quantity
                value={coordinates.supergalactic.lat.toFixed(4)}
                unit="°"
                spaced={false}
              />
            </span>
          </Field>
          <Field label="Precision">
            ±{" "}
            <Quantity
              value={(
                (coordinates.equatorial.e_ra + coordinates.equatorial.e_dec) /
                2
              ).toFixed(2)}
              unit={eRaUnit}
            />
          </Field>
        </>
      )}
    </CatalogCard>
  );
}
