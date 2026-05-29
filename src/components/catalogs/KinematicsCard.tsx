import { ReactElement } from "react";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import { isLoggedIn } from "../../auth/token";
import { buildRedshiftSqlQuery } from "../../lib/sql";
import { Quantity, QuantityWithError } from "../core/Astronomy";
import { CatalogCard, CatalogCardAction, Field } from "./CatalogCard";
import { originalDataAction } from "./catalogActions";

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
}): ReactElement | null {
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
  if (!hasRedshift && velocityFields.length === 0) return null;

  const actions: CatalogCardAction[] =
    hasRedshift && isLoggedIn()
      ? [originalDataAction(buildRedshiftSqlQuery(pgc))]
      : [];

  return (
    <CatalogCard
      title="Kinematics"
      actions={actions}
      anchorId={anchorId}
      className={className}
    >
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
