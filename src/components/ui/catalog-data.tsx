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
    return `${formattedValue} +- ${formattedError}`;
  }

  return `${formattedValue} ${unit} +- ${formattedError} ${unit}`;
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
      "RA / l": formatValueWithError(
        catalogs?.coordinates?.equatorial?.ra,
        catalogs?.coordinates?.equatorial?.e_ra,
        schema.units.coordinates?.equatorial?.ra,
        2,
      ),
      "Dec / b": formatValueWithError(
        catalogs?.coordinates?.equatorial?.dec,
        catalogs?.coordinates?.equatorial?.e_dec,
        schema.units.coordinates?.equatorial?.dec,
        2,
      ),
    },
    {
      Type: "Galactic",
      "RA / l": formatValueWithError(
        catalogs?.coordinates?.galactic?.lon,
        catalogs?.coordinates?.galactic?.e_lon,
        schema.units.coordinates?.galactic?.lon,
        2,
      ),
      "Dec / b": formatValueWithError(
        catalogs?.coordinates?.galactic?.lat,
        catalogs?.coordinates?.galactic?.e_lat,
        schema.units.coordinates?.galactic?.lat,
        2,
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
  const redshiftColumns = [{ name: "Parameter" }, { name: "Value" }];

  const redshiftData = [
    {
      Parameter: "z",
      Value: formatValueWithError(
        catalogs?.redshift?.z,
        catalogs?.redshift?.e_z,
        undefined,
        5,
      ),
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
  const velocityColumns = [{ name: "Parameter" }, { name: "Value" }];

  const velocityData = [
    {
      Parameter: "Heliocentric",
      Value: formatValueWithError(
        catalogs?.velocity?.heliocentric?.v,
        catalogs?.velocity?.heliocentric?.e_v,
        schema.units.velocity?.heliocentric?.v,
      ),
    },
    {
      Parameter: "Local Group",
      Value: formatValueWithError(
        catalogs?.velocity?.local_group?.v,
        catalogs?.velocity?.local_group?.e_v,
        schema.units.velocity?.local_group?.v,
      ),
    },
    {
      Parameter: "CMB (old)",
      Value: formatValueWithError(
        catalogs?.velocity?.cmb_old?.v,
        catalogs?.velocity?.cmb_old?.e_v,
        schema.units.velocity?.cmb_old?.v,
      ),
    },
    {
      Parameter: "CMB",
      Value: formatValueWithError(
        catalogs?.velocity?.cmb?.v,
        catalogs?.velocity?.cmb?.e_v,
        schema.units.velocity?.cmb?.v,
      ),
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
