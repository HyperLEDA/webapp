import { ReactElement } from "react";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import { Quantity, QuantityWithError } from "../core/Astronomy";
import { CatalogCard, CatalogNoData, Field } from "./CatalogCard";

function redshiftSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, c.cz
, c.e_cz
, bib.code AS bibcode
FROM cz.data AS c
  JOIN layer0.records AS r ON c.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
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
  const redshift = catalogs?.redshift;
  const velocity = catalogs?.velocity;

  const velocityFields = velocity
    ? [
        velocity.heliocentric?.v !== undefined && (
          <Field key="heliocentric" label="Heliocentric">
            <QuantityWithError
              error={velocity.heliocentric.e_v}
              unit={schema.units.velocity?.heliocentric?.v}
            >
              <Quantity
                value={velocity.heliocentric.v.toFixed(0)}
                unit={schema.units.velocity?.heliocentric?.v}
              />
            </QuantityWithError>
          </Field>
        ),
        velocity.local_group?.v !== undefined && (
          <Field key="local_group" label="Local Group">
            <QuantityWithError
              error={velocity.local_group.e_v}
              unit={schema.units.velocity?.local_group?.v}
            >
              <Quantity
                value={velocity.local_group.v.toFixed(0)}
                unit={schema.units.velocity?.local_group?.v}
              />
            </QuantityWithError>
          </Field>
        ),
        velocity.cmb_old?.v !== undefined && (
          <Field key="cmb_old" label="CMB (old)">
            <QuantityWithError
              error={velocity.cmb_old.e_v}
              unit={schema.units.velocity?.cmb_old?.v}
            >
              <Quantity
                value={velocity.cmb_old.v.toFixed(0)}
                unit={schema.units.velocity?.cmb_old?.v}
              />
            </QuantityWithError>
          </Field>
        ),
        velocity.cmb?.v !== undefined && (
          <Field key="cmb" label="CMB">
            <QuantityWithError
              error={velocity.cmb.e_v}
              unit={schema.units.velocity?.cmb?.v}
            >
              <Quantity
                value={velocity.cmb.v.toFixed(0)}
                unit={schema.units.velocity?.cmb?.v}
              />
            </QuantityWithError>
          </Field>
        ),
      ].filter(Boolean)
    : [];

  const hasRedshift = redshift?.z !== undefined;
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
