import classNames from "classnames";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Loading } from "./Loading";
import type { SkyViewerHandle, SkyViewerProps } from "./SkyViewer";

const WWT_SCRIPT_URL = "https://web.wwtassets.org/engine/7/wwtsdk.js";
const MARKER_MARGIN_PX = 16;

const WWT_SURVEYS = [
  {
    label: "Pan-STARRS1",
    survey: "PanSTARRS1 3pi",
  },
  {
    label: "SDSS",
    survey: "SDSS: Sloan Digital Sky Survey (Optical) [DR7]",
  },
  {
    label: "DSS",
    survey: "Digitized Sky Survey (Color)",
  },
  {
    label: "2MASS",
    survey: "2Mass: Imagery (Infrared)",
  },
  {
    label: "WISE",
    survey: "WISE All Sky (Infrared)",
  },
] as const;

const DEFAULT_WWT_SURVEY = WWT_SURVEYS[0].survey;

let wwtScriptPromise: Promise<void> | null = null;
let wwtEngineReady = false;

function loadWwtScript(): Promise<void> {
  if (window.wwtlib) {
    return Promise.resolve();
  }
  if (wwtScriptPromise) {
    return wwtScriptPromise;
  }

  wwtScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WWT_SCRIPT_URL}"]`,
    );
    if (existing) {
      if (window.wwtlib) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load WWT")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WWT_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.wwtlib) {
        resolve();
        return;
      }
      wwtScriptPromise = null;
      reject(new Error("WWT failed to initialize"));
    };
    script.onerror = () => {
      wwtScriptPromise = null;
      reject(new Error("Failed to load WWT"));
    };
    document.head.appendChild(script);
  });

  return wwtScriptPromise;
}

function fovToZoom(fovDeg: number): number {
  return fovDeg * 6;
}

function raDegToHours(raDeg: number): number {
  return raDeg / 15;
}

type WwtScriptInterface = {
  add_ready: (callback: () => void) => void;
  remove_ready: (callback: () => void) => void;
};

type WwtControl = {
  canvas?: HTMLCanvasElement;
  gotoRADecZoom: (
    raHours: number,
    decDeg: number,
    zoom: number,
    instant: boolean,
  ) => void;
  setBackgroundImageByName: (name: string) => void;
  getScreenPointForCoordinates: (
    raHours: number,
    decDeg: number,
  ) => { x: number; y: number };
  renderContext: {
    get_RA: () => number;
    get_dec: () => number;
  };
};

type WwtBuilder = {
  startRenderLoop: (value: boolean) => void;
  initialView: (latDeg: number, lngDeg: number, zoom: number) => void;
  create: () => WwtScriptInterface;
};

type WwtSettings = {
  set_showConstellationFigures: (value: boolean) => boolean;
  set_showConstellationBoundries: (value: boolean) => boolean;
  set_showConstellationSelection: (value: boolean) => boolean;
  set_showConstellationPictures: (value: boolean) => boolean;
  set_showConstellationLabels: (value: boolean) => boolean;
  set_showCrosshairs: (value: boolean) => boolean;
  set_showHorizon: (value: boolean) => boolean;
};

type WwtLibrary = {
  Settings: {
    get_current: () => WwtSettings;
  };
  WWTControl: {
    singleton: WwtControl;
    scriptInterface?: WwtScriptInterface;
  };
  WWTControlBuilder: new (divId: string) => WwtBuilder;
};

declare global {
  interface Window {
    wwtlib?: WwtLibrary;
  }
}

type WwtViewerProps = Omit<SkyViewerProps, "backend">;

function showSurvey(name: string): void {
  window.wwtlib?.WWTControl.singleton.setBackgroundImageByName(name);
}

function hideOverlays(): void {
  const settings = window.wwtlib?.Settings.get_current();
  if (!settings) {
    return;
  }
  settings.set_showConstellationFigures(false);
  settings.set_showConstellationBoundries(false);
  settings.set_showConstellationSelection(false);
  settings.set_showConstellationPictures(false);
  settings.set_showConstellationLabels(false);
  settings.set_showCrosshairs(false);
  settings.set_showHorizon(false);
}

function angularSeparationDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  const ra1Rad = (ra1 * Math.PI) / 180;
  const dec1Rad = (dec1 * Math.PI) / 180;
  const ra2Rad = (ra2 * Math.PI) / 180;
  const dec2Rad = (dec2 * Math.PI) / 180;
  const cosSep =
    Math.sin(dec1Rad) * Math.sin(dec2Rad) +
    Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad);
  return (Math.acos(Math.min(1, Math.max(-1, cosSep))) * 180) / Math.PI;
}

function placeMarkers(host: HTMLElement, overlay: HTMLElement): void {
  const control = window.wwtlib?.WWTControl.singleton;
  if (!control) {
    return;
  }

  const width = host.clientWidth;
  const height = host.clientHeight;
  const cameraRa = control.renderContext.get_RA() * 15;
  const cameraDec = control.renderContext.get_dec();
  const markers = overlay.children;

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers.item(index);
    if (!(marker instanceof HTMLElement)) {
      continue;
    }
    const ra = Number(marker.dataset.ra);
    const dec = Number(marker.dataset.dec);
    const point = control.getScreenPointForCoordinates(ra / 15, dec);
    const visible =
      angularSeparationDeg(ra, dec, cameraRa, cameraDec) < 90 &&
      point.x >= -MARKER_MARGIN_PX &&
      point.y >= -MARKER_MARGIN_PX &&
      point.x <= width + MARKER_MARGIN_PX &&
      point.y <= height + MARKER_MARGIN_PX;
    marker.style.display = visible ? "block" : "none";
    marker.style.transform = `translate(${point.x}px, ${point.y}px)`;
  }
}

function attachEngine(
  host: HTMLElement,
  ra: number,
  dec: number,
  fov: number,
): WwtScriptInterface {
  const wwt = window.wwtlib;
  if (!wwt) {
    throw new Error("WWT failed to initialize");
  }

  const control = wwt.WWTControl.singleton;
  if (control.canvas && control.canvas.parentElement !== host) {
    host.replaceChildren(control.canvas);
  }

  let script = wwt.WWTControl.scriptInterface;
  if (!control.canvas) {
    const builder = new wwt.WWTControlBuilder(host.id);
    builder.startRenderLoop(true);
    builder.initialView(dec, ra, fovToZoom(fov));
    script = builder.create();
  }

  if (!script) {
    throw new Error("WWT failed to initialize");
  }
  return script;
}

