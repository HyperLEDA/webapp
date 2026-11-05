import { describe, expect, it } from "vitest";

import { inferColumns } from "./infer";
import { parseCsv } from "./parser";

describe("parseCsv", () => {
  it("reads a header and rows", async () => {
    const result = await parseCsv(new Blob(["name,ra\nM31,10\nM33,23\n"]), {
      separator: ",",
      skipLines: 0,
    });

    expect(result.columns).toEqual(["name", "ra"]);
    expect(result.rows).toEqual([
      { name: "M31", ra: "10" },
      { name: "M33", ra: "23" },
    ]);
  });

  it("skips leading lines and truncates", async () => {
    const result = await parseCsv(
      new Blob(["# comment\nname\ta\nA\t1\nB\t2\nC\t3\n"]),
      {
        separator: "\t",
        skipLines: 1,
      },
      { truncate: 2 },
    );

    expect(result.rows).toEqual([
      { name: "A", a: "1" },
      { name: "B", a: "2" },
    ]);
  });

  it("keeps quoted separators and newlines", async () => {
    const result = await parseCsv(new Blob(['name,note\n"M 31","a, b\nc"\n']), {
      separator: ",",
      skipLines: 0,
    });

    expect(result.rows).toEqual([{ name: "M 31", note: "a, b\nc" }]);
  });
});

describe("inferColumns", () => {
  it("maps integers, doubles, and strings", () => {
    const columns = inferColumns(
      ["n", "x", "label"],
      [
        { n: "1", x: "1.5", label: "a" },
        { n: "2", x: "2", label: "" },
      ],
    );

    expect(columns.map((column) => column.data_type)).toEqual([
      "integer",
      "double",
      "string",
    ]);
  });
});
