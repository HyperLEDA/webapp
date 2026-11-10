import { describe, expect, it } from "vitest";
import {
  equatorialToGalactic,
  zToHeliocentricVelocity,
} from "@leda/lib/astronomy";
import {
  candidatesInRequestOrder,
  crossmatchStatus,
  recordCatalogsToCrossmatch,
} from "./recordCrossmatchModel";

describe("zToHeliocentricVelocity", () => {
  it("inverts cz / c", () => {
    const velocity = zToHeliocentricVelocity(0.0033356409519815205, 0.0001);
    expect(velocity.v).toBeCloseTo(1000, 6);
    expect(velocity.eV).toBeCloseTo(29.9792458, 6);
  });
});

describe("equatorialToGalactic", () => {
  it("converts J2000 equatorial coordinates to galactic", () => {
    const origin = equatorialToGalactic(0, 0, 0.01, 0.02);
    expect(origin.lon).toBeCloseTo(96.33577169138084, 6);
    expect(origin.lat).toBeCloseTo(-60.18863766852303, 6);
    expect(origin.eLon).toBeCloseTo(36, 6);
    expect(origin.eLat).toBeCloseTo(72, 6);

    const center = equatorialToGalactic(266.404988, -28.936174, 0, 0);
    expect(center.lon).toBeCloseTo(359.9976156010982, 6);
    expect(center.lat).toBeCloseTo(-0.0004871034985548016, 6);
  });
});

describe("crossmatchStatus", () => {
  it("keeps unprocessed records distinct from new objects", () => {
    expect(crossmatchStatus("unprocessed", [])).toEqual({
      status: "unprocessed",
      metadata: {},
    });
    expect(crossmatchStatus("resolved", [])).toEqual({
      status: "new",
      metadata: {},
    });
    expect(crossmatchStatus("resolved", [42])).toEqual({
      status: "existing",
      metadata: { pgc: 42 },
    });
    expect(crossmatchStatus("pending", [40, 41])).toEqual({
      status: "collided",
      metadata: { possible_matches: [40, 41] },
    });
  });
});

describe("recordCatalogsToCrossmatch", () => {
  it("maps layer1 catalogs and derives galactic coordinates and velocity", () => {
    const catalogs = recordCatalogsToCrossmatch({
      designation: { name: "NGC 1" },
      icrs: { ra: 0, dec: 0, ra_error: 0.01, dec_error: 0.02 },
      redshift: { z: 0.0033356409519815205, z_error: 0 },
      nature: { type_name: "G" },
    });

    expect(catalogs.designation).toEqual({ name: "NGC 1" });
    expect(catalogs.coordinates?.equatorial).toEqual({
      ra: 0,
      dec: 0,
      e_ra: 0.01,
      e_dec: 0.02,
    });
    expect(catalogs.coordinates?.galactic.lon).toBeCloseTo(
      96.33577169138084,
      6,
    );
    expect(catalogs.coordinates?.galactic.e_lon).toBeCloseTo(36, 6);
    expect(catalogs.redshift).toEqual({ z: 0.0033356409519815205, e_z: 0 });
    expect(catalogs.velocity?.heliocentric.v).toBeCloseTo(1000, 6);
    expect(catalogs.nature).toEqual({ type_name: "G" });
  });
});

describe("candidatesInRequestOrder", () => {
  it("preserves requested order and stubs missing PGCs", () => {
    const candidates = candidatesInRequestOrder(
      [3, 1],
      [
        {
          pgc: 1,
          catalogs: { designation: { name: "PGC 1" } },
        },
      ],
    );

    expect(candidates.map((candidate) => candidate.pgc)).toEqual([3, 1]);
    expect(candidates[0].catalogs).toEqual({});
    expect(candidates[1].catalogs.designation).toEqual({ name: "PGC 1" });
  });
});
