import { forwardRef } from "react";

import { AladinViewer, type AladinViewerHandle } from "./Aladin";
import { WwtViewer } from "./Wwt";

export type SkyViewerBackend = "aladin" | "wwt";

export type SkySource = {
  ra: number;
  dec: number;
  label: string;
  id?: string | number;
  description?: string;
};

export type SkyViewerProps = {
  backend: SkyViewerBackend;
  ra: number;
  dec: number;
  fov?: number;
  className?: string;
  additionalSources?: SkySource[];
  onSourceClick?: (id: string | number) => void;
};

export type SkyViewerHandle = AladinViewerHandle;

export const SkyViewer = forwardRef<SkyViewerHandle, SkyViewerProps>(
  function SkyViewer({ backend, ...props }, ref) {
    if (backend === "wwt") {
      return <WwtViewer ref={ref} {...props} />;
    }
    return <AladinViewer ref={ref} {...props} />;
  },
);