export const WwtViewer = forwardRef<SkyViewerHandle, WwtViewerProps>(
  function WwtViewer(
    {
      ra,
      dec,
      fov = 0.5,
      className = "w-full h-96",
      additionalSources,
      onSourceClick,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const scriptRef = useRef<WwtScriptInterface | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef({ ra, dec, fov });
    const onSourceClickRef = useRef(onSourceClick);
    const hostId = useId().replace(/:/g, "");
    const [scriptReady, setScriptReady] = useState(false);
    const [engineReady, setEngineReady] = useState(wwtEngineReady);
    const [scriptError, setScriptError] = useState(false);
    const [selectedSurvey, setSelectedSurvey] =
      useState<string>(DEFAULT_WWT_SURVEY);
    const selectedSurveyRef = useRef(selectedSurvey);
    const additionalSourcesKey = JSON.stringify(additionalSources ?? []);

    viewRef.current = { ra, dec, fov };
    selectedSurveyRef.current = selectedSurvey;

    useImperativeHandle(ref, () => ({
      locate(targetRa: number, targetDec: number, targetFov = 0.5) {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        window.wwtlib?.WWTControl.singleton.gotoRADecZoom(
          raDegToHours(targetRa),
          targetDec,
          fovToZoom(targetFov),
          true,
        );
      },
    }));

    useEffect(() => {
      onSourceClickRef.current = onSourceClick;
    }, [onSourceClick]);

    useEffect(() => {
      let cancelled = false;

      loadWwtScript()
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
      const host = hostRef.current;
      if (!scriptReady || !host) {
        return undefined;
      }
      const element = host;

      let cancelled = false;
      const {
        ra: initialRa,
        dec: initialDec,
        fov: initialFov,
      } = viewRef.current;

      function mountEngine(): WwtScriptInterface | null {
        try {
          const mounted = attachEngine(
            element,
            initialRa,
            initialDec,
            initialFov,
          );
          scriptRef.current = mounted;
          return mounted;
        } catch {
          return null;
        }
      }

      const script = mountEngine();
      if (!script) {
        setScriptError(true);
        return undefined;
      }

      function onReady(): void {
        hideOverlays();
        showSurvey(selectedSurveyRef.current);
        wwtEngineReady = true;
        if (!cancelled) {
          setEngineReady(true);
        }
      }
      script.add_ready(onReady);
      if (wwtEngineReady) {
        setEngineReady(true);
      }

      return () => {
        cancelled = true;
        script.remove_ready(onReady);
        scriptRef.current = null;
      };
    }, [scriptReady]);

    useEffect(() => {
      if (!engineReady || !scriptReady) {
        return;
      }
      hideOverlays();
      showSurvey(selectedSurvey);
    }, [engineReady, scriptReady, selectedSurvey]);

    useEffect(() => {
      if (!engineReady || !scriptReady) {
        return;
      }
      window.wwtlib?.WWTControl.singleton.gotoRADecZoom(
        raDegToHours(ra),
        dec,
        fovToZoom(fov),
        true,
      );
    }, [engineReady, scriptReady, ra, dec, fov]);

    useEffect(() => {
      const host = hostRef.current;
      const overlay = overlayRef.current;
      if (!engineReady || !scriptReady || !host || !overlay) {
        return undefined;
      }
      const element = host;
      const markers = overlay;

      let frame = 0;
      function tick(): void {
        placeMarkers(element, markers);
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(frame);
      };
    }, [engineReady, scriptReady, additionalSourcesKey]);

    return (
      <div ref={containerRef} className="space-y-2">
        <div
          ref={hostRef}
          id={hostId}
          className={classNames(
            "relative border overflow-hidden [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full",
            className,
          )}
        >
          {!engineReady && !scriptError ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface">
              <Loading message="Loading sky viewer..." />
            </div>
          ) : null}
          {scriptError ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface text-subtle text-sm">
              Failed to load sky viewer
            </div>
          ) : null}
          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 z-20"
          >
            {(additionalSources ?? []).map((source) => (
              <div
                key={`${source.id ?? source.label}-${source.ra}-${source.dec}`}
                data-ra={source.ra}
                data-dec={source.dec}
                className="absolute left-0 top-0 hidden h-0 w-0"
              >
                <button
                  type="button"
                  title={source.label}
                  className={classNames(
                    "pointer-events-auto absolute left-0 top-0 h-0 w-0",
                    source.id === undefined
                      ? "cursor-default"
                      : "cursor-pointer",
                  )}
                  onClick={() => {
                    if (source.id !== undefined) {
                      onSourceClickRef.current?.(source.id);
                    }
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    className="absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2 overflow-visible"
                  >
                    <path
                      d="M1 1 L11 11 M11 1 L1 11"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1 1 L11 11 M11 1 L1 11"
                      stroke="#111111"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute left-2 top-0 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-white [text-shadow:0_0_2px_#000,1px_0_0_#000,-1px_0_0_#000,0_1px_0_#000,0_-1px_0_#000]">
                    {source.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
        <select
          value={selectedSurvey}
          onChange={(event) => setSelectedSurvey(event.target.value)}
          className="bg-surface-2 border border-border rounded px-3 py-2 text-primary text-sm w-full"
          aria-label="Image survey"
          disabled={!engineReady}
        >
          {WWT_SURVEYS.map((option) => (
            <option key={option.survey} value={option.survey}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);
