import { ReactElement } from "react";
import { CommonTable, Column } from "./common-table";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import {
  Declination,
  RightAscension,
  Quantity,
  QuantityWithError,
} from "./astronomy";

interface CatalogDataProps {
  catalogs: Catalogs;
  schema: Schema;
}

export function CatalogData({
  catalogs,
  schema,
}: CatalogDataProps): ReactElement {
  if (!catalogs) return <div />;

  const columns: Column[] = [{ name: "Parameter" }, { name: "Value" }];

  const data = [];

  if (catalogs?.designation?.name) {
    data.push({
      Parameter: "Name",
      Value: catalogs.designation.name,
    });
  }

  if (catalogs?.coordinates) {
    if (catalogs.coordinates.equatorial?.ra !== undefined) {
      data.push({
        Parameter: "Equatorial RA",
        Value: (
          <QuantityWithError
            error={catalogs.coordinates.equatorial?.e_ra}
            unit={schema.units.coordinates?.equatorial?.ra || "deg"}
          >
            <RightAscension value={catalogs.coordinates.equatorial.ra} />
          </QuantityWithError>
        ),
      });
    }

    if (catalogs.coordinates.equatorial?.dec !== undefined) {
      data.push({
        Parameter: "Equatorial Dec",
        Value: (
          <QuantityWithError
            error={catalogs.coordinates.equatorial?.e_dec}
            unit={schema.units.coordinates?.equatorial?.dec || "deg"}
          >
            <Declination value={catalogs.coordinates.equatorial.dec} />
          </QuantityWithError>
        ),
      });
    }

    data.push(
      {
        Parameter: "Galactic l",
        Value: (
          <QuantityWithError
            error={catalogs.coordinates.galactic?.e_lon}
            unit={schema.units.coordinates?.galactic?.lon}
          >
            <Quantity
              value={catalogs.coordinates.galactic?.lon?.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lon}
            />
          </QuantityWithError>
        ),
      },
      {
        Parameter: "Galactic b",
        Value: (
          <QuantityWithError
            error={catalogs.coordinates.galactic?.e_lat}
            unit={schema.units.coordinates?.galactic?.lat}
          >
            <Quantity
              value={catalogs.coordinates.galactic?.lat?.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lat}
            />
          </QuantityWithError>
        ),
      },
    );
  }

  if (catalogs?.redshift) {
    data.push({
      Parameter: "Redshift z",
      Value: (
        <QuantityWithError error={catalogs.redshift.e_z} decimalPlaces={5}>
          {catalogs.redshift.z?.toFixed(5) || "N/A"}
        </QuantityWithError>
      ),
    });
  }

  if (catalogs?.velocity) {
    data.push(
      {
        Parameter: "Heliocentric Velocity",
        Value: (
          <QuantityWithError
            error={catalogs.velocity.heliocentric?.e_v}
            unit={schema.units.velocity?.heliocentric?.v}
          >
            <Quantity
              value={catalogs.velocity.heliocentric?.v?.toFixed(0)}
              unit={schema.units.velocity.heliocentric?.v}
            />
          </QuantityWithError>
        ),
      },
      {
        Parameter: "Local Group Velocity",
        Value: (
          <QuantityWithError
            error={catalogs.velocity.local_group?.e_v}
            unit={schema.units.velocity?.local_group?.v}
          >
            <Quantity
              value={catalogs.velocity.local_group?.v?.toFixed(0)}
              unit={schema.units.velocity.local_group?.v}
            />
          </QuantityWithError>
        ),
      },
      {
        Parameter: "CMB (old) Velocity",
        Value: (
          <QuantityWithError
            error={catalogs.velocity.cmb_old?.e_v}
            unit={schema.units.velocity?.cmb_old?.v}
          >
            <Quantity
              value={catalogs.velocity.cmb_old?.v?.toFixed(0)}
              unit={schema.units.velocity.cmb_old?.v}
            />
          </QuantityWithError>
        ),
      },
      {
        Parameter: "CMB Velocity",
        Value: (
          <QuantityWithError
            error={catalogs.velocity.cmb?.e_v}
            unit={schema.units.velocity?.cmb?.v}
          >
            <Quantity
              value={catalogs.velocity.cmb?.v?.toFixed(0)}
              unit={schema.units.velocity.cmb?.v}
            />
          </QuantityWithError>
        ),
      },
    );
  }

  return <CommonTable columns={columns} data={data} />;
}
