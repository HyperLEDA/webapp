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
