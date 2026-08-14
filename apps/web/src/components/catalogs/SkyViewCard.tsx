import { ReactElement } from "react";
import { Catalogs } from "../../clients/backend/types.gen";
import { AladinViewer } from "../core/Aladin";
import { CatalogCard, CatalogNoData } from "./CatalogCard";

export function SkyViewCard({
  catalogs,
  anchorId,
  className,
}: {
  catalogs: Catalogs;
  anchorId?: string;
  className?: string;
}): ReactElement {
  const equatorial = catalogs?.coordinates?.equatorial;
  const hasCoordinates =
    equatorial?.ra !== undefined && equatorial?.dec !== undefined;

  return (
    <CatalogCard
      title="Sky view"
      variant="block"
      anchorId={anchorId}
      className={className}
    >
      {hasCoordinates ? (
        <AladinViewer
          ra={equatorial.ra}
          dec={equatorial.dec}
          fov={0.02}
          className="w-full aspect-square border-0"
        />
      ) : (
        <CatalogNoData />
      )}
    </CatalogCard>
  );
}
