import classNames from "classnames";
import { useEffect, useRef } from "react";

interface AdditionalSource {
  ra: number;
  dec: number;
  label: string;
  description?: string;
}

interface AladinViewerProps {
  ra: number;
  dec: number;
  fov?: number;
  survey?: string;
  className?: string;
  additionalSources?: AdditionalSource[];
}

export function AladinViewer({
  ra,
  dec,
  fov = 0.5,
  survey = "P/DSS2/color",
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

      aladin.gotoRaDec(ra, dec);

      if (additionalSources && additionalSources.length > 0) {
        const nameCatalog = window.A.catalog({
          labelColumn: "name",
          shape: "cross",
          color: "black",
          displayLabel: true,
          labelColor: "lightgrey",
          labelFont: "14px sans-serif",
        });
        const descrCatalog = window.A.catalog({
          color: "black",
          shape: "cross",
        });
        aladin.addCatalog(nameCatalog);
        aladin.addCatalog(descrCatalog);

        additionalSources.forEach((source) => {
          if (source.description) {
            descrCatalog.addSources([
              window.A.marker(source.ra, source.dec, {
                name: source.label,
                popupTitle: source.label,
                popupDesc: source.description,
              }),
            ]);
          }
          nameCatalog.addSources(
            window.A.source(source.ra, source.dec, { name: source.label }),
          );
        });
      }
    } catch (error) {
      console.error("Error initializing Aladin:", error);
    }
  }, [ra, dec, fov, survey, additionalSources]);

  return <div ref={aladinDivRef} className={classNames("border", className)} />;
}

interface AladinCatalog {
  addSources: (sources: AladinSource | AladinSource[]) => void;
}

interface AladinSource {
  ra: number;
  dec: number;
  properties?: { name?: string; popupTitle?: string; popupDesc?: string };
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
        sourceSize?: number;
        shape?: string;
        color?: string;
      }) => AladinCatalog;
      source: (
        ra: number,
        dec: number,
        properties?: { name?: string },
      ) => AladinSource;
      marker: (
        ra: number,
        dec: number,
        properties?: { name?: string; popupTitle?: string; popupDesc?: string },
      ) => AladinSource;
    };
  }
}
