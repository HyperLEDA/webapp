const ARCMINUTE_RADIUS_DEG = 1 / 60;

export type CoordinateSystem = "j2000" | "b1950" | "galactic" | "supergalactic";

export type CoordinateQueryParams = {
  ra?: number;
  dec?: number;
  eq_epoch?: string;
  glon?: number;
  glat?: number;
  sgl?: number;
  sgb?: number;
  radius: number;
};

export type CoordinateQuery = {
  system: CoordinateSystem;
  lon: number;
  lat: number;
  toQueryParams: () => CoordinateQueryParams;
};

export type AxisDisplay = {
  label: string;
  display: string | null;
};

export type CoordinateInspect =
  | { status: "none" }
  | {
      status: "partial" | "valid";
      system: CoordinateSystem;
      systemLabel: string;
      firstAxis: AxisDisplay;
      secondAxis: AxisDisplay;
      query: CoordinateQuery | null;
    };

type Prefix = "J" | "B" | "G" | "S";

function systemFromPrefix(prefix: Prefix | null): CoordinateSystem {
  switch (prefix) {
    case "B":
      return "b1950";
    case "G":
      return "galactic";
    case "S":
      return "supergalactic";
    default:
      return "j2000";
  }
}

function systemLabel(system: CoordinateSystem): string {
  switch (system) {
    case "b1950":
      return "B1950";
    case "galactic":
      return "Galactic";
    case "supergalactic":
      return "Supergalactic";
    default:
      return "J2000";
  }
}

function axisLabels(system: CoordinateSystem): {
  first: string;
  second: string;
} {
  switch (system) {
    case "galactic":
      return { first: "l", second: "b" };
    case "supergalactic":
      return { first: "SGL", second: "SGB" };
    default:
      return { first: "RA", second: "Dec" };
  }
}

