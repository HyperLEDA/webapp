import { ReactElement } from "react";
import { CommonTable } from "./common-table";
import { Catalogs, Schema } from "../../clients/backend/types.gen";

interface CatalogDataProps {
  catalogs: Catalogs;
  schema: Schema;
}

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

function CatalogHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}): ReactElement {
  return (
    <>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-gray-300">{description}</p>
    </>
  );
}

function CoordinatesCatalog({
  catalogs,
  schema,
}: {
  catalogs: Catalogs;
  schema: Schema;
}): ReactElement {
  const coordinatesColumns = [
    { name: "Type" },
    { name: "RA / l" },
    { name: "Dec / b" },
  ];

  const coordinatesData = [
    {
      Type: "Equatorial",
      "RA / l": formatCoordinate(
        catalogs?.coordinates?.equatorial?.ra,
        catalogs?.coordinates?.equatorial?.e_ra,
        schema.units.coordinates?.equatorial?.ra,
      ),
      "Dec / b": formatCoordinate(
        catalogs?.coordinates?.equatorial?.dec,
        catalogs?.coordinates?.equatorial?.e_dec,
        schema.units.coordinates?.equatorial?.dec,
      ),
    },
    {
      Type: "Galactic",
      "RA / l": formatCoordinate(
        catalogs?.coordinates?.galactic?.lon,
        catalogs?.coordinates?.galactic?.e_lon,
        schema.units.coordinates?.galactic?.lon,
      ),
      "Dec / b": formatCoordinate(
        catalogs?.coordinates?.galactic?.lat,
        catalogs?.coordinates?.galactic?.e_lat,
        schema.units.coordinates?.galactic?.lat,
      ),
    },
  ];

  return (
    <CommonTable columns={coordinatesColumns} data={coordinatesData}>
      <CatalogHeader
        title="Coordinates"
        description="Celestial coordinates of the object"
      />
    </CommonTable>
  );
}

function RedshiftCatalog({ catalogs }: { catalogs: Catalogs }): ReactElement {
  const redshiftColumns = [
    { name: "Parameter" },
    { name: "Value" },
    { name: "Error" },
  ];

  const redshiftData = [
    {
      Parameter: "z",
      Value: catalogs?.redshift?.z?.toFixed(6) || "NULL",
      Error: catalogs?.redshift?.e_z?.toFixed(6) || "NULL",
    },
  ];

  return (
    <CommonTable columns={redshiftColumns} data={redshiftData}>
      <CatalogHeader title="Redshift" description="Redshift measurements" />
    </CommonTable>
  );
}

function VelocityCatalog({
  catalogs,
  schema,
}: {
  catalogs: Catalogs;
  schema: Schema;
}): ReactElement {
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
      Value: catalogs?.velocity?.heliocentric?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.heliocentric?.v || "NULL",
      Error: catalogs?.velocity?.heliocentric?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.heliocentric?.e_v || "NULL",
    },
    {
      Parameter: "Local Group",
      Value: catalogs?.velocity?.local_group?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.local_group?.v || "NULL",
      Error: catalogs?.velocity?.local_group?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.local_group?.e_v || "NULL",
    },
    {
      Parameter: "CMB (old)",
      Value: catalogs?.velocity?.cmb_old?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.cmb_old?.v || "NULL",
      Error: catalogs?.velocity?.cmb_old?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.cmb_old?.e_v || "NULL",
    },
    {
      Parameter: "CMB",
      Value: catalogs?.velocity?.cmb?.v?.toFixed(2) || "NULL",
      Unit: schema.units.velocity?.cmb?.v || "NULL",
      Error: catalogs?.velocity?.cmb?.e_v?.toFixed(2) || "NULL",
      "Error unit": schema.units.velocity?.cmb?.e_v || "NULL",
    },
  ];

  return (
    <CommonTable columns={velocityColumns} data={velocityData}>
      <CatalogHeader
        title="Velocity"
        description="Velocity measurements with respect to different apexes"
      />
    </CommonTable>
  );
}

export function CatalogData({
  catalogs,
  schema,
}: CatalogDataProps): ReactElement {
  if (!catalogs) return <div />;

  return (
    <div className="space-y-6">
      {catalogs?.coordinates && (
        <CoordinatesCatalog catalogs={catalogs} schema={schema} />
      )}

      {catalogs?.redshift && <RedshiftCatalog catalogs={catalogs} />}

      {catalogs?.velocity && (
        <VelocityCatalog catalogs={catalogs} schema={schema} />
      )}
    </div>
  );
}
