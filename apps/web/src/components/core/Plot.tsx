import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { MdInfo } from "react-icons/md";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { AppTooltip } from "@leda/lib/ui";
import { useTheme } from "../../hooks/useTheme";

export interface PlotSeries {
  x: number[];
  y: number[];
  yErrors?: (number | null)[];
  details?: string[];
  color?: string;
  label?: string;
}

export interface PlotVLine {
  x: number;
  label?: string;
}

export interface PlotViewProps {
  series: PlotSeries[];
  xLabel: string;
  yLabel: string;
  invertY: boolean;
  logX: boolean;
  vlines?: PlotVLine[];
  className?: string;
}

interface AlignedSeries {
  y: (number | null)[];
  yErrors?: (number | null)[];
  details?: (string | null)[];
  color: string;
  label?: string;
}

interface AlignedPlotData {
  x: number[];
  series: AlignedSeries[];
}

interface ActivePoint {
  seriesIdx: number;
  xIdx: number;
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

function yRangeWithMultipleSeries(
  aligned: AlignedPlotData,
): (_u: uPlot, dataMin: number, dataMax: number) => uPlot.Range.MinMax {
  return (_u, dataMin, dataMax) => {
    let min = dataMin;
    let max = dataMax;

    for (const series of aligned.series) {
      for (let i = 0; i < series.y.length; i++) {
        const yVal = series.y[i];
        if (yVal === null) {
          continue;
        }

        min = Math.min(min, yVal);
        max = Math.max(max, yVal);

        const err = series.yErrors?.[i];
        if (err !== null && err !== undefined && err > 0) {
          min = Math.min(min, yVal - err);
          max = Math.max(max, yVal + err);
        }
      }
    }

    return paddedRange(min, max);
  };
}

interface PlotColors {
  text: string;
  subtle: string;
  grid: string;
  accent: string;
}

interface AxisStrokeOptions {
  stroke: string;
  font: string;
  labelFont: string;
  grid: uPlot.Axis.Grid;
  ticks: uPlot.Axis.Ticks;
  border: uPlot.Axis.Border;
}

interface PointTooltipPosition {
  left: number;
  top: number;
}

function readCssToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function getPlotColors(): PlotColors {
  return {
    text: readCssToken("--token-primary"),
    subtle: readCssToken("--token-subtle"),
    grid: readCssToken("--token-border"),
    accent: readCssToken("--token-accent"),
  };
}

function axisStrokeOptions(colors: PlotColors): AxisStrokeOptions {
  return {
    stroke: colors.text,
    font: AXIS_VALUE_FONT,
    labelFont: AXIS_LABEL_FONT,
    grid: { show: true, stroke: colors.grid, width: 1 },
    ticks: { show: true, stroke: colors.subtle, width: 1, size: 5 },
    border: { show: false },
  };
}

function trimSeries(series: PlotSeries): PlotSeries {
  const { x, y, yErrors, details, color, label } = series;
  const length = Math.min(x.length, y.length);
  return {
    x: x.slice(0, length),
    y: y.slice(0, length),
    yErrors: yErrors ? yErrors.slice(0, length) : undefined,
    details: details ? details.slice(0, length) : undefined,
    color,
    label,
  };
}

function alignMultipleSeries(
  seriesList: PlotSeries[],
  defaultColor: string,
): AlignedPlotData {
  const trimmed = seriesList.map(trimSeries).filter((s) => s.x.length > 0);
  const allX = new Set<number>();

  for (const series of trimmed) {
    for (const xVal of series.x) {
      allX.add(xVal);
    }
  }

  const x = [...allX].sort((a, b) => a - b);
  const alignedSeries = trimmed.map((series) => {
    const xToIndex = new Map(series.x.map((xVal, index) => [xVal, index]));

    return {
      y: x.map((xVal) => {
        const index = xToIndex.get(xVal);
        return index === undefined ? null : series.y[index];
      }),
      yErrors: series.yErrors
        ? x.map((xVal) => {
            const index = xToIndex.get(xVal);
            if (index === undefined) {
              return null;
            }
            return series.yErrors?.[index] ?? null;
          })
        : undefined,
      details: series.details
        ? x.map((xVal) => {
            const index = xToIndex.get(xVal);
            if (index === undefined) {
              return null;
            }
            return series.details?.[index] ?? null;
          })
        : undefined,
      color: series.color ?? defaultColor,
      label: series.label,
    };
  });

  return { x, series: alignedSeries };
}

function findNearestPoint(
  u: uPlot,
  mouseLeft: number,
  mouseTop: number,
): { seriesIdx: number; xIdx: number } | null {
  const xData = u.data[0];
  let nearestSeriesIdx: number | null = null;
  let nearestXIdx: number | null = null;
  let nearestDistance = HIT_RADIUS;

  for (let seriesIdx = 1; seriesIdx < u.data.length; seriesIdx++) {
    if (u.series[seriesIdx].show === false) {
      continue;
    }

    const yData = u.data[seriesIdx];

    for (let i = 0; i < xData.length; i++) {
      const yVal = yData[i];
      if (yVal === null || yVal === undefined) {
        continue;
      }

      const xVal = xData[i];
      const pointLeft = u.valToPos(xVal, "x");
      const pointTop = u.valToPos(yVal, "y");
      const distance = Math.hypot(pointLeft - mouseLeft, pointTop - mouseTop);

      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearestSeriesIdx = seriesIdx - 1;
        nearestXIdx = i;
      }
    }
  }

  if (nearestSeriesIdx === null || nearestXIdx === null) {
    return null;
  }

