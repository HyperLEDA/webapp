import { Children, ReactElement, ReactNode } from "react";
import { MdCode, MdContentCopy, MdSearch } from "react-icons/md";
import {
  Catalogs,
  PhotometryTotalMeasurement,
  Schema,
} from "../../clients/backend/types.gen";
import { isLoggedIn } from "../../auth/token";
import {
  buildEquatorialSqlQuery,
  buildPhotometryTotalSqlQuery,
  buildRedshiftSqlQuery,
} from "../../lib/sql";
import {
  buildNedPositionSearchUrl,
  Declination,
  EQUATORIAL_COPY_FORMATS,
  EquatorialDecimalDegrees,
  formatEquatorialForCopy,
  RightAscension,
  Quantity,
  QuantityWithError,
} from "../core/Astronomy";
import { CardActionsMenu, CatalogCardAction } from "./CardActionsMenu";
import { Plot } from "../core/Plot";

export type { CatalogCardAction };

const ORIGINAL_DATA_ACTION_DESCRIPTION =
  "Open SQL query for underlying records";

function originalDataAction(sql: string): CatalogCardAction {
  return {
    title: "View original data",
    description: ORIGINAL_DATA_ACTION_DESCRIPTION,
    icon: MdCode,
    href: `/data-catalog/query?q=${encodeURIComponent(sql)}`,
  };
}

export function CatalogCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: CatalogCardAction[];
}): ReactElement {
  const hasActions = actions !== undefined && actions.length > 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div
        className={
          hasActions ? "flex items-start justify-between gap-2 mb-2" : "mb-2"
        }
      >
        <h3 className="text-base font-semibold min-w-0">{title}</h3>
        {hasActions && <CardActionsMenu actions={actions} />}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base">
        {children}
      </dl>
    </div>
  );
}

export function Field({
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

export function CatalogDetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement | null {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {items}
      </div>
    </section>
  );
}

export function AstrometryCard({
  catalogs,
  schema,
  pgc,
}: {
  catalogs: Catalogs;
  schema: Schema;
  pgc: number;
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

  if (isLoggedIn()) {
    actions.push(originalDataAction(buildEquatorialSqlQuery(pgc)));
  }

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
    <CatalogCard title="Astrometry" actions={actions}>
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

export function KinematicsCard({
  catalogs,
  schema,
  pgc,
}: {
  catalogs: Catalogs;
  schema: Schema;
  pgc: number;
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
    <CatalogCard title="Kinematics" actions={actions}>
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
}: {
  catalogs: Catalogs;
  pgc: number;
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
  const hasActions = actions.length > 0;

  return (
    <div className="col-span-full rounded-lg border border-border bg-surface p-3">
      <div
        className={
          hasActions ? "flex items-start justify-between gap-2 mb-2" : "mb-2"
        }
      >
        <h3 className="text-base font-semibold min-w-0">Total photometry</h3>
        {hasActions && <CardActionsMenu actions={actions} />}
      </div>
      <Plot
        x={x}
        y={y}
        yErrors={yErrors}
        details={details}
        xLabel="λ (Å)"
        yLabel="mag"
      />
    </div>
  );
}
