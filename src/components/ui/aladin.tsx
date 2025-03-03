import classNames from "classnames";
import { useEffect, useRef, useState } from "react";

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
  const [aladinLoaded, setAladinLoaded] = useState(false);

  // Load the Aladin scripts just once when the component mounts
  useEffect(() => {
    // Check if Aladin is already being loaded or already loaded
    if (document.querySelector('script[src*="aladin.js"]') || window.A) {
      setAladinLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://aladin.u-strasbg.fr/AladinLite/api/v3/latest/aladin.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://aladin.u-strasbg.fr/AladinLite/api/v3/latest/aladin.js";
    script.async = true;
    script.onload = () => setAladinLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!aladinLoaded || !aladinDivRef.current || !window.A) return;

    const timer = setTimeout(() => {
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
    }, 100);

    return () => clearTimeout(timer);
  }, [aladinLoaded, ra, dec, fov, survey, target]);

  return (
    <div ref={aladinDivRef} className={classNames("border", className)}>
      {!aladinLoaded && (
        <div className="flex justify-center items-center h-full">
          Loading image...
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    A: unknown;
  }
}
