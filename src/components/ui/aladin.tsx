import classNames from "classnames";
import { useEffect, useRef } from "react";

interface AladinViewerProps {
  ra?: number;
  dec?: number;
  fov?: number;
  survey?: string;
  target?: string;
  className?: string;
}

export function AladinViewer({
  ra,
  dec,
  fov = 0.5,
  survey = "P/DSS2/color",
  target,
  className = "w-full h-96",
}: AladinViewerProps) {
  const aladinDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aladinDivRef.current || !window.A) return;

    try {
      const aladin = window.A.aladin(aladinDivRef.current, {
        survey,
        fov,
        showReticle: false,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: false,
        showCooGridControl: false,
      });

      if (target) {
        aladin.gotoObject(target);
      } else if (ra !== undefined && dec !== undefined) {
        aladin.gotoRaDec(ra, dec);
      }
    } catch (error) {
      console.error("Error initializing Aladin:", error);
    }
  }, [ra, dec, fov, survey, target]);

  return (
    <div ref={aladinDivRef} className={classNames("border", className)} />
  );
}

declare global {
  interface Window {
    A: any;
  }
}
