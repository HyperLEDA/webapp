import {
  equatorialToGalactic,
  zToHeliocentricVelocity,
} from "@leda/lib/astronomy";
import type {
  Catalogs as BackendCatalogs,
  Schema as BackendSchema,
} from "@leda/lib/clients/backend";
import type {
  Catalogs,
  CrossmatchTriageStatus,
  PgcCandidate,
  RecordCatalogValues,
  RecordCrossmatchMetadata,
  RecordCrossmatchStatus,
  RecordSchema,
} from "../clients/admin";

export interface CrossmatchView {
  record_id: string;
  status: RecordCrossmatchStatus;
  triage_status: CrossmatchTriageStatus;
  metadata: RecordCrossmatchMetadata;
  catalogs: Catalogs;
}

interface DerivedCrossmatch {
  status: RecordCrossmatchStatus;
  metadata: RecordCrossmatchMetadata;
}

export function crossmatchStatus(
  triageStatus: CrossmatchTriageStatus,
  candidatePgcs: number[],
) {
  if (triageStatus === "unprocessed") {
    return {
      status: "unprocessed",
      metadata: {},
    } satisfies DerivedCrossmatch;
  }
  if (candidatePgcs.length === 0) {
    return { status: "new", metadata: {} } satisfies DerivedCrossmatch;
  }
  if (candidatePgcs.length === 1) {
    return {
      status: "existing",
      metadata: { pgc: candidatePgcs[0] },
    } satisfies DerivedCrossmatch;
  }
  return {
    status: "collided",
    metadata: { possible_matches: candidatePgcs },
  } satisfies DerivedCrossmatch;
}

export function recordCatalogsToCrossmatch(
  catalogs: RecordCatalogValues,
): Catalogs {
  const result: Catalogs = {
    designation: catalogs.designation,
    nature: catalogs.nature,
    coordinates: null,
    redshift: null,
    velocity: null,
  };

  if (catalogs.icrs) {
    const galactic = equatorialToGalactic(
      catalogs.icrs.ra,
      catalogs.icrs.dec,
      catalogs.icrs.ra_error,
      catalogs.icrs.dec_error,
    );
    result.coordinates = {
      equatorial: {
        ra: catalogs.icrs.ra,
        dec: catalogs.icrs.dec,
        e_ra: catalogs.icrs.ra_error,
        e_dec: catalogs.icrs.dec_error,
      },
      galactic: {
        lon: galactic.lon,
        lat: galactic.lat,
        e_lon: galactic.eLon,
        e_lat: galactic.eLat,
      },
    };
  }

  if (catalogs.redshift) {
    const velocity = zToHeliocentricVelocity(
      catalogs.redshift.z,
      catalogs.redshift.z_error,
    );
    result.redshift = {
      z: catalogs.redshift.z,
      e_z: catalogs.redshift.z_error,
    };
    result.velocity = {
      heliocentric: { v: velocity.v, e_v: velocity.eV },
    };
  }

  return result;
}

export function candidateCatalogs(catalogs: BackendCatalogs): Catalogs {
  const heliocentric = catalogs.velocity?.heliocentric;
  return {
    designation: catalogs.designation ?? null,
    coordinates: catalogs.coordinates
      ? {
          equatorial: catalogs.coordinates.equatorial,
          galactic: catalogs.coordinates.galactic,
        }
      : null,
    redshift: catalogs.redshift ?? null,
    velocity: heliocentric ? { heliocentric } : null,
    nature: catalogs.nature ? { type_name: catalogs.nature.type_name } : null,
  };
}

export function candidatesInRequestOrder(
  requestedPgcs: number[],
  objects: { pgc: number; catalogs: BackendCatalogs }[],
): PgcCandidate[] {
  const byPgc = new Map(objects.map((object) => [object.pgc, object]));
  return requestedPgcs.map((pgc) => {
    const object = byPgc.get(pgc);
    return {
      pgc,
      catalogs: object ? candidateCatalogs(object.catalogs) : {},
    };
  });
}

export function schemaFromRecord(recordSchema: RecordSchema): BackendSchema {
  const units = recordSchema.catalogs.icrs.unit;
  return {
    units: {
      coordinates: {
        equatorial: {
          ra: units.ra || "deg",
          dec: units.dec || "deg",
          e_ra: units.ra_error || "deg",
          e_dec: units.dec_error || "deg",
        },
        galactic: {
          lon: "deg",
          lat: "deg",
          e_lon: "arcsec",
          e_lat: "arcsec",
        },
        supergalactic: {
          lon: "deg",
          lat: "deg",
          e_lon: "arcsec",
          e_lat: "arcsec",
        },
      },
      velocity: {
        heliocentric: { v: "km/s", e_v: "km/s" },
      },
    },
  };
}
