import { ReactElement } from "react";
import { CommonTable } from "./common-table";
import { Catalogs, Schema } from "../../clients/backend/types.gen";

interface CatalogDataProps {
  catalogs: Catalogs;
  schema: Schema;
}

function formatValueWithError(
  value: number | undefined,
  error: number | undefined,
  unit?: string,
  decimalPlaces: number = 0,
): string {
  if (value === undefined) return "NULL";
  const formattedValue = value.toFixed(decimalPlaces);
  const formattedError =
    error?.toFixed(decimalPlaces) || "0".padEnd(decimalPlaces + 1, "0");

  if (!unit) {
    return `${formattedValue} ± ${formattedError}`;
  }

  return `${formattedValue} ${unit} ± ${formattedError} ${unit}`;
}

function CatalogHeader({ title }: { title: string }): ReactElement {
  return <h2 className="text-xl font-bold">{title}</h2>;
}

export function CatalogData({
  catalogs,
  schema,
}: CatalogDataProps): ReactElement {
  if (!catalogs) return <div />;

  const columns = [{ name: "Parameter" }, { name: "Value" }];

  const data = [];

  if (catalogs?.coordinates) {
    data.push(
      {
        Parameter: "Equatorial RA",
        Value: formatValueWithError(
          catalogs.coordinates.equatorial?.ra,
          catalogs.coordinates.equatorial?.e_ra,
          schema.units.coordinates?.equatorial?.ra,
          2,
        ),
      },
      {
        Parameter: "Equatorial Dec",
        Value: formatValueWithError(
          catalogs.coordinates.equatorial?.dec,
          catalogs.coordinates.equatorial?.e_dec,
          schema.units.coordinates?.equatorial?.dec,
          2,
        ),
      },
      {
        Parameter: "Galactic l",
        Value: formatValueWithError(
          catalogs.coordinates.galactic?.lon,
          catalogs.coordinates.galactic?.e_lon,
          schema.units.coordinates?.galactic?.lon,
          2,
        ),
      },
      {
        Parameter: "Galactic b",
        Value: formatValueWithError(
          catalogs.coordinates.galactic?.lat,
          catalogs.coordinates.galactic?.e_lat,
          schema.units.coordinates?.galactic?.lat,
          2,
        ),
      },
    );
  }

  if (catalogs?.redshift) {
    data.push({
      Parameter: "Redshift z",
      Value: formatValueWithError(
        catalogs.redshift.z,
        catalogs.redshift.e_z,
        undefined,
        5,
      ),
    });
  }

  if (catalogs?.velocity) {
    data.push(
      {
        Parameter: "Heliocentric Velocity",
        Value: formatValueWithError(
          catalogs.velocity.heliocentric?.v,
          catalogs.velocity.heliocentric?.e_v,
          schema.units.velocity?.heliocentric?.v,
        ),
      },
      {
        Parameter: "Local Group Velocity",
        Value: formatValueWithError(
          catalogs.velocity.local_group?.v,
          catalogs.velocity.local_group?.e_v,
          schema.units.velocity?.local_group?.v,
        ),
      },
      {
        Parameter: "CMB (old) Velocity",
        Value: formatValueWithError(
          catalogs.velocity.cmb_old?.v,
          catalogs.velocity.cmb_old?.e_v,
          schema.units.velocity?.cmb_old?.v,
        ),
      },
      {
        Parameter: "CMB Velocity",
        Value: formatValueWithError(
          catalogs.velocity.cmb?.v,
          catalogs.velocity.cmb?.e_v,
          schema.units.velocity?.cmb?.v,
        ),
      },
    );
  }

  return <CommonTable columns={columns} data={data} />;
}
