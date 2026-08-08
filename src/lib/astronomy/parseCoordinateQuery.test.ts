import { describe, expect, it } from "vitest";

import {
  inspectCoordinateQuery,
  type CoordinateSystem,
} from "./parseCoordinateQuery";

/**
 * Canonical sky position used across most full-parse cases:
 *   RA  12h 30m 00s  = 187.5°
 *   Dec +45° 00′ 00″ = +45°
 */
const CANONICAL = {
  lon: 187.5,
  lat: 45,
  firstDisplay: "12h 30m 00.00s",
  secondDisplay: "+45° 00′ 00.0″",
} as const;

type NoneExpectation = { status: "none" };

type PartialExpectation = {
  status: "partial";
  system: CoordinateSystem;
  firstDisplay?: string | null;
  secondDisplay?: string | null;
};

type ValidExpectation = {
  status: "valid";
  system: CoordinateSystem;
  lon: number;
  lat: number;
  firstDisplay?: string;
  secondDisplay?: string;
};

type Case = {
  name: string;
  input: string;
  expect: NoneExpectation | PartialExpectation | ValidExpectation;
};

function assertInspect(input: string, expected: Case["expect"]): void {
  const actual = inspectCoordinateQuery(input);

  expect(actual.status, `status for ${JSON.stringify(input)}`).toBe(
    expected.status,
  );

  if (expected.status === "none") {
    return;
  }

  if (actual.status === "none") {
    throw new Error(`expected ${expected.status}, got none`);
  }

  expect(actual.system).toBe(expected.system);

  if (expected.firstDisplay !== undefined) {
    expect(actual.firstAxis.display).toBe(expected.firstDisplay);
  }
  if (expected.secondDisplay !== undefined) {
    expect(actual.secondAxis.display).toBe(expected.secondDisplay);
  }

  if (expected.status === "valid") {
    expect(actual.query).not.toBeNull();
    expect(actual.query!.lon).toBeCloseTo(expected.lon, 8);
    expect(actual.query!.lat).toBeCloseTo(expected.lat, 8);
  } else {
    expect(actual.query).toBeNull();
  }
}

