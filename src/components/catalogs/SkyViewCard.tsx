import { ReactElement } from "react";
import { Catalogs } from "../../clients/backend/types.gen";
import { AladinViewer } from "../core/Aladin";
import { CatalogCard } from "./CatalogCard";

export function SkyViewCard({
  catalogs,
  anchorId,
  className,
}: {
  catalogs: Catalogs;
  anchorId?: string;
  className?: string;
}): ReactElement | null {
  const equatorial = catalogs?.coordinates?.equatorial;
  if (equatorial?.ra === undefined || equatorial?.dec === undefined) {
    return null;
  }

  return (
    <CatalogCard
      title="Sky view"
      variant="block"
      anchorId={anchorId}
      className={className}
    >
      <AladinViewer
        ra={equatorial.ra}
        dec={equatorial.dec}
        fov={0.02}
        className="w-full aspect-square border-0"
      />
    </CatalogCard>
  );
}
