import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { MdInfo } from "react-icons/md";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useTheme } from "../../hooks/useTheme";
import { AppTooltip } from "../ui/AppTooltip";

interface PlotProps {
  x: number[];
  y: number[];
  yErrors?: (number | null)[];
  details?: string[];
  xLabel: string;
  yLabel: string;
  className?: string;
}

interface ActivePoint {
  index: number;
  left: number;
  top: number;
}

const PLOT_HEIGHT = 320;
const MARKER_SIZE = 9;
const ERROR_CAP_WIDTH = 4;
const HIT_RADIUS = 20;
const X_AXIS_PADDING_RATIO = 0.1;

function paddedXRange(
  _u: uPlot,
  dataMin: number,
  dataMax: number,
): uPlot.Range.MinMax {
  const span = dataMax - dataMin;
  const padding =
    span > 0
      ? span * X_AXIS_PADDING_RATIO
      : Math.abs(dataMin) * X_AXIS_PADDING_RATIO || 1;

  return [dataMin - padding, dataMax + padding];
}

function readCssToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function getPlotColors(): {
  text: string;
  grid: string;
  tick: string;
  accent: string;
} {
  return {
    text: readCssToken("--token-primary"),
    grid: readCssToken("--token-border"),
    tick: readCssToken("--token-muted"),
    accent: readCssToken("--token-accent"),
  };
}

function axisStrokeOptions(colors: ReturnType<typeof getPlotColors>): {
  stroke: string;
  grid: uPlot.Axis.Grid;
  ticks: uPlot.Axis.Ticks;
  border: uPlot.Axis.Border;
} {
  return {
    stroke: colors.text,
    grid: { show: true, stroke: colors.grid, width: 1 },
    ticks: { show: true, stroke: colors.tick, width: 1, size: 4 },
    border: { show: false },
  };
}

function alignSeriesData(
  x: number[],
  y: number[],
  yErrors?: (number | null)[],
  details?: string[],
): {
  x: number[];
  y: number[];
  yErrors: (number | null)[] | undefined;
  details: string[] | undefined;
} {
  const length = Math.min(x.length, y.length);
  return {
    x: x.slice(0, length),
    y: y.slice(0, length),
    yErrors: yErrors ? yErrors.slice(0, length) : undefined,
    details: details ? details.slice(0, length) : undefined,
  };
}