function isEquatorial(system: CoordinateSystem): boolean {
  return system === "j2000" || system === "b1950";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function integerDigitCount(token: string): number {
  const dot = token.indexOf(".");
  return (dot === -1 ? token : token.slice(0, dot)).length;
}

function isSexagesimalToken(token: string): boolean {
  return integerDigitCount(token) >= 4;
}

function looksCoordinateShaped(body: string): boolean {
  return /^(\d+\.?\d*)?([+-]\d*\.?\d*)?$/.test(body);
}

function parseDecimalDegrees(token: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(token)) {
    return null;
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function packedToComponents(
  token: string,
  degreeDigits: number,
): { degrees: number; minutes: number; seconds: number } | null {
  if (!/^\d+(\.\d+)?$/.test(token)) {
    return null;
  }

  const [whole, fraction = ""] = token.split(".");
  if (whole.length < 1) {
    return null;
  }

  if (whole.length < degreeDigits) {
    const degrees = Number(`${whole}${fraction ? `.${fraction}` : ""}`);
    return Number.isFinite(degrees)
      ? { degrees, minutes: 0, seconds: 0 }
      : null;
  }

  const degrees = Number(whole.slice(0, degreeDigits));
  const rest = whole.slice(degreeDigits);

  if (rest.length === 0) {
    const deg = Number(`${degrees}${fraction ? `.${fraction}` : ""}`);
    return Number.isFinite(deg)
      ? { degrees: deg, minutes: 0, seconds: 0 }
      : null;
  }

  if (rest.length <= 2) {
    const minutes = Number(`${rest}${fraction ? `.${fraction}` : ""}`);
    if (
      !Number.isFinite(degrees) ||
      !Number.isFinite(minutes) ||
      minutes >= 60
    ) {
      return null;
    }
    return { degrees, minutes, seconds: 0 };
  }

  const minutes = Number(rest.slice(0, 2));
  const seconds = Number(
    `${rest.slice(2) || "0"}${fraction ? `.${fraction}` : ""}`,
  );
  if (
    !Number.isFinite(degrees) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    return null;
  }
  return { degrees, minutes, seconds };
}

function componentsToDegrees(
  degrees: number,
  minutes: number,
  seconds: number,
): number {
  return degrees + minutes / 60 + seconds / 3600;
}

function packedHoursToDegrees(token: string): number | null {
  const components = packedToComponents(token, 2);
  if (!components || components.degrees >= 24) {
    return null;
  }
  return (
    componentsToDegrees(
      components.degrees,
      components.minutes,
      components.seconds,
    ) * 15
  );
}

function packedDegreesToDegrees(
  token: string,
  degreeDigits: number,
): number | null {
  const components = packedToComponents(token, degreeDigits);
  if (!components) {
    return null;
  }
  const maxDegrees = degreeDigits === 3 ? 360 : 90;
  if (components.degrees > maxDegrees) {
    return null;
  }
  return componentsToDegrees(
    components.degrees,
    components.minutes,
    components.seconds,
  );
}

function formatRaDisplay(degrees: number): string {
  const totalSeconds = (((degrees % 360) + 360) % 360) * 240;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(2).padStart(5, "0")}s`;
}

function formatDecDisplay(degrees: number): string {
  const sign = degrees < 0 ? "-" : "+";
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const minutesFloat = (abs - d) * 60;
  const m = Math.floor(minutesFloat);
  const s = (minutesFloat - m) * 60;
  return `${sign}${d}° ${pad2(m)}′ ${s.toFixed(1).padStart(4, "0")}″`;
}

function formatLonLatDisplay(degrees: number): string {
  return `${degrees.toFixed(4)}°`;
}

function formatFirstAxis(system: CoordinateSystem, degrees: number): string {
  return isEquatorial(system)
    ? formatRaDisplay(degrees)
    : formatLonLatDisplay(degrees);
}

function formatSecondAxis(system: CoordinateSystem, degrees: number): string {
  return isEquatorial(system)
    ? formatDecDisplay(degrees)
    : formatLonLatDisplay(degrees);
}

function parseFirstAxis(
  system: CoordinateSystem,
  token: string,
): number | null {
  if (!token) {
    return null;
  }

  if (isSexagesimalToken(token)) {
    return isEquatorial(system)
      ? packedHoursToDegrees(token)
      : packedDegreesToDegrees(token, 3);
  }

  const value = parseDecimalDegrees(token);
  if (value === null || value > 360) {
    return null;
  }
  return value;
}

function parseSecondAxis(
  token: string,
  sign: "+" | "-",
  firstWasSexagesimal: boolean,
): number | null {
  if (!token) {
    return null;
  }

  const abs = firstWasSexagesimal
    ? packedDegreesToDegrees(token, 2)
    : parseDecimalDegrees(token);

  if (abs === null) {
    return null;
  }

  const value = sign === "-" ? -abs : abs;
  if (Math.abs(value) > 90) {
    return null;
  }
  return value;
}

function buildQuery(
  system: CoordinateSystem,
  lon: number,
  lat: number,
): CoordinateQuery | null {
  if (lon < 0 || lon > 360 || lat < -90 || lat > 90) {
    return null;
  }

  return {
    system,
    lon,
    lat,
    toQueryParams(): CoordinateQueryParams {
      switch (system) {
        case "b1950":
          return {
            ra: lon,
            dec: lat,
            eq_epoch: "B1950",
            radius: ARCMINUTE_RADIUS_DEG,
          };
        case "galactic":
          return { glon: lon, glat: lat, radius: ARCMINUTE_RADIUS_DEG };
        case "supergalactic":
          return { sgl: lon, sgb: lat, radius: ARCMINUTE_RADIUS_DEG };
        default:
          return {
            ra: lon,
            dec: lat,
            eq_epoch: "J2000",
            radius: ARCMINUTE_RADIUS_DEG,
          };
      }
    },
  };
}

type ParsedShape = {
  prefix: Prefix | null;
  firstToken: string;
  sign: "+" | "-" | null;
  secondToken: string;
  hasSeparator: boolean;
};

function splitInput(trimmed: string): ParsedShape | null {
  if (!trimmed) {
    return null;
  }

  const prefixMatch = /^([JBGS])(.*)$/i.exec(trimmed);
  let prefix: Prefix | null = null;
  let body = trimmed;

  if (prefixMatch) {
    prefix = prefixMatch[1].toUpperCase() as Prefix;
    body = prefixMatch[2];
  } else if (!/^\d/.test(trimmed)) {
    return null;
  }

  if (body.length > 0 && !looksCoordinateShaped(body)) {
    return null;
  }

  if (body.length === 0) {
    if (prefix === null) {
      return null;
    }
    return {
      prefix,
      firstToken: "",
      sign: null,
      secondToken: "",
      hasSeparator: false,
    };
  }

  const sepIndex = body.search(/[+-]/);
  if (sepIndex === -1) {
    return {
      prefix,
      firstToken: body,
      sign: null,
      secondToken: "",
      hasSeparator: false,
    };
  }

  return {
    prefix,
    firstToken: body.slice(0, sepIndex),
    sign: body[sepIndex] as "+" | "-",
    secondToken: body.slice(sepIndex + 1),
    hasSeparator: true,
  };
}

export function inspectCoordinateQuery(input: string): CoordinateInspect {
  const trimmed = input.trim();
  const shape = splitInput(trimmed);
  if (!shape) {
    return { status: "none" };
  }

  const system = systemFromPrefix(shape.prefix);
  const labels = axisLabels(system);
  const firstLon =
    shape.firstToken.length > 0
      ? parseFirstAxis(system, shape.firstToken)
      : null;
  const firstWasSexagesimal =
    shape.firstToken.length > 0 && isSexagesimalToken(shape.firstToken);

  let secondLat: number | null = null;
  if (shape.hasSeparator && shape.sign && shape.secondToken.length > 0) {
    secondLat = parseSecondAxis(
      shape.secondToken,
      shape.sign,
      firstWasSexagesimal,
    );
  }

  const query =
    firstLon !== null && secondLat !== null
      ? buildQuery(system, firstLon, secondLat)
      : null;

  if (query) {
    return {
      status: "valid",
      system,
      systemLabel: systemLabel(system),
      firstAxis: {
        label: labels.first,
        display: formatFirstAxis(system, query.lon),
      },
      secondAxis: {
        label: labels.second,
        display: formatSecondAxis(system, query.lat),
      },
      query,
    };
  }

  return {
    status: "partial",
    system,
    systemLabel: systemLabel(system),
    firstAxis: {
      label: labels.first,
      display: firstLon !== null ? formatFirstAxis(system, firstLon) : null,
    },
    secondAxis: {
      label: labels.second,
      display: secondLat !== null ? formatSecondAxis(system, secondLat) : null,
    },
    query: null,
  };
}

export function parseCoordinateQuery(input: string): CoordinateQuery | null {
  const inspected = inspectCoordinateQuery(input);
  if (inspected.status !== "valid" || !inspected.query) {
    return null;
  }
  return inspected.query;
}

export function formatCoordinateInspectHint(
  inspected: CoordinateInspect,
): string | null {
  if (inspected.status === "none") {
    return null;
  }

  const first = inspected.firstAxis.display ?? "—";
  const second = inspected.secondAxis.display ?? "—";
  const base = `${inspected.systemLabel} · ${inspected.firstAxis.label} ${first} · ${inspected.secondAxis.label} ${second}`;
  if (inspected.status === "valid") {
    return `${base} · 1′ search`;
  }
  return base;
}