  return { seriesIdx: nearestSeriesIdx, xIdx: nearestXIdx };
}

function getPointTooltipPosition(
  u: uPlot,
  wrapper: HTMLElement,
  uPlotSeriesIdx: number,
  xIdx: number,
): PointTooltipPosition {
  const xVal = u.data[0][xIdx];
  // SAFETY: Only called after hit-testing confirmed a non-null y value at this index.
  const yVal = u.data[uPlotSeriesIdx][xIdx] as number;
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
  if (seriesIdx < 1 || !yErrors) {
    return;
  }

  const { ctx } = u;
  const xData = u.data[0];
  const yData = u.data[seriesIdx];

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < xData.length; i++) {
    const err = yErrors[i];
    const yVal = yData[i];
    if (err === null || err <= 0 || yVal === null || yVal === undefined) {
      continue;
    }

    const xVal = xData[i];
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
  const alignedRef = useRef<AlignedPlotData>({ x: [], series: [] });
  const hiddenSeriesRef = useRef<boolean[]>([]);
  const { effectiveTheme } = useTheme();
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<boolean[]>([]);

  const aligned = useMemo(
    () => alignMultipleSeries(series, getPlotColors().accent),
    [series],
  );

  alignedRef.current = aligned;
  hiddenSeriesRef.current = hiddenSeries;

  useEffect(() => {
    setHiddenSeries((prev) => {
      const count = aligned.series.length;
      if (prev.length === count) {
        return prev;
      }
      return Array<boolean>(count).fill(false);
    });
  }, [aligned.series.length]);

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || aligned.x.length === 0) {
      return undefined;
    }

    const colors = getPlotColors();
    const data: uPlot.AlignedData = [
      aligned.x,
      ...aligned.series.map((s) => s.y),
    ];
    const axisStyle = axisStrokeOptions(colors);

    const topPadding = vlines.length > 0 ? VLINE_TOP_PADDING : 0;
    const yScale: uPlot.Scale = {
      range: yRangeWithMultipleSeries(aligned),
    };
    if (invertY) {
      yScale.dir = -1;
    }

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
        y: yScale,
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
        ...aligned.series.map((s) => ({
          paths: () => null,
          points: {
            show: true,
            size: MARKER_SIZE,
            stroke: s.color,
            fill: s.color,
          },
        })),
      ],
      legend: {
        show: false,
      },
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
            if (seriesIdx < 1 || u.series[seriesIdx].show === false) {
              return;
            }
            const alignedSeries = alignedRef.current.series[seriesIdx - 1];
            drawYErrorBars(
              u,
              seriesIdx,
              alignedSeries.yErrors,
              alignedSeries.color,
            );
          },
        ],
      },
    };

    plotRef.current = new uPlot(options, data, container);

    for (let i = 0; i < hiddenSeriesRef.current.length; i++) {
      if (hiddenSeriesRef.current[i]) {
        plotRef.current.setSeries(i + 1, { show: false });
      }
    }

    function handleMouseMove(event: MouseEvent): void {
      const plotAligned = alignedRef.current;
      const u = plotRef.current;
      const plotWrapper = wrapperRef.current;

      if (!u || !plotWrapper) {
        setActivePoint(null);
        return;
      }

      const overRect = u.over.getBoundingClientRect();
      const mouseLeft = event.clientX - overRect.left;
      const mouseTop = event.clientY - overRect.top;

      const hit = findNearestPoint(u, mouseLeft, mouseTop);
      if (hit === null) {
        setActivePoint(null);
        return;
      }

      const details = plotAligned.series[hit.seriesIdx]?.details?.[hit.xIdx];
      if (!details) {
        setActivePoint(null);
        return;
      }

      const position = getPointTooltipPosition(
        u,
        plotWrapper,
        hit.seriesIdx + 1,
        hit.xIdx,
      );
      setActivePoint({ seriesIdx: hit.seriesIdx, xIdx: hit.xIdx, ...position });
    }

    function handleMouseLeave(): void {
      setActivePoint(null);
    }

    plotRef.current.over.addEventListener("mousemove", handleMouseMove);
    plotRef.current.over.addEventListener("mouseleave", handleMouseLeave);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth || container.offsetWidth;
      if (width > 0) {
        plotRef.current?.setSize({ width, height: PLOT_HEIGHT });
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
    activePoint !== null
      ? aligned.series[activePoint.seriesIdx]?.details?.[activePoint.xIdx]
      : undefined;

  const hasLegend = aligned.series.some((s) => s.label);

  function toggleSeriesVisibility(seriesIdx: number): void {
    setHiddenSeries((prev) => {
      const next = [...prev];
      next[seriesIdx] = !next[seriesIdx];
      plotRef.current?.setSeries(seriesIdx + 1, { show: !next[seriesIdx] });
      return next;
    });
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`.trim()}>
      {hasLegend && (
        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-muted">
          {aligned.series.map((s, seriesIdx) =>
            s.label ? (
              <button
                key={s.label}
                type="button"
                onClick={() => toggleSeriesVisibility(seriesIdx)}
                className={`inline-flex items-center gap-1.5 transition-opacity hover:text-primary ${
                  hiddenSeries[seriesIdx] ? "opacity-50 line-through" : ""
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </button>
            ) : null,
          )}
        </div>
      )}
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
  private seriesList: PlotSeries[] = [];
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
    color?: string,
    label?: string,
  ): this {
    this.seriesList.push({ x, y, yErrors, details, color, label });
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

  toProps(className?: string): PlotViewProps {
    return {
      series: this.seriesList,
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

export function readPlotCssToken(name: string): string {
  return readCssToken(name);
}
