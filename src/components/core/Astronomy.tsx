import React, { ReactElement, ReactNode } from "react";

interface QuantityProps {
  value: string | number;
  unit?: string;
  className?: string;
  spaced?: boolean;
}

export function Quantity({
  value,
  unit,
  className,
  spaced = true,
}: QuantityProps): React.ReactElement {
  return (
    <span className={className}>
      {value}
      {unit ? (
        <span>
          {spaced ? " " : ""}
          {unit}
        </span>
      ) : (
        ""
      )}
    </span>
  );
}

interface QuantityWithErrorProps {
  children: ReactNode;
  error: number;
  unit?: string;
  decimalPlaces?: number;
}

export function QuantityWithError({
  children,
  error,
  unit,
  decimalPlaces = 2,
}: QuantityWithErrorProps): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {children} ± <Quantity value={error.toFixed(decimalPlaces)} unit={unit} />
    </div>
  );
}

interface AstronomicalCoordinateProps {
  value: number;
  className?: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatSexagesimalSeconds(seconds: number, decimals: number): string {
  const fixed = seconds.toFixed(decimals);
  const [integerPart, fractionalPart] = fixed.split(".");
  return fractionalPart === undefined
    ? pad2(Number(integerPart))
    : `${pad2(Number(integerPart))}.${fractionalPart}`;
}

function decomposeRa(degrees: number): { h: number; m: number; s: number } {
  const totalSeconds = degrees * 240;
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

function decomposeDec(degrees: number): {
  sign: string;
  d: number;
  m: number;
  s: number;
} {
  const sign = degrees < 0 ? "-" : "+";
  const absDec = Math.abs(degrees);
  const d = Math.floor(absDec);
  const minutesFloat = (absDec - d) * 60;
  const m = Math.floor(minutesFloat);
  const s = (minutesFloat - m) * 60;
  return { sign, d, m, s };
}

export type EquatorialCopyFormat =
  | "sexagesimal-units"
  | "sexagesimal-colon"
  | "sexagesimal-space"
  | "j2000"
  | "decimal-degrees-units"
  | "decimal-degrees";

export const EQUATORIAL_COPY_FORMATS: {
  id: EquatorialCopyFormat;
  title: string;
}[] = [
  { id: "sexagesimal-units", title: "HHh MMm SS.SSs +DDd MM' SS.S\"" },
  { id: "sexagesimal-colon", title: "HH:MM:SS.SS +DD:MM:SS.S" },
  { id: "sexagesimal-space", title: "HH MM SS.SS +DD MM SS.S" },
  { id: "j2000", title: "JHHMMSS.SS+DDMMSS.S" },
  { id: "decimal-degrees-units", title: "DDD.DDDDd +DD.DDDDd" },
  { id: "decimal-degrees", title: "DDD.DDDD +DD.DDDD" },
];

export function formatRaForCopy(degrees: number): string {
  if (isNaN(degrees)) {
    return "N/A";
  }

  const { h, m, s } = decomposeRa(degrees);
  return `${h}h${pad2(m)}m${s.toFixed(4)}s`;
}

export function formatDecForCopy(degrees: number): string {
  if (isNaN(degrees)) {
    return "N/A";
  }

  const { sign, d, m, s } = decomposeDec(degrees);
  return `${sign}${d}d${pad2(m)}m${s.toFixed(4)}s`;
}

export function formatEquatorialForCopy(
  raDegrees: number,
  decDegrees: number,
  format: EquatorialCopyFormat,
): string {
  if (isNaN(raDegrees) || isNaN(decDegrees)) {
    return "N/A";
  }

  const ra = decomposeRa(raDegrees);
  const dec = decomposeDec(decDegrees);

  switch (format) {
    case "sexagesimal-units":
      return `${ra.h}h ${pad2(ra.m)}m ${ra.s.toFixed(2)}s ${dec.sign}${dec.d}d ${pad2(dec.m)}m ${dec.s.toFixed(1)}"`;
    case "sexagesimal-colon":
      return `${pad2(ra.h)}:${pad2(ra.m)}:${ra.s.toFixed(2)} ${dec.sign}${pad2(dec.d)}:${pad2(dec.m)}:${dec.s.toFixed(1)}`;
    case "sexagesimal-space":
      return `${ra.h} ${pad2(ra.m)} ${ra.s.toFixed(2)} ${dec.sign}${dec.d} ${pad2(dec.m)} ${dec.s.toFixed(1)}`;
    case "j2000":
      return `J${pad2(ra.h)}${pad2(ra.m)}${formatSexagesimalSeconds(ra.s, 2)}${dec.sign}${pad2(dec.d)}${pad2(dec.m)}${formatSexagesimalSeconds(dec.s, 1)}`;
    case "decimal-degrees-units":
      return `${raDegrees.toFixed(4)}d ${dec.sign}${Math.abs(decDegrees).toFixed(4)}d`;
    case "decimal-degrees":
      return `${raDegrees.toFixed(4)} ${dec.sign}${Math.abs(decDegrees).toFixed(4)}`;
    default:
      return "N/A";
  }
}

export function buildNedPositionSearchUrl(
  raDegrees: number,
  decDegrees: number,
): string {
  const params = new URLSearchParams({
    search_type: "Near Position Search",
    in_csys: "Equatorial",
    in_equinox: "J2000",
    ra: formatRaForCopy(raDegrees),
    dec: formatDecForCopy(decDegrees),
    radius: "1",
    Z_CONSTRAINT: "Unconstrained",
  });

  return `https://ned.ipac.caltech.edu/conesearch?${params.toString()}`;
}

export function RightAscension({
  value,
  className,
}: AstronomicalCoordinateProps): React.ReactElement {
  if (isNaN(value)) {
    return <span className={className}>N/A</span>;
  }

  const totalSeconds = value * 240;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = +(totalSeconds % 60).toFixed(2);

  return (
    <span className={className}>
      <Quantity value={hours} unit="h" spaced={false} />{" "}
      <Quantity value={minutes} unit="m" spaced={false} />{" "}
      <Quantity value={seconds} unit="s" spaced={false} />
    </span>
  );
}

export function Declination({
  value,
  className,
}: AstronomicalCoordinateProps): React.ReactElement {
  if (isNaN(value)) {
    return <span className={className}>N/A</span>;
  }

  const sign = value < 0 ? "-" : "+";
  const absDec = Math.abs(value);
  const degrees = Math.floor(absDec);
  const minutesFloat = (absDec - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = +(minutesFloat - minutes) * 60;

  return (
    <span className={className}>
      {sign}
      <Quantity value={degrees} unit="°" spaced={false} />{" "}
      <Quantity value={minutes} unit="'" spaced={false} />{" "}
      <Quantity value={seconds.toFixed(2)} unit={'"'} spaced={false} />
    </span>
  );
}
