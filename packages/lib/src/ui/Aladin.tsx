import classNames from "classnames";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const ALADIN_SURVEYS = [
  {
    label: "DESI Legacy",
    survey: "CDS/P/DESI-Legacy-Surveys/DR10/color",
  },
  {
    label: "SDSS",
    survey: "CDS/P/SDSS9/color",
  },
  {
    label: "Pan-STARRS1",
    survey: "CDS/P/PanSTARRS/DR1/color-i-r-g",
  },
  {
    label: "DSS",
    survey: "CDS/P/DSS2/color",
  },
  {
    label: "2MASS",
    survey: "CDS/P/2MASS/color",
  },
  {
    label: "unWISE",
    survey: "CDS/P/unWISE/color-W2-W1W2-W1",
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
  id?: string | number;
  description?: string;
}

interface AladinViewerProps {
  ra: number;
  dec: number;
  fov?: number;
  survey?: string;
  className?: string;
  additionalSources?: AdditionalSource[];
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
  on: (
    event: "objectClicked",
    callback: (object: AladinSource | null) => void,
  ) => void;
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
    const additionalSourcesKey = JSON.stringify(additionalSources ?? []);

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
      if (!aladinDivRef.current || !window.A) {
        return undefined;
      }

      try {
        aladinDivRef.current.replaceChildren();

        const {
          ra: initialRa,
          dec: initialDec,
          fov: initialFov,
        } = viewRef.current;
        const aladin = window.A.aladin(aladinDivRef.current, {
          survey: selectedSurvey,
          fov: initialFov,
          showReticle: false,
          showZoomControl: true,
          showFullscreenControl: false,
          showLayersControl: true,
          showCooGridControl: false,
        });

        aladin.gotoRaDec(initialRa, initialDec);
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
          const nameCatalog = window.A.catalog({
            [ALADIN_MARKER_STYLE]: drawSourceWithLabel,
            color: "black",
            displayLabel: false,
            sourceSize: SOURCE_SIZE,
          });
          const descrCatalog = window.A.catalog({
            color: "black",
            [ALADIN_MARKER_STYLE]: "cross",
          });
          aladin.addCatalog(nameCatalog);
          aladin.addCatalog(descrCatalog);

          sources.forEach((source) => {
            const data: AladinSourceData = {
              name: source.label,
              id: source.id,
            };
            if (source.description) {
              descrCatalog.addSources([
                window.A.marker(source.ra, source.dec, {
                  ...data,
                  popupTitle: source.label,
                  popupDesc: source.description,
                }),
              ]);
            }
            nameCatalog.addSources(
              window.A.source(source.ra, source.dec, data),
            );
          });
        }
      } catch (error) {
        console.error("Error initializing Aladin:", error);
        aladinRef.current = null;
      }

      return () => {
        aladinRef.current = null;
      };
    }, [selectedSurvey, additionalSourcesKey]);

    useEffect(() => {
      const aladin = aladinRef.current;
      if (!aladin) return;

      aladin.setFov(fov);
      aladin.gotoRaDec(ra, dec);
    }, [ra, dec, fov]);

    return (
      <div ref={containerRef} className="space-y-2">
        <div ref={aladinDivRef} className={classNames("border", className)} />
        <select
          value={selectedSurvey}
          onChange={(event) => setSelectedSurvey(event.target.value)}
          className="bg-surface-2 border border-border rounded px-3 py-2 text-primary text-sm w-full"
          aria-label="Image survey"
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
    };
  }
}