function findNearestPointIndex(
  u: uPlot,
  mouseLeft: number,
  mouseTop: number,
): number | null {
  const xData = u.data[0];
  const yData = u.data[1];
  let nearestIndex: number | null = null;
  let nearestDistance = HIT_RADIUS;

  for (let i = 0; i < xData.length; i++) {
    const xVal = xData[i];
    const yVal = yData[i];
    if (
      xVal === null ||
      xVal === undefined ||
      yVal === null ||
      yVal === undefined
    ) {
      continue;
    }

    const pointLeft = u.valToPos(xVal, "x");
    const pointTop = u.valToPos(yVal, "y");
    const distance = Math.hypot(pointLeft - mouseLeft, pointTop - mouseTop);

    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function getPointTooltipPosition(
  u: uPlot,
  wrapper: HTMLElement,
  index: number,
): { left: number; top: number } {
  const xVal = u.data[0][index] as number;
  const yVal = u.data[1][index] as number;
  const overRect = u.over.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();

  return {
    left: overRect.left - wrapperRect.left + u.valToPos(xVal, "x"),
    top: overRect.top - wrapperRect.top + u.valToPos(yVal, "y"),
  };
}

function drawYErrorBars(
  u: uPlot,
  seriesIdx: number,
  yErrors: (number | null)[] | undefined,
  color: string,
): void {
  if (seriesIdx !== 1 || !yErrors) {
    return;
  }

  const { ctx } = u;
  const xData = u.data[0];
  const yData = u.data[1];

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < xData.length; i++) {
    const err = yErrors[i];
    if (err === null || err === undefined || err <= 0) {
      continue;
    }

    const xVal = xData[i];
    const yVal = yData[i];
    if (
      xVal === null ||
      xVal === undefined ||
      yVal === null ||
      yVal === undefined
    ) {
      continue;
    }

    const xPos = u.valToPos(xVal, "x", true);
    const yTop = u.valToPos(yVal + err, "y", true);
    const yBottom = u.valToPos(yVal - err, "y", true);

    ctx.beginPath();
    ctx.moveTo(xPos, yTop);
    ctx.lineTo(xPos, yBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xPos - ERROR_CAP_WIDTH, yTop);
    ctx.lineTo(xPos + ERROR_CAP_WIDTH, yTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xPos - ERROR_CAP_WIDTH, yBottom);
    ctx.lineTo(xPos + ERROR_CAP_WIDTH, yBottom);
    ctx.stroke();
  }
}

export function Plot({
  x,
  y,
  yErrors,
  details,
  xLabel,
  yLabel,
  className = "",
}: PlotProps): ReactElement | null {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const detailsRef = useRef(details);
  const { effectiveTheme } = useTheme();
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  const aligned = useMemo(
    () => alignSeriesData(x, y, yErrors, details),
    [x, y, yErrors, details],
  );

  detailsRef.current = aligned.details;

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || aligned.x.length === 0) {
      return undefined;
    }

    const colors = getPlotColors();
    const data: uPlot.AlignedData = [aligned.x, aligned.y];
    const axisStyle = axisStrokeOptions(colors);

    const options: uPlot.Options = {
      width: container.clientWidth || container.offsetWidth,
      height: PLOT_HEIGHT,
      scales: {
        x: { time: false, range: paddedXRange },
      },
      axes: [
        {
          label: xLabel,
          ...axisStyle,
        },
        {
          label: yLabel,
          ...axisStyle,
        },
      ],
      series: [
        {},
        {
          paths: () => null,
          points: {
            show: true,
            size: MARKER_SIZE,
            stroke: colors.accent,
            fill: colors.accent,
          },
        },
      ],
      cursor: {
        drag: { x: true, y: true, setScale: true },
      },
      hooks: {
        drawSeries: [
          (u, seriesIdx) => {
            drawYErrorBars(u, seriesIdx, aligned.yErrors, colors.accent);
          },
        ],
      },
    };

    plotRef.current = new uPlot(options, data, container);

    function handleMouseMove(event: MouseEvent): void {
      const plotDetails = detailsRef.current;
      const u = plotRef.current;
      const plotWrapper = wrapperRef.current;

      if (!plotDetails?.length || !u || !plotWrapper) {
        setActivePoint(null);
        return;
      }

      const overRect = u.over.getBoundingClientRect();
      const mouseLeft = event.clientX - overRect.left;
      const mouseTop = event.clientY - overRect.top;

      const index = findNearestPointIndex(u, mouseLeft, mouseTop);
      if (index === null || !plotDetails[index]) {
        setActivePoint(null);
        return;
      }

      const position = getPointTooltipPosition(u, plotWrapper, index);
      setActivePoint({ index, ...position });
    }

    function handleMouseLeave(): void {
      setActivePoint(null);
    }

    plotRef.current.over.addEventListener("mousemove", handleMouseMove);
    plotRef.current.over.addEventListener("mouseleave", handleMouseLeave);

    const resizeObserver = new ResizeObserver(() => {
      if (!plotRef.current || !container) {
        return;
      }

      const width = container.clientWidth || container.offsetWidth;
      if (width > 0) {
        plotRef.current.setSize({ width, height: PLOT_HEIGHT });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      plotRef.current?.over.removeEventListener("mousemove", handleMouseMove);
      plotRef.current?.over.removeEventListener("mouseleave", handleMouseLeave);
      plotRef.current?.destroy();
      plotRef.current = null;
      setActivePoint(null);
    };
  }, [aligned, xLabel, yLabel, effectiveTheme]);

  if (aligned.x.length === 0) {
    return null;
  }

  const activeDetails =
    activePoint !== null ? aligned.details?.[activePoint.index] : undefined;

  return (
    <div ref={wrapperRef} className={`relative ${className}`.trim()}>
      <div ref={containerRef} />
      <div className="absolute top-2 right-2 z-10">
        <AppTooltip
          content="Drag to zoom in. Double-click to reset."
          placement="left"
          className="max-w-xs"
        >
          <button
            type="button"
            aria-label="Plot interaction help"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2/90 text-muted shadow-sm transition-colors hover:border-accent hover:text-primary"
          >
            <MdInfo size={18} />
          </button>
        </AppTooltip>
      </div>
      {activePoint !== null && activeDetails && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm shadow-md whitespace-pre-wrap"
          style={{
            left: activePoint.left,
            top: activePoint.top,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          {activeDetails}
        </div>
      )}
    </div>
  );
}
