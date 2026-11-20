import classNames from "classnames";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Loading } from "./Loading";

const ALADIN_SCRIPT_URL =
  "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";

let aladinScriptPromise: Promise<void> | null = null;

function loadAladinScript(): Promise<void> {
  if (window.A) {
    return Promise.resolve();
  }
  if (aladinScriptPromise) {
    return aladinScriptPromise;
  }

  aladinScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${ALADIN_SCRIPT_URL}"]`,
    );
    if (existing) {
      if (window.A) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Aladin")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = ALADIN_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.A) {
        resolve();
        return;
      }
      aladinScriptPromise = null;
      reject(new Error("Aladin failed to initialize"));
    };
    script.onerror = () => {
      aladinScriptPromise = null;
      reject(new Error("Failed to load Aladin"));
    };
    document.head.appendChild(script);
  });

  return aladinScriptPromise;
}

const ALADIN_SURVEYS = [
  {
    label: "DSS",
    survey: "https://skies.esac.esa.int/DSSColor",
  },
  {
    label: "2MASS",
    survey: "https://skies.esac.esa.int/2MASS/Color",
  },
] as const;

const DEFAULT_ALADIN_SURVEY = ALADIN_SURVEYS[0].survey;
const ALADIN_MARKER_STYLE = "shape" as const;

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

type AladinSourceData = {
  name?: string;
  id?: string | number;
  color?: string;
  popupTitle?: string;
  popupDesc?: string;
};

type AladinCanvasSource = {
  x: number;
  y: number;
  data?: AladinSourceData;
};

function drawSourceWithLabel(
  source: AladinCanvasSource,
  ctx: CanvasRenderingContext2D,
): void {
  drawCross(
    ctx,
    source.x,
    source.y,
    SOURCE_SIZE,
    source.data?.color ?? "black",
  );

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
  id?: string | number;
  description?: string;
  color?: string;
}

interface SkyEllipse {
  ra: number;
  dec: number;
  aDeg: number;
  bDeg: number;
  paDeg?: number;
  color?: string;
}

interface AladinViewerProps {
  ra: number;
  dec: number;
  fov?: number;
  survey?: string;
  className?: string;
  additionalSources?: AdditionalSource[];
  ellipses?: SkyEllipse[];
  onSourceClick?: (id: string | number) => void;
}

export type AladinViewerHandle = {
  locate: (ra: number, dec: number, fov?: number) => void;
};

type AladinInstance = {
  gotoObject: (target: string) => void;
  gotoRaDec: (ra: number, dec: number) => void;
  setFov: (fov: number) => void;
  addCatalog: (catalog: AladinCatalog) => void;
  addOverlay: (overlay: AladinGraphicOverlay) => void;
  on: (
    event: "objectClicked",
    callback: (object: AladinSource | null) => void,
  ) => void;
};

type AladinGraphicOverlay = {
  add: (ellipse: AladinEllipse | AladinEllipse[]) => void;
};

type AladinEllipse = {
  ra: number;
  dec: number;
};

