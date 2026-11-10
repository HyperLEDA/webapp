import { expect, it } from "vitest";
import {
  equatorialToGalactic,
  zToHeliocentricVelocity,
} from "@leda/lib/astronomy";
import {
  candidatesInRequestOrder,
  crossmatchStatus,
} from "./recordCrossmatchModel";

it("converts redshift and J2000 coordinates", () => {
  expect(zToHeliocentricVelocity(0.0033356409519815205, 0).v).toBeCloseTo(
    1000,
    6,
  );

  const galactic = equatorialToGalactic(0, 0, 0.01, 0.02);
  expect(galactic.lon).toBeCloseTo(96.33577169138084, 6);
  expect(galactic.lat).toBeCloseTo(-60.18863766852303, 6);
  expect(galactic.eLon).toBe(36);
  expect(galactic.eLat).toBe(72);
});

it("derives crossmatch status and keeps candidate order", () => {
  expect(crossmatchStatus("unprocessed", []).status).toBe("unprocessed");
  expect(crossmatchStatus("resolved", []).status).toBe("new");
  expect(crossmatchStatus("resolved", [42])).toEqual({
    status: "existing",
    metadata: { pgc: 42 },
  });
  expect(
    crossmatchStatus("pending", [40, 41]).metadata.possible_matches,
  ).toEqual([40, 41]);

  const candidates = candidatesInRequestOrder(
    [3, 1],
    [{ pgc: 1, catalogs: { designation: { name: "PGC 1" } } }],
  );
  expect(candidates.map((candidate) => candidate.pgc)).toEqual([3, 1]);
  expect(candidates[0].catalogs).toEqual({});
});
