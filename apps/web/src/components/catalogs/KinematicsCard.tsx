import { ReactElement } from "react";
import { Catalogs, Schema } from "@leda/lib/clients/backend";
import { Quantity, QuantityWithError } from "@leda/lib/ui";
import {
  bibcodeMarkdownSelect,
  CatalogCard,
  CatalogNoData,
  Field,
} from "./CatalogCard";

function redshiftSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, c.cz
, c.e_cz
, ${bibcodeMarkdownSelect()}
FROM cz.data AS c
  JOIN layer0.records AS r ON c.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
}

type VelocityKey = "heliocentric" | "local_group" | "cmb_old" | "cmb";

const VELOCITY_FIELDS: { key: VelocityKey; label: string }[] = [
  { key: "heliocentric", label: "Heliocentric" },
  { key: "local_group", label: "Local Group" },
  { key: "cmb_old", label: "CMB (old)" },
  { key: "cmb", label: "CMB" },
];

function velocityField(
  key: VelocityKey,
  label: string,
  velocity: NonNullable<Catalogs["velocity"]>,
  schema: Schema,
): ReactElement | null {
  if (!(key in velocity)) {
    return null;
  }

  const measurement = velocity[key];

  const units = schema.units.velocity[key];
  return (
    <Field key={key} label={label}>
      <QuantityWithError error={measurement.e_v} unit={units.v}>
        <Quantity value={measurement.v.toFixed(0)} unit={units.v} />
      </QuantityWithError>
    </Field>
  );
}

export function KinematicsCard({
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
  const redshift = catalogs.redshift;
  const velocity = catalogs.velocity;

  const velocityFields = velocity
    ? VELOCITY_FIELDS.map(({ key, label }) =>
        velocityField(key, label, velocity, schema),
      ).filter((field): field is ReactElement => field !== null)
    : [];

  const hasRedshift = redshift !== null && redshift !== undefined;
  const hasData = hasRedshift || velocityFields.length > 0;

  return (
    <CatalogCard
      title="Redshift"
      originalDataSql={hasRedshift ? redshiftSqlQuery(pgc) : undefined}
      anchorId={anchorId}
      className={className}
    >
      {!hasData && <CatalogNoData />}
      {hasRedshift && (
        <Field label="z">
          <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
            {redshift.z.toFixed(5)}
          </QuantityWithError>
        </Field>
      )}
      {velocityFields}
    </CatalogCard>
  );
}
