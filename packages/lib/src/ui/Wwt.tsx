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
const MARKER_RADIUS_PX = 6;

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

type WwtCircle = {
  setCenter: (raHours: number, decDeg: number) => void;
  set_radius: (radiusDeg: number) => number;
  set_lineColor: (color: string) => string;
  set_fill: (fill: boolean) => boolean;
  set_id: (id: string) => string;
};

type AnnotationClickArgs = {
  get_id: () => string;
};

type WwtScriptInterface = {
  add_ready: (callback: () => void) => void;
  remove_ready: (callback: () => void) => void;
  add_annotationClicked: (
    callback: (si: WwtScriptInterface, args: AnnotationClickArgs) => void,
  ) => void;
  remove_annotationClicked: (
    callback: (si: WwtScriptInterface, args: AnnotationClickArgs) => void,
  ) => void;
  addAnnotation: (annotation: WwtCircle) => void;
  clearAnnotations: () => void;
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
};

type WwtBuilder = {
  startRenderLoop: (value: boolean) => void;
  initialView: (latDeg: number, lngDeg: number, zoom: number) => void;
  create: () => WwtScriptInterface;
};

type WwtLibrary = {
  Circle: new () => WwtCircle;
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

function markerRadiusDeg(fovDeg: number, heightPx: number): number {
  const height = heightPx > 0 ? heightPx : 400;
  return (MARKER_RADIUS_PX / height) * fovDeg;
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
    const viewRef = useRef({ ra, dec, fov });
    const onSourceClickRef = useRef(onSourceClick);
    const sourceIdsRef = useRef<Map<string, string | number>>(new Map());
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
      const script = scriptRef.current;
      const host = hostRef.current;
      const wwt = window.wwtlib;
      if (!engineReady || !scriptReady || !script || !host || !wwt) {
        return;
      }

      // SAFETY: additionalSourcesKey is JSON.stringify of SkySource[].
      const sources = JSON.parse(additionalSourcesKey) as NonNullable<
        WwtViewerProps["additionalSources"]
      >;
      script.clearAnnotations();

      const radius = markerRadiusDeg(fov, host.clientHeight);
      const ids = new Map<string, string | number>();
      sources.forEach((source, index) => {
        const circle = new wwt.Circle();
        // Circle's default transform treats the first argument as hours.
        circle.setCenter(raDegToHours(source.ra), source.dec);
        circle.set_radius(radius);
        circle.set_lineColor("#000000");
        circle.set_fill(false);
        if (source.id !== undefined) {
          const key = String(index);
          circle.set_id(key);
          ids.set(key, source.id);
        }
        script.addAnnotation(circle);
      });
      sourceIdsRef.current = ids;
    }, [engineReady, scriptReady, additionalSourcesKey, fov]);

    useEffect(() => {
      const script = scriptRef.current;
      if (!engineReady || !scriptReady || !script) {
        return undefined;
      }

      function onAnnotationClicked(
        _si: WwtScriptInterface,
        args: AnnotationClickArgs,
      ): void {
        const id = sourceIdsRef.current.get(args.get_id());
        if (id === undefined) {
          return;
        }
        onSourceClickRef.current?.(id);
      }
      script.add_annotationClicked(onAnnotationClicked);
      return () => {
        script.remove_annotationClicked(onAnnotationClicked);
      };
    }, [engineReady, scriptReady]);

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
