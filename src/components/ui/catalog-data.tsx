import { ReactElement } from "react";
import { CommonTable } from "./common-table";
import { PgcObject, Schema } from "../../clients/backend/types.gen";

interface CatalogDataProps {
  object: PgcObject;
  schema: Schema | null;
}

export function CatalogData({
  object,
  schema,
}: CatalogDataProps): ReactElement {
  if (!object || !schema) return <div />;

  function formatCoordinate(
    value: number | undefined,
    error: number | undefined,
    unit: string | undefined,
  ): string {
    if (value === undefined) return "NULL";
    const formattedValue = value.toFixed(2);
    const formattedError = error?.toFixed(2) || "0.00";
    const unitStr = unit || "deg";
    return `${formattedValue} ${unitStr} +- ${formattedError} ${unitStr}`;
  }

  const coordinatesColumns = [
    { name: "Type" },
    { name: "RA / l" },
    { name: "Dec / b" },
  ];

  const coordinatesData = [
    {
      Type: "Equatorial",
      "RA / l": formatCoordinate(
        object.catalogs?.coordinates?.equatorial?.ra,
        object.catalogs?.coordinates?.equatorial?.e_ra,
        schema.units.coordinates?.equatorial?.ra,
      ),
      "Dec / b": formatCoordinate(
        object.catalogs?.coordinates?.equatorial?.dec,
        object.catalogs?.coordinates?.equatorial?.e_dec,
        schema.units.coordinates?.equatorial?.dec,
      ),
    },
    {
      Type: "Galactic",
      "RA / l": formatCoordinate(
        object.catalogs?.coordinates?.galactic?.lon,
        object.catalogs?.coordinates?.galactic?.e_lon,
        schema.units.coordinates?.galactic?.lon,
      ),
      "Dec / b": formatCoordinate(
        object.catalogs?.coordinates?.galactic?.lat,
        object.catalogs?.coordinates?.galactic?.e_lat,
        schema.units.coordinates?.galactic?.lat,
      ),
    },
  ];

  const redshiftColumns = [
    { name: "Parameter" },
    { name: "Value" },
    { name: "Error" },
  ];

  const redshiftData = [
    {
      Parameter: "z",
      Value: object.catalogs?.redshift?.z?.toFixed(6) || "NULL",
      Error: object.catalogs?.redshift?.e_z?.toFixed(6) || "NULL",
    },
  ];

  const velocityColumns = [
    { name: "Parameter" },
    { name: "Value" },
    { name: "Unit" },
    { name: "Error" },
    { name: "Error unit" },
  ];

  const velocityData = [
    {
      Parameter: "Heliocentric",
      Value: object.catalogs?.velocity?.heliocentric?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.heliocentric?.v || "NULL",
      Error: object.catalogs?.velocity?.heliocentric?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.heliocentric?.e_v || "NULL",
    },
    {
      Parameter: "Local Group",
      Value: object.catalogs?.velocity?.local_group?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.local_group?.v || "NULL",
      Error: object.catalogs?.velocity?.local_group?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.local_group?.e_v || "NULL",
    },
    {
      Parameter: "CMB (old)",
      Value: object.catalogs?.velocity?.cmb_old?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.cmb_old?.v || "NULL",
      Error: object.catalogs?.velocity?.cmb_old?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.cmb_old?.e_v || "NULL",
    },
    {
      Parameter: "CMB",
      Value: object.catalogs?.velocity?.cmb?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.cmb?.v || "NULL",
      Error: object.catalogs?.velocity?.cmb?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.cmb?.e_v || "NULL",
    },
  ];

  return (
    <div className="space-y-6">
      {object.catalogs?.coordinates && (
        <CommonTable columns={coordinatesColumns} data={coordinatesData}>
          <h2 className="text-xl font-bold">Coordinates</h2>
          <p className="text-gray-300">Celestial coordinates of the object</p>
        </CommonTable>
      )}

      {object.catalogs?.redshift && (
        <CommonTable columns={redshiftColumns} data={redshiftData}>
          <h2 className="text-xl font-bold">Redshift</h2>
          <p className="text-gray-300">Redshift measurements</p>
        </CommonTable>
      )}

      {object.catalogs?.velocity && (
        <CommonTable columns={velocityColumns} data={velocityData}>
          <h2 className="text-xl font-bold">Velocity</h2>
          <p className="text-gray-300">
            Velocity measurements with respect to different apexes
          </p>
        </CommonTable>
      )}
    </div>
  );
}
