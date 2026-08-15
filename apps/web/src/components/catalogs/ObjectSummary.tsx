import { ReactElement, ReactNode } from "react";
import { Schema } from "@hyperleda/lib/clients/backend";
import {
  Declination,
  QuantityWithError,
  RightAscension,
} from "../core/Astronomy";

type ObjectSummaryCatalogs = {
  coordinates?: {
    equatorial: {
      ra: number;
      dec: number;
      e_ra: number;
      e_dec: number;
    };
  } | null;
  redshift?: {
    z: number;
    e_z: number;
  } | null;
};

export function ObjectSummary({
  catalogs,
  schema,
  name,
  layout = "rows",
}: {
  catalogs: ObjectSummaryCatalogs;
  schema: Schema;
  name: ReactNode;
  layout?: "rows" | "columnar";
}): ReactElement {
  const equatorial = catalogs?.coordinates?.equatorial;
  const redshift = catalogs?.redshift;
  const raUnit = schema.units.coordinates?.equatorial?.ra || "deg";
  const eRaUnit = schema.units.coordinates?.equatorial?.e_ra || raUnit;
  const eDecUnit = schema.units.coordinates?.equatorial?.e_dec || raUnit;

  const nameField = (
    <>
      <dt className="text-muted">Name</dt>
      <dd>{name}</dd>
    </>
  );

  const raField = equatorial ? (
    <>
      <dt className="text-muted">RA</dt>
      <dd>
        <QuantityWithError error={equatorial.e_ra} unit={eRaUnit}>
          <RightAscension value={equatorial.ra} />
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  const decField = equatorial ? (
    <>
      <dt className="text-muted">Dec</dt>
      <dd>
        <QuantityWithError error={equatorial.e_dec} unit={eDecUnit}>
          <Declination value={equatorial.dec} />
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  const redshiftField = redshift ? (
    <>
      <dt className="text-muted">Redshift</dt>
      <dd>
        <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
          {redshift.z.toFixed(5)}
        </QuantityWithError>
      </dd>
    </>
  ) : null;

  if (layout === "columnar") {
    return (
      <dl className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm">
        <div className="min-w-0">{nameField}</div>
        {raField && <div className="min-w-0">{raField}</div>}
        {decField && <div className="min-w-0">{decField}</div>}
        {redshiftField && <div className="min-w-0">{redshiftField}</div>}
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {nameField}
      {raField}
      {decField}
      {redshiftField}
    </dl>
  );
}
