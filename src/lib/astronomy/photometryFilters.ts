import constants from "./constants.json";

export type PhotometricMagsysGroup = "vega" | "ab";

export interface PhotometricFilterVLine {
  x: number;
  label: string;
}

interface WavelengthQuantity {
  value: number;
  unit: string;
}

interface PhotometricBandConstant {
  name: string;
  wavelength: WavelengthQuantity;
}

interface PhotometricBandGroup {
  description: string;
  bands: PhotometricBandConstant[];
}

const photometricBands = constants.photometricBands as Record<
  PhotometricMagsysGroup,
  PhotometricBandGroup
>;

export function photometryFilterVlines(
  group: PhotometricMagsysGroup,
): PhotometricFilterVLine[] {
  return photometricBands[group].bands.map((band) => ({
    x: band.wavelength.value,
    label: band.name,
  }));
}

export function magsysGroupFromString(
  magsys: string | null | undefined,
): PhotometricMagsysGroup | null {
  if (!magsys) {
    return null;
  }

  const normalized = magsys.toLowerCase();
  if (normalized.includes("ab")) {
    return "ab";
  }
  if (normalized.includes("vega") || normalized.includes("johnson")) {
    return "vega";
  }

  return null;
}

export function magsysGroupFromMeasurements(
  magsysValues: (string | null | undefined)[],
): PhotometricMagsysGroup {
  let abCount = 0;
  let vegaCount = 0;

  for (const magsys of magsysValues) {
    const group = magsysGroupFromString(magsys);
    if (group === "ab") {
      abCount += 1;
    } else if (group === "vega") {
      vegaCount += 1;
    }
  }

  return abCount > vegaCount ? "ab" : "vega";
}
