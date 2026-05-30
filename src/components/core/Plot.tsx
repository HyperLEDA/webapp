import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { MdInfo } from "react-icons/md";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useTheme } from "../../hooks/useTheme";
import { AppTooltip } from "../ui/AppTooltip";

export interface PlotSeries {
  x: number[];
  y: number[];
  yErrors?: (number | null)[];
  details?: string[];
}

export interface PlotVLine {
  x: number;
  label?: string;
}

export interface PlotViewProps {
  series: PlotSeries;
  xLabel: string;
  yLabel: string;
  invertY: boolean;
  logX: boolean;
  vlines?: PlotVLine[];
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
const AXIS_PADDING_RATIO = 0.1;
const VLINE_TOP_PADDING = 24;
const VLINE_LABEL_OFFSET = 5;
const AXIS_VALUE_FONT = "12px system-ui, sans-serif";
const AXIS_LABEL_FONT = "600 13px system-ui, sans-serif";
const VLINE_LABEL_FONT = "600 12px system-ui, sans-serif";

function paddedRange(dataMin: number, dataMax: number): uPlot.Range.MinMax {
  const span = dataMax - dataMin;
  const padding =
    span > 0
      ? span * AXIS_PADDING_RATIO
      : Math.abs(dataMin) * AXIS_PADDING_RATIO || 1;

  return [dataMin - padding, dataMax + padding];
}

function paddedXRange(
  _u: uPlot,
  dataMin: number,
  dataMax: number,
): uPlot.Range.MinMax {
  return paddedRange(dataMin, dataMax);
}

function logXRange(
  _u: uPlot,
  dataMin: number,
  dataMax: number,
): uPlot.Range.MinMax {
  return uPlot.rangeLog(dataMin, dataMax, 10, true);
}

function yRangeWithErrors(
  y: number[],
  yErrors?: (number | null)[],
): (_u: uPlot, dataMin: number, dataMax: number) => uPlot.Range.MinMax {
  return (_u, dataMin, dataMax) => {
    let min = dataMin;
    let max = dataMax;

    if (yErrors) {
      for (let i = 0; i < y.length; i++) {
        const err = yErrors[i];
        if (err === null || err === undefined || err <= 0) {
          continue;
        }

        const yVal = y[i];
        if (yVal === null || yVal === undefined) {
          continue;
        }

        min = Math.min(min, yVal - err);
        max = Math.max(max, yVal + err);
      }
    }

    return paddedRange(min, max);
  };
}

function readCssToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function getPlotColors(): {
  text: string;
  subtle: string;
  grid: string;
  accent: string;
} {
  return {
    text: readCssToken("--token-primary", "#e5e7eb"),
    subtle: readCssToken("--token-subtle", "#d1d5db"),
    grid: readCssToken("--token-border", "#4b5563"),
    accent: readCssToken("--token-accent", "#646cff"),
  };
}

function axisStrokeOptions(colors: ReturnType<typeof getPlotColors>): {
  stroke: string;
  font: string;
  labelFont: string;
  grid: uPlot.Axis.Grid;
  ticks: uPlot.Axis.Ticks;
  border: uPlot.Axis.Border;
} {
  return {
    stroke: colors.text,
    font: AXIS_VALUE_FONT,
    labelFont: AXIS_LABEL_FONT,
    grid: { show: true, stroke: colors.grid, width: 1 },
    ticks: { show: true, stroke: colors.subtle, width: 1, size: 5 },
    border: { show: false },
  };
}

function alignSeriesData(series: PlotSeries): PlotSeries {
  const { x, y, yErrors, details } = series;
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

function drawVLines(
  u: uPlot,
  vlines: PlotVLine[],
  lineColor: string,
  labelColor: string,
): void {
  const { ctx } = u;
  const xScale = u.scales.x;
  const xMin = xScale.min;
  const xMax = xScale.max;

  if (xMin === undefined || xMax === undefined) {
    return;
  }

  const plotTop = u.bbox.top;
  const plotBottom = plotTop + u.bbox.height;
  const labelY = plotTop + VLINE_LABEL_OFFSET;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = VLINE_LABEL_FONT;

  for (const line of vlines) {
    if (line.x <= 0) {
      continue;
    }
    if (line.x < xMin || line.x > xMax) {
      continue;
    }

    const xPos = u.valToPos(line.x, "x", true);

    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(xPos, plotTop);
    ctx.lineTo(xPos, plotBottom);
    ctx.stroke();

    if (line.label) {
      ctx.fillStyle = labelColor;
      ctx.fillText(line.label, xPos, labelY);
    }
  }

  ctx.restore();
}

export function PlotView({
  series,
  xLabel,
  yLabel,
  invertY,
  logX,
  vlines = [],
  className = "",
}: PlotViewProps): ReactElement | null {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const detailsRef = useRef(series.details);
  const { effectiveTheme } = useTheme();
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  const aligned = useMemo(() => alignSeriesData(series), [series]);

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

    const topPadding = vlines.length > 0 ? VLINE_TOP_PADDING : 0;

    const options: uPlot.Options = {
      width: container.clientWidth || container.offsetWidth,
      height: PLOT_HEIGHT,
      padding: [topPadding, 8, 8, 8],
      scales: {
        x: {
          time: false,
          ...(logX
            ? {
                distr: 3,
                log: 10,
                range: logXRange,
              }
            : { range: paddedXRange }),
        },
        y: {
          range: yRangeWithErrors(aligned.y, aligned.yErrors),
          ...(invertY ? { dir: -1 } : {}),
        },
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
        draw: [
          (u) => {
            if (vlines.length > 0) {
              drawVLines(u, vlines, colors.grid, colors.text);
            }
          },
        ],
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
  }, [aligned, invertY, logX, vlines, xLabel, yLabel, effectiveTheme]);

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

export class PlotBuilder {
  private series: PlotSeries[] = [];
  private vlinesList: PlotVLine[] = [];
  private invertYFlag = false;
  private logXFlag = false;
  private xLabelText = "";
  private yLabelText = "";
  private classNameText = "";

  plot(
    x: number[],
    y: number[],
    yErrors?: (number | null)[],
    details?: string[],
  ): this {
    this.series.push({ x, y, yErrors, details });
    return this;
  }

  vlines(lines: PlotVLine[]): this {
    this.vlinesList = lines;
    return this;
  }

  invertY(): this {
    this.invertYFlag = true;
    return this;
  }

  logX(): this {
    this.logXFlag = true;
    return this;
  }

  xlabel(label: string): this {
    this.xLabelText = label;
    return this;
  }

  ylabel(label: string): this {
    this.yLabelText = label;
    return this;
  }

  toProps(className?: string): PlotViewProps | null {
    const primary = this.series[0];
    if (!primary) {
      return null;
    }

    return {
      series: primary,
      xLabel: this.xLabelText,
      yLabel: this.yLabelText,
      invertY: this.invertYFlag,
      logX: this.logXFlag,
      vlines: this.vlinesList.length > 0 ? this.vlinesList : undefined,
      className: className ?? this.classNameText,
    };
  }
}

export function createPlot(): PlotBuilder {
  return new PlotBuilder();
}
