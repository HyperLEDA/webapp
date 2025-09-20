import { ReactElement } from "react";
import { CommonTable, Column } from "./common-table";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import {
  Declination,
  RightAscension,
  Value,
  ValueWithError,
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
          <ValueWithError
            error={catalogs.coordinates.equatorial?.e_ra}
            unit={schema.units.coordinates?.equatorial?.ra || "deg"}
          >
            <RightAscension value={catalogs.coordinates.equatorial.ra} />
          </ValueWithError>
        ),
      });
    }

    if (catalogs.coordinates.equatorial?.dec !== undefined) {
      data.push({
        Parameter: "Equatorial Dec",
        Value: (
          <ValueWithError
            error={catalogs.coordinates.equatorial?.e_dec}
            unit={schema.units.coordinates?.equatorial?.dec || "deg"}
          >
            <Declination value={catalogs.coordinates.equatorial.dec} />
          </ValueWithError>
        ),
      });
    }

    data.push(
      {
        Parameter: "Galactic l",
        Value: (
          <ValueWithError
            error={catalogs.coordinates.galactic?.e_lon}
            unit={schema.units.coordinates?.galactic?.lon}
          >
            <Value
              value={catalogs.coordinates.galactic?.lon?.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lon}
            />
          </ValueWithError>
        ),
      },
      {
        Parameter: "Galactic b",
        Value: (
          <ValueWithError
            error={catalogs.coordinates.galactic?.e_lat}
            unit={schema.units.coordinates?.galactic?.lat}
          >
            <Value
              value={catalogs.coordinates.galactic?.lat?.toFixed(2)}
              unit={schema.units.coordinates?.galactic?.lat}
            />
          </ValueWithError>
        ),
      },
    );
  }

  if (catalogs?.redshift) {
    data.push({
      Parameter: "Redshift z",
      Value: (
        <ValueWithError error={catalogs.redshift.e_z} decimalPlaces={5}>
          {catalogs.redshift.z?.toFixed(5) || "N/A"}
        </ValueWithError>
      ),
    });
  }

  if (catalogs?.velocity) {
    data.push(
      {
        Parameter: "Heliocentric Velocity",
        Value: (
          <ValueWithError
            error={catalogs.velocity.heliocentric?.e_v}
            unit={schema.units.velocity?.heliocentric?.v}
          >
            <Value
              value={catalogs.velocity.heliocentric?.v?.toFixed(0)}
              unit={schema.units.velocity.heliocentric?.v}
            />
          </ValueWithError>
        ),
      },
      {
        Parameter: "Local Group Velocity",
        Value: (
          <ValueWithError
            error={catalogs.velocity.local_group?.e_v}
            unit={schema.units.velocity?.local_group?.v}
          >
            <Value
              value={catalogs.velocity.local_group?.v?.toFixed(0)}
              unit={schema.units.velocity.local_group?.v}
            />
          </ValueWithError>
        ),
      },
      {
        Parameter: "CMB (old) Velocity",
        Value: (
          <ValueWithError
            error={catalogs.velocity.cmb_old?.e_v}
            unit={schema.units.velocity?.cmb_old?.v}
          >
            <Value
              value={catalogs.velocity.cmb_old?.v?.toFixed(0)}
              unit={schema.units.velocity.cmb_old?.v}
            />
          </ValueWithError>
        ),
      },
      {
        Parameter: "CMB Velocity",
        Value: (
          <ValueWithError
            error={catalogs.velocity.cmb?.e_v}
            unit={schema.units.velocity?.cmb?.v}
          >
            <Value
              value={catalogs.velocity.cmb?.v?.toFixed(0)}
              unit={schema.units.velocity.cmb?.v}
            />
          </ValueWithError>
        ),
      },
    );
  }

  return <CommonTable columns={columns} data={data} />;
}
