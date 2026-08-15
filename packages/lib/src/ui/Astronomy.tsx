import React, { ReactElement, ReactNode } from "react";
import { decomposeDec, decomposeRa } from "../astronomy";

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

export function RightAscension({
  value,
  className,
}: AstronomicalCoordinateProps): React.ReactElement {
  if (isNaN(value)) {
    return <span className={className}>N/A</span>;
  }

  const { h, m, s } = decomposeRa(value);
  const seconds = +s.toFixed(2);

  return (
    <span className={className}>
      <Quantity value={h} unit="h" spaced={false} />{" "}
      <Quantity value={m} unit="m" spaced={false} />{" "}
      <Quantity value={seconds} unit="s" spaced={false} />
    </span>
  );
}

interface EquatorialDecimalDegreesProps {
  ra: number;
  dec: number;
  className?: string;
  decimalPlaces?: number;
}

export function EquatorialDecimalDegrees({
  ra,
  dec,
  className,
  decimalPlaces = 4,
}: EquatorialDecimalDegreesProps): React.ReactElement {
  if (isNaN(ra) || isNaN(dec)) {
    return <span className={className}>N/A</span>;
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 ${className ?? ""}`}
    >
      <Quantity value={ra.toFixed(decimalPlaces)} unit="°" spaced={false} />
      <Quantity value={dec.toFixed(decimalPlaces)} unit="°" spaced={false} />
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

  const { sign, d, m, s } = decomposeDec(value);
  const seconds = +s.toFixed(2);

  return (
    <span className={className}>
      {sign}
      <Quantity value={d} unit="°" spaced={false} />{" "}
      <Quantity value={m} unit="'" spaced={false} />{" "}
      <Quantity value={seconds} unit={'"'} spaced={false} />
    </span>
  );
}
