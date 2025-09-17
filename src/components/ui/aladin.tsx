import classNames from "classnames";
import { useEffect, useRef } from "react";

interface AdditionalSource {
  ra: number;
  dec: number;
  label: string;
}

interface AladinViewerProps {
  ra?: number;
  dec?: number;
  fov?: number;
  survey?: string;
  target?: string;
  className?: string;
  additionalSources?: AdditionalSource[];
}

export function AladinViewer({
  ra,
  dec,
  fov = 0.5,
  survey = "P/DSS2/color",
  target,
  className = "w-full h-96",
  additionalSources,
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

      if (additionalSources && additionalSources.length > 0) {
        const catalog = window.A.catalog({
          labelColumn: "name",
          displayLabel: true,
          labelColor: "#fff",
          labelFont: "14px sans-serif",
        });
        aladin.addCatalog(catalog);

        additionalSources.forEach((source) => {
          catalog.addSources(
            window.A.source(source.ra, source.dec, { name: source.label }),
          );
        });
      }
    } catch (error) {
      console.error("Error initializing Aladin:", error);
    }
  }, [ra, dec, fov, survey, target, additionalSources]);

  return <div ref={aladinDivRef} className={classNames("border", className)} />;
}

interface AladinCatalog {
  addSources: (sources: AladinSource) => void;
}

interface AladinSource {
  ra: number;
  dec: number;
  properties?: { name?: string };
}

declare global {
  interface Window {
    A: {
      aladin: (
        element: HTMLElement,
        options?: {
          survey?: string;
          fov?: number;
          showReticle?: boolean;
          showZoomControl?: boolean;
          showFullscreenControl?: boolean;
          showLayersControl?: boolean;
          showCooGridControl?: boolean;
        },
      ) => {
        gotoObject: (target: string) => void;
        gotoRaDec: (ra: number, dec: number) => void;
        addCatalog: (catalog: AladinCatalog) => void;
      };
      catalog: (options?: {
        labelColumn?: string;
        displayLabel?: boolean;
        labelColor?: string;
        labelFont?: string;
      }) => AladinCatalog;
      source: (
        ra: number,
        dec: number,
        properties?: { name?: string },
      ) => AladinSource;
    };
  }
}
