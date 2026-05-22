import classNames from "classnames";
import { useEffect, useRef } from "react";

const SOURCE_SIZE = 8;
const LABEL_FONT = "14px sans-serif";
const LABEL_PADDING_X = 4;
const LABEL_PADDING_Y = 2;

function drawCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const half = size / 2;
  const left = x - half;
  const top = y - half;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + size - 1, top + size - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left + size - 1, top);
  ctx.lineTo(left, top + size - 1);
  ctx.stroke();
}

function drawLabelWithBackground(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  ctx.font = LABEL_FONT;
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || 11;
  const descent = metrics.actualBoundingBoxDescent || 3;
  const textWidth = metrics.width;
  const textHeight = ascent + descent;

  const bgX = x;
  const bgY = y - ascent - LABEL_PADDING_Y;
  const bgWidth = textWidth + LABEL_PADDING_X * 2;
  const bgHeight = textHeight + LABEL_PADDING_Y * 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bgX + 0.5, bgY + 0.5, bgWidth - 1, bgHeight - 1);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(text, x + LABEL_PADDING_X, y);
}

type AladinCanvasSource = {
  x: number;
  y: number;
  data?: { name?: string };
};

function drawSourceWithLabel(
  source: AladinCanvasSource,
  ctx: CanvasRenderingContext2D,
): void {
  drawCross(ctx, source.x, source.y, SOURCE_SIZE, "black");

  const label = source.data?.name;
  if (!label) {
    return;
  }

  drawLabelWithBackground(ctx, label, source.x + SOURCE_SIZE / 2, source.y);
}

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
  survey = "CDS/P/DESI-Legacy-Surveys/DR10/color",
  className = "w-full h-96",
  additionalSources,
}: AladinViewerProps) {
  const aladinDivRef = useRef<HTMLDivElement>(null);
  const additionalSourcesKey = JSON.stringify(additionalSources ?? []);

  useEffect(() => {
    if (!aladinDivRef.current || !window.A) return;

    try {
      aladinDivRef.current.replaceChildren();

      const aladin = window.A.aladin(aladinDivRef.current, {
        survey,
        fov,
        showReticle: false,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: true,
        showCooGridControl: false,
      });

      aladin.gotoRaDec(ra, dec);

      if (additionalSources && additionalSources.length > 0) {
        const nameCatalog = window.A.catalog({
          shape: drawSourceWithLabel,
          color: "black",
          displayLabel: false,
          sourceSize: SOURCE_SIZE,
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
  }, [ra, dec, fov, survey, additionalSourcesKey]);

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
        displayLabel?: boolean;
        sourceSize?: number;
        shape?:
          | string
          | ((
              source: AladinCanvasSource,
              ctx: CanvasRenderingContext2D,
            ) => void);
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
