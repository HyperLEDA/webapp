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

    // Add CSS first
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://aladin.u-strasbg.fr/AladinLite/api/v3/latest/aladin.min.css";
    document.head.appendChild(link);

    // Load Aladin script
    const script = document.createElement("script");
    script.src =
      "https://aladin.u-strasbg.fr/AladinLite/api/v3/latest/aladin.js";
    script.async = true;
    script.onload = () => setAladinLoaded(true);
    document.body.appendChild(script);

    // No cleanup - we want Aladin to stay loaded throughout the app lifetime
  }, []);

  // Initialize the viewer once Aladin is loaded and whenever props change
  useEffect(() => {
    if (!aladinLoaded || !aladinDivRef.current || !window.A) return;

    // Small timeout to ensure Aladin is fully initialized
    const timer = setTimeout(() => {
      try {
        const aladin = window.A.aladin(aladinDivRef.current, {
          survey,
          fov,
          showReticle: true,
          showZoomControl: true,
          showFullscreenControl: true,
          showLayersControl: true,
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

  return <div ref={aladinDivRef} className={className}></div>;
}

// Add TypeScript interface for the Aladin global object
declare global {
  interface Window {
    A: any;
  }
}
