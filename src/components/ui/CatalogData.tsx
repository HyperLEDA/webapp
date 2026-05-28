import { ReactElement, ReactNode } from "react";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import {
  Declination,
  RightAscension,
  Quantity,
  QuantityWithError,
} from "../core/Astronomy";

interface CatalogDataProps {
  catalogs: Catalogs;
  schema: Schema;
}

function CatalogCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {children}
      </dl>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function CoordinatesCard({
  catalogs,
  schema,
}: {
  catalogs: Catalogs;
  schema: Schema;
}): ReactElement | null {
  const coordinates = catalogs?.coordinates;
  if (!coordinates) return null;

  const equatorial = coordinates.equatorial;
  const galactic = coordinates.galactic;
  const hasEquatorial =
    equatorial?.ra !== undefined || equatorial?.dec !== undefined;
  const hasGalactic =
    galactic?.lon !== undefined || galactic?.lat !== undefined;

  if (!hasEquatorial && !hasGalactic) return null;

  return (
    <CatalogCard title="Coordinates">
      {equatorial?.ra !== undefined && (
        <Field label="RA">
          <QuantityWithError
            error={equatorial.e_ra}
            unit={schema.units.coordinates?.equatorial?.ra || "deg"}
          >
            <RightAscension value={equatorial.ra} />
          </QuantityWithError>
        </Field>
      )}
      {equatorial?.dec !== undefined && (
        <Field label="Dec">
          <QuantityWithError
            error={equatorial.e_dec}
            unit={schema.units.coordinates?.equatorial?.dec || "deg"}
          >
            <Declination value={equatorial.dec} />
          </QuantityWithError>
        </Field>
      )}
      {galactic?.lon !== undefined && (
        <Field label="Galactic l">
          <QuantityWithError
            error={galactic.e_lon}
            unit={schema.units.coordinates?.galactic?.lon}
          >
            <Quantity
              value={galactic.lon.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lon}
            />
          </QuantityWithError>
        </Field>
      )}
      {galactic?.lat !== undefined && (
        <Field label="Galactic b">
          <QuantityWithError
            error={galactic.e_lat}
            unit={schema.units.coordinates?.galactic?.lat}
          >
            <Quantity
              value={galactic.lat.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lat}
            />
          </QuantityWithError>
        </Field>
      )}
    </CatalogCard>
  );
}

function RedshiftCard({
  catalogs,
}: {
  catalogs: Catalogs;
}): ReactElement | null {
  const redshift = catalogs?.redshift;
  if (!redshift || redshift.z === undefined) return null;

  return (
    <CatalogCard title="Redshift">
      <Field label="z">
        <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
          {redshift.z?.toFixed(5) || "N/A"}
        </QuantityWithError>
      </Field>
    </CatalogCard>
  );
}

function VelocitiesCard({
  catalogs,
  schema,
}: {
  catalogs: Catalogs;
  schema: Schema;
}): ReactElement | null {
  const velocity = catalogs?.velocity;
  if (!velocity) return null;

  const fields = [
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
  ].filter(Boolean);

  if (fields.length === 0) return null;

  return <CatalogCard title="Velocities">{fields}</CatalogCard>;
}

export function CatalogData({
  catalogs,
  schema,
}: CatalogDataProps): ReactElement {
  if (!catalogs) return <div />;

  return (
    <div className="space-y-4">
      <CoordinatesCard catalogs={catalogs} schema={schema} />
      <RedshiftCard catalogs={catalogs} />
      <VelocitiesCard catalogs={catalogs} schema={schema} />
    </div>
  );
}