describe("inspectCoordinateQuery", () => {
  describe("full matches", () => {
    const cases: Case[] = [
      // --- equatorial sexagesimal copy formats (same sky position) ---
      {
        name: 'sexagesimal units (h/m/s + d/m/")',
        input: '12h 30m 00s +45d 00m 00"',
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },
      {
        name: "sexagesimal colon",
        input: "12:30:00 +45:00:00",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },
      {
        name: "sexagesimal space",
        input: "12 30 00 +45 00 00",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },

      // --- packed equatorial ---
      {
        name: "packed J2000 with J prefix",
        input: "J123000+450000",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },
      {
        name: "packed J2000 without prefix",
        input: "123000+450000",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },
      {
        name: "packed B1950",
        input: "B123000+450000",
        expect: {
          status: "valid",
          system: "b1950",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },
      {
        name: "packed with fractional seconds",
        input: "J123049.42+122328.0",
        expect: {
          status: "valid",
          system: "j2000",
          lon: (12 + 30 / 60 + 49.42 / 3600) * 15,
          lat: 12 + 23 / 60 + 28 / 3600,
        },
      },

      // --- decimal degrees ---
      {
        name: "decimal degrees with d units",
        input: "187.5d +45d",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },
      {
        name: "decimal degrees space-separated",
        input: "187.5 +45",
        expect: {
          status: "valid",
          system: "j2000",
          lon: CANONICAL.lon,
          lat: CANONICAL.lat,
        },
      },

      // --- galactic / supergalactic ---
      {
        name: "galactic decimal packed",
        input: "G123.45+45.67",
        expect: {
          status: "valid",
          system: "galactic",
          lon: 123.45,
          lat: 45.67,
          firstDisplay: "123.4500°",
          secondDisplay: "45.6700°",
        },
      },
      {
        name: "galactic sexagesimal packed",
        input: "G123456+4545",
        expect: {
          status: "valid",
          system: "galactic",
          lon: 123 + 45 / 60 + 6 / 3600,
          lat: 45 + 45 / 60,
        },
      },
      {
        name: "supergalactic decimal packed",
        input: "S10.5-20.25",
        expect: {
          status: "valid",
          system: "supergalactic",
          lon: 10.5,
          lat: -20.25,
          firstDisplay: "10.5000°",
          secondDisplay: "-20.2500°",
        },
      },

      // --- negative cases: look coordinate-like but must not fully parse ---
      {
        name: "object name is not a coordinate",
        input: "NGC 224",
        expect: { status: "none" },
      },
      {
        name: "hours out of range",
        input: '99h 00m 00s +00d 00m 00"',
        expect: { status: "none" },
      },
      {
        name: "minutes out of range",
        input: '12h 70m 00s +00d 00m 00"',
        expect: { status: "none" },
      },
      {
        name: "declination out of range is not valid",
        input: '12h 30m 00s +91d 00m 00"',
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
    ];

    it.each(cases)("$name → $input", ({ input, expect: expected }) => {
      assertInspect(input, expected);
    });
  });

  describe("partial matches", () => {
    const cases: Case[] = [
      // --- sexagesimal units ---
      {
        name: "units: hours only",
        input: "12h",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: "12h 00m 00.00s",
          secondDisplay: null,
        },
      },
      {
        name: "units: hours + minutes",
        input: "12h 30m",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "units: full RA, no Dec",
        input: "12h 30m 00s",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "units: RA + sign",
        input: "12h 30m 00s +",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "units: RA + Dec degrees (still incomplete without trailing fields)",
        input: "12h 30m 00s +45d",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },
      {
        name: "units: missing Dec arcseconds",
        input: "12h 30m 00s +45d 00m",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },

      // --- sexagesimal colon ---
      {
        name: "colon: after hours separator",
        input: "12:",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: null,
          secondDisplay: null,
        },
      },
      {
        name: "colon: hours + minutes",
        input: "12:30",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "colon: full RA",
        input: "12:30:00",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "colon: RA + Dec degrees",
        input: "12:30:00 +45",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },
      {
        name: "colon: missing Dec seconds",
        input: "12:30:00 +45:00",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },

      // --- sexagesimal space ---
      {
        name: "space: full RA only",
        input: "12 30 00",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "space: RA + sign",
        input: "12 30 00 +",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "space: missing Dec seconds",
        input: "12 30 00 +45 00",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },

      // --- packed equatorial ---
      {
        name: "packed: prefix only",
        input: "J",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: null,
          secondDisplay: null,
        },
      },
      {
        name: "packed: RA hours+minutes",
        input: "J1230",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "packed: full RA, no Dec",
        input: "J123000",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "packed: RA + sign",
        input: "J123000+",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "packed B1950: prefix + RA",
        input: "B123000",
        expect: {
          status: "partial",
          system: "b1950",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },

      // --- decimal degrees ---
      {
        name: "decimal-d: lon only",
        input: "187.5d",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "decimal-d: lon + sign",
        input: "187.5d +",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },
      {
        name: "decimal-d: missing trailing d on lat stays partial",
        input: "187.5d +45",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: CANONICAL.secondDisplay,
        },
      },
      {
        name: "decimal space: lon + sign",
        input: "187.5 +",
        expect: {
          status: "partial",
          system: "j2000",
          firstDisplay: CANONICAL.firstDisplay,
          secondDisplay: null,
        },
      },

      // --- galactic / supergalactic ---
      {
        name: "galactic: prefix only",
        input: "G",
        expect: {
          status: "partial",
          system: "galactic",
          firstDisplay: null,
          secondDisplay: null,
        },
      },
      {
        name: "galactic: longitude only",
        input: "G123",
        expect: {
          status: "partial",
          system: "galactic",
          firstDisplay: "123.0000°",
          secondDisplay: null,
        },
      },
      {
        name: "galactic: longitude + sign",
        input: "G123+",
        expect: {
          status: "partial",
          system: "galactic",
          firstDisplay: "123.0000°",
          secondDisplay: null,
        },
      },
      {
        name: "supergalactic: longitude only",
        input: "S10.5",
        expect: {
          status: "partial",
          system: "supergalactic",
          firstDisplay: "10.5000°",
          secondDisplay: null,
        },
      },

      // --- negative cases: must not be treated as partial coordinates ---
      {
        name: "plain text is not a partial coordinate",
        input: "hello",
        expect: { status: "none" },
      },
      {
        name: "two space-separated numbers without sign is not sexagesimal",
        input: "12 30",
        expect: { status: "none" },
      },
      {
        name: "invalid characters after units prefix",
        input: "12h foo",
        expect: { status: "none" },
      },
    ];

    it.each(cases)("$name → $input", ({ input, expect: expected }) => {
      assertInspect(input, expected);
    });
  });
});