export const AladinViewer = forwardRef<AladinViewerHandle, AladinViewerProps>(
  function AladinViewer(
    {
      ra,
      dec,
      fov = 0.5,
      survey = DEFAULT_ALADIN_SURVEY,
      className = "w-full h-96",
      additionalSources,
      ellipses,
      onSourceClick,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const aladinDivRef = useRef<HTMLDivElement>(null);
    const aladinRef = useRef<AladinInstance | null>(null);
    const viewRef = useRef({ ra, dec, fov });
    const onSourceClickRef = useRef(onSourceClick);
    const [selectedSurvey, setSelectedSurvey] = useState(survey);
    const [scriptReady, setScriptReady] = useState(() => Boolean(window.A));
    const [scriptError, setScriptError] = useState(false);
    const additionalSourcesKey = JSON.stringify(additionalSources ?? []);
    const ellipsesKey = JSON.stringify(ellipses ?? []);

    viewRef.current = { ra, dec, fov };

    useImperativeHandle(ref, () => ({
      locate(targetRa: number, targetDec: number, targetFov = 0.5) {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        const aladin = aladinRef.current;
        if (!aladin) return;
        aladin.setFov(targetFov);
        aladin.gotoRaDec(targetRa, targetDec);
      },
    }));

    useEffect(() => {
      onSourceClickRef.current = onSourceClick;
    }, [onSourceClick]);

    useEffect(() => {
      setSelectedSurvey(survey);
    }, [survey]);

    useEffect(() => {
      let cancelled = false;

      loadAladinScript()
        .then(() => {
          if (!cancelled) {
            setScriptReady(true);
            setScriptError(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setScriptError(true);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      const aladinApi = window.A;
      if (!scriptReady || !aladinApi || !aladinDivRef.current) {
        return undefined;
      }

      try {
        aladinDivRef.current.replaceChildren();

        const {
          ra: initialRa,
          dec: initialDec,
          fov: initialFov,
        } = viewRef.current;
        const aladin = aladinApi.aladin(aladinDivRef.current, {
          survey: selectedSurvey,
          fov: initialFov,
          showReticle: false,
          showZoomControl: true,
          showFullscreenControl: false,
          showLayersControl: true,
          showCooGridControl: false,
        });

        aladin.gotoRaDec(initialRa, initialDec);
        aladin.setFov(initialFov);
        aladinRef.current = aladin;

        aladin.on("objectClicked", (object) => {
          const id = object?.data?.id;
          if (id === undefined) {
            return;
          }
          onSourceClickRef.current?.(id);
        });

        // SAFETY: additionalSourcesKey is JSON.stringify of AdditionalSource[].
        const sources = JSON.parse(additionalSourcesKey) as AdditionalSource[];
        if (sources.length > 0) {
          const nameCatalog = aladinApi.catalog({
            [ALADIN_MARKER_STYLE]: drawSourceWithLabel,
            color: "black",
            displayLabel: false,
            sourceSize: SOURCE_SIZE,
          });
          const descrCatalog = aladinApi.catalog({
            color: "black",
            [ALADIN_MARKER_STYLE]: "cross",
          });
          aladin.addCatalog(nameCatalog);
          aladin.addCatalog(descrCatalog);

          sources.forEach((source) => {
            const data: AladinSourceData = {
              name: source.label,
              id: source.id,
              color: source.color,
            };
            if (source.description) {
              descrCatalog.addSources([
                aladinApi.marker(source.ra, source.dec, {
                  ...data,
                  popupTitle: source.label,
                  popupDesc: source.description,
                }),
              ]);
            }
            nameCatalog.addSources(
              aladinApi.source(source.ra, source.dec, data),
            );
          });
        }

        // SAFETY: ellipsesKey is JSON.stringify of SkyEllipse[].
        const skyEllipses = JSON.parse(ellipsesKey) as SkyEllipse[];
        skyEllipses.forEach((ellipse) => {
          const overlay = aladinApi.graphicOverlay({
            color: ellipse.color ?? "#38bdf8",
            lineWidth: 2,
          });
          aladin.addOverlay(overlay);
          overlay.add(
            aladinApi.ellipse(
              ellipse.ra,
              ellipse.dec,
              ellipse.aDeg,
              ellipse.bDeg,
              ellipse.paDeg ?? 0,
            ),
          );
        });
      } catch (error) {
        console.error("Error initializing Aladin:", error);
        aladinRef.current = null;
      }

      return () => {
        aladinRef.current = null;
      };
    }, [scriptReady, selectedSurvey, additionalSourcesKey, ellipsesKey]);

    useEffect(() => {
      const aladin = aladinRef.current;
      const host = aladinDivRef.current;
      if (!aladin || !host) {
        return undefined;
      }

      function applyView(): void {
        const current = aladinRef.current;
        if (!current) {
          return;
        }
        current.setFov(viewRef.current.fov);
        current.gotoRaDec(viewRef.current.ra, viewRef.current.dec);
      }

      applyView();

      let settled = false;
      const observer = new ResizeObserver(() => {
        if (settled || host.clientWidth < 32 || host.clientHeight < 32) {
          return;
        }
        settled = true;
        applyView();
        observer.disconnect();
      });
      observer.observe(host);

      function settleAfterPaint(): void {
        const node = aladinDivRef.current;
        if (
          settled ||
          node === null ||
          node.clientWidth < 32 ||
          node.clientHeight < 32
        ) {
          return;
        }
        settled = true;
        applyView();
        observer.disconnect();
      }

      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(settleAfterPaint);
      });
      const timer = window.setTimeout(() => {
        settleAfterPaint();
        applyView();
      }, 100);

      return () => {
        settled = true;
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
        observer.disconnect();
      };
    }, [
      ra,
      dec,
      fov,
      scriptReady,
      selectedSurvey,
      additionalSourcesKey,
      ellipsesKey,
    ]);

    return (
      <div ref={containerRef} className="space-y-2">
        {!scriptReady && !scriptError ? (
          <div className={classNames("border", className)}>
            <Loading message="Loading sky viewer..." />
          </div>
        ) : scriptError ? (
          <div
            className={classNames(
              "border flex items-center justify-center text-subtle text-sm",
              className,
            )}
          >
            Failed to load sky viewer
          </div>
        ) : (
          <div ref={aladinDivRef} className={classNames("border", className)} />
        )}
        <select
          value={selectedSurvey}
          onChange={(event) => setSelectedSurvey(event.target.value)}
          className="bg-surface-2 border border-border rounded px-3 py-2 text-primary text-sm w-full"
          aria-label="Image survey"
          disabled={!scriptReady}
        >
          {ALADIN_SURVEYS.map((option) => (
            <option key={option.survey} value={option.survey}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

type AladinMarkerRenderer = (
  source: AladinCanvasSource,
  ctx: CanvasRenderingContext2D,
) => void;

type AladinCatalogOptions = {
  displayLabel?: boolean;
  sourceSize?: number;
  color?: string;
} & Partial<Record<typeof ALADIN_MARKER_STYLE, string | AladinMarkerRenderer>>;

interface AladinCatalog {
  addSources: (sources: AladinSource | AladinSource[]) => void;
}

interface AladinSource {
  ra: number;
  dec: number;
  data?: AladinSourceData;
  properties?: AladinSourceData;
}

declare global {
  interface Window {
    A?: {
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
      ) => AladinInstance;
      catalog: (options?: AladinCatalogOptions) => AladinCatalog;
      source: (
        ra: number,
        dec: number,
        properties?: AladinSourceData,
      ) => AladinSource;
      marker: (
        ra: number,
        dec: number,
        properties?: AladinSourceData,
      ) => AladinSource;
      graphicOverlay: (options?: {
        color?: string;
        lineWidth?: number;
        lineDash?: number[];
      }) => AladinGraphicOverlay;
      ellipse: (
        ra: number,
        dec: number,
        radiusRaDeg: number,
        radiusDecDeg: number,
        rotationDeg: number,
        options?: { color?: string },
      ) => AladinEllipse;
    };
  }
}
