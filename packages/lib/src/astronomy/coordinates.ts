import * as astronomy from "astronomy-engine";

const SPEED_OF_LIGHT_KM_S = 299792.458;
const ARCSEC_PER_DEG = 3600;
const J2000 = new Date(Date.UTC(2000, 0, 1, 12));
const EQJ_TO_GALACTIC = astronomy.Rotation_EQJ_GAL();

export interface HeliocentricVelocity {
  v: number;
  eV: number;
}

export interface GalacticCoordinates {
  lon: number;
  lat: number;
  eLon: number;
  eLat: number;
}

export function zToHeliocentricVelocity(
  z: number,
  redshiftError: number,
): HeliocentricVelocity {
  return {
    v: z * SPEED_OF_LIGHT_KM_S,
    eV: redshiftError * SPEED_OF_LIGHT_KM_S,
  };
}

export function equatorialToGalactic(
  raDeg: number,
  decDeg: number,
  eRaDeg: number,
  eDecDeg: number,
): GalacticCoordinates {
  const equatorial = astronomy.VectorFromSphere(
    new astronomy.Spherical(decDeg, raDeg, 1),
    J2000,
  );
  const galactic = astronomy.SphereFromVector(
    astronomy.RotateVector(EQJ_TO_GALACTIC, equatorial),
  );

  return {
    lon: galactic.lon,
    lat: galactic.lat,
    eLon: eRaDeg * ARCSEC_PER_DEG,
    eLat: eDecDeg * ARCSEC_PER_DEG,
  };
}
