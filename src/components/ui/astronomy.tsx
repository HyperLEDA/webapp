import React, { ReactElement, ReactNode } from "react";

interface ValueProps {
  value: string | number;
  unit?: string;
  className?: string;
  spaced?: boolean;
}

export function Value({
  value,
  unit,
  className,
  spaced = true,
}: ValueProps): React.ReactElement {
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

interface ValueWithErrorProps {
  children: ReactNode;
  error: number;
  unit?: string;
  decimalPlaces?: number;
}

export function ValueWithError({
  children,
  error,
  unit,
  decimalPlaces = 2,
}: ValueWithErrorProps): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {children} ± <Value value={error.toFixed(decimalPlaces)} unit={unit} />
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
      <Value value={hours} unit="h" spaced={false} />{" "}
      <Value value={minutes} unit="m" spaced={false} />{" "}
      <Value value={seconds} unit="s" spaced={false} />
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
      <Value value={degrees} unit="°" spaced={false} />{" "}
      <Value value={minutes} unit="'" spaced={false} />{" "}
      <Value value={seconds.toFixed(2)} unit={'"'} spaced={false} />
    </span>
  );
}
