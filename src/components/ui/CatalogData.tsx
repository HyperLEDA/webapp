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
} from "../../lib/tap";
import {
  buildNedPositionSearchUrl,
  Declination,
  formatDecForCopy,
  formatRaForCopy,
  RightAscension,
  Quantity,
  QuantityWithError,
} from "../core/Astronomy";
import { CardActionsMenu, CatalogCardAction } from "./CardActionsMenu";
import { Plot } from "./Plot";

export type { CatalogCardAction };

function originalDataAction(
  sql: string,
  description: string,
): CatalogCardAction {
  return {
    title: "View original data",
    description,
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <div
        className={
          hasActions ? "flex items-start justify-between gap-2 mb-3" : "mb-3"
        }
      >
        <h3 className="text-base font-semibold min-w-0">{title}</h3>
        {hasActions && <CardActionsMenu actions={actions} />}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items}
      </div>
    </section>
  );
}

export function EquatorialCoordinatesCard({
  catalogs,
  schema,
  pgc,
}: {
  catalogs: Catalogs;
  schema: Schema;
  pgc: number;
}): ReactElement | null {
  const equatorial = catalogs?.coordinates?.equatorial;
  const hasEquatorial =
    equatorial?.ra !== undefined || equatorial?.dec !== undefined;
  if (!hasEquatorial) return null;

  const actions: CatalogCardAction[] = [];

  if (isLoggedIn()) {
    actions.push(
      originalDataAction(
        buildEquatorialSqlQuery(pgc),
        "Open SQL query for underlying equatorial coordinate records",
      ),
    );
  }

  if (equatorial?.ra !== undefined) {
    actions.push({
      title: "Copy RA as HHhMMmSS.SSSSs",
      icon: MdContentCopy,
      onClick: () => {
        void navigator.clipboard.writeText(formatRaForCopy(equatorial.ra));
      },
    });
  }

  if (equatorial?.dec !== undefined) {
    actions.push({
      title: "Copy Dec as DDdMMmSS.SSSSs",
      icon: MdContentCopy,
      onClick: () => {
        void navigator.clipboard.writeText(formatDecForCopy(equatorial.dec));
      },
    });
  }

  if (equatorial?.ra !== undefined && equatorial?.dec !== undefined) {
    actions.push({
      title: "Search in NED",
      icon: MdSearch,
      href: buildNedPositionSearchUrl(equatorial.ra, equatorial.dec),
    });
  }

  return (
    <CatalogCard title="Equatorial" actions={actions}>
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
    </CatalogCard>
  );
}

export function GalacticCoordinatesCard({
  catalogs,
  schema,
}: {
  catalogs: Catalogs;
  schema: Schema;
}): ReactElement | null {
  const galactic = catalogs?.coordinates?.galactic;
  const hasGalactic =
    galactic?.lon !== undefined || galactic?.lat !== undefined;
  if (!hasGalactic) return null;

  return (
    <CatalogCard title="Galactic">
      {galactic?.lon !== undefined && (
        <Field label="l">
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
        <Field label="b">
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

export function RedshiftCard({
  catalogs,
  pgc,
}: {
  catalogs: Catalogs;
  pgc: number;
}): ReactElement | null {
  const redshift = catalogs?.redshift;
  if (!redshift || redshift.z === undefined) return null;

  const actions: CatalogCardAction[] = isLoggedIn()
    ? [
        originalDataAction(
          buildRedshiftSqlQuery(pgc),
          "Open SQL query for underlying redshift records",
        ),
      ]
    : [];

  return (
    <CatalogCard title="Redshift" actions={actions}>
      <Field label="z">
        <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
          {redshift.z?.toFixed(5) || "N/A"}
        </QuantityWithError>
      </Field>
    </CatalogCard>
  );
}

export function VelocitiesCard({
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
    ? [
        originalDataAction(
          buildPhotometryTotalSqlQuery(pgc),
          "Open SQL query for underlying photometry records",
        ),
      ]
    : [];
  const hasActions = actions.length > 0;

  return (
    <div className="col-span-full rounded-lg border border-border bg-surface p-4">
      <div
        className={
          hasActions ? "flex items-start justify-between gap-2 mb-3" : "mb-3"
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
