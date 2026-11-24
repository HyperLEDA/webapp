import { ReactElement } from "react";
import { Catalogs, Geometry } from "@leda/lib/clients/backend";
import { SkyEllipse, SkyViewer } from "@leda/lib/ui";
import { CatalogCard, CatalogNoData } from "./CatalogCard";

const ARCSEC_TO_DEG = 1 / 3600;
const DEFAULT_FOV_DEG = 0.02;
const MIN_FOV_DEG = 0.01;
const D25_COLOR = "#f4d35e";
const RE_COLOR = "#38bdf8";

function fovForSemiMajor(aArcsec: number): number {
  return Math.max(MIN_FOV_DEG, 2 * aArcsec * ARCSEC_TO_DEG * 3);
}

function ellipse(
  ra: number,
  dec: number,
  aArcsec: number,
  bArcsec: number,
  paDeg: number | null | undefined,
  color: string,
): SkyEllipse {
  return {
    ra,
    dec,
    aDeg: aArcsec * ARCSEC_TO_DEG,
    bDeg: bArcsec * ARCSEC_TO_DEG,
    paDeg: paDeg ?? undefined,
    color,
  };
}

function skyEllipses(
  ra: number,
  dec: number,
  geometry: Geometry | null | undefined,
): SkyEllipse[] {
  if (geometry === null || geometry === undefined) {
    return [];
  }
  const ellipses: SkyEllipse[] = [];
  if (
    geometry.a25 !== null &&
    geometry.a25 !== undefined &&
    geometry.b25 !== null &&
    geometry.b25 !== undefined
  ) {
    ellipses.push(
      ellipse(ra, dec, geometry.a25, geometry.b25, geometry.pa25, D25_COLOR),
    );
  }
  if (
    geometry.a_re !== null &&
    geometry.a_re !== undefined &&
    geometry.b_re !== null &&
    geometry.b_re !== undefined
  ) {
    ellipses.push(
      ellipse(ra, dec, geometry.a_re, geometry.b_re, geometry.pa_re, RE_COLOR),
    );
  }
  return ellipses;
}

function fovDeg(geometry: Geometry | null | undefined): number {
  const a25 = geometry?.a25;
  if (a25 !== null && a25 !== undefined) {
    return fovForSemiMajor(a25);
  }
  const aRe = geometry?.a_re;
  if (aRe !== null && aRe !== undefined) {
    return fovForSemiMajor(aRe);
  }
  return DEFAULT_FOV_DEG;
}

export function SkyViewCard({
  catalogs,
  anchorId,
  className,
}: {
  catalogs: Catalogs;
  anchorId?: string;
  className?: string;
}): ReactElement {
  const coordinates = catalogs.coordinates;
  const hasCoordinates = coordinates !== null && coordinates !== undefined;
  const ra = coordinates?.equatorial.ra;
  const dec = coordinates?.equatorial.dec;

  return (
    <CatalogCard
      title="Sky view"
      variant="block"
      anchorId={anchorId}
      className={className}
    >
      {hasCoordinates && ra !== undefined && dec !== undefined ? (
        <SkyViewer
          backend="aladin"
          ra={ra}
          dec={dec}
          fov={fovDeg(catalogs.geometry)}
          ellipses={skyEllipses(ra, dec, catalogs.geometry)}
          className="w-full aspect-square"
        />
      ) : (
        <CatalogNoData />
      )}
    </CatalogCard>
  );
}
