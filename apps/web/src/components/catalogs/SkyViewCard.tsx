import { ReactElement } from "react";
import { Catalogs } from "@leda/lib/clients/backend";
import { AladinViewer } from "@leda/lib/ui";
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
  const coordinates = catalogs.coordinates;
  const hasCoordinates = coordinates !== null && coordinates !== undefined;

  return (
    <CatalogCard
      title="Sky view"
      variant="block"
      anchorId={anchorId}
      className={className}
    >
      {hasCoordinates ? (
        <AladinViewer
          ra={coordinates.equatorial.ra}
          dec={coordinates.equatorial.dec}
          fov={0.02}
          className="w-full aspect-square border-0"
        />
      ) : (
        <CatalogNoData />
      )}
    </CatalogCard>
  );
}
