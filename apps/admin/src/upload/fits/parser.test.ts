import { describe, expect, it } from "vitest";

import { parseFits } from "./parser";

function renderCard(item: string): string {
  if (item === "END") {
    return "END".padEnd(80, " ");
  }
  const splitAt = item.indexOf("=");
  const name = item.slice(0, splitAt).padEnd(8, " ").slice(0, 8);
  const raw = item.slice(splitAt + 1);
  const value =
    raw === "T" || raw === "F" || Number.isFinite(Number(raw))
      ? raw.padStart(20, " ")
      : `'${raw.length < 8 ? raw.padEnd(8, " ") : raw}'`;
  return `${name}= ${value}`.padEnd(80, " ");
}

function hdu(spec: string, payload: Uint8Array): Uint8Array {
  const text = spec
    .split(";")
    .map((item) => renderCard(item))
    .join("");
  const headerSize = Math.ceil(text.length / 2880) * 2880;
  const dataSize =
    payload.byteLength === 0 ? 0 : Math.ceil(payload.byteLength / 2880) * 2880;
  const bytes = new Uint8Array(headerSize + dataSize);
  bytes.set(new TextEncoder().encode(text));
  bytes.set(payload, headerSize);
  return bytes;
}

function fitsFile(parts: Uint8Array[]): Blob {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const copy = new ArrayBuffer(total);
  const bytes = new Uint8Array(copy);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return new Blob([copy]);
}

function hex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

const PRIMARY = "SIMPLE=T;BITPIX=8;NAXIS=0;EXTEND=T;END";
const BINARY =
  "XTENSION=BINTABLE;BITPIX=8;NAXIS=2;NAXIS1=35;NAXIS2=3;PCOUNT=0;GCOUNT=1;TFIELDS=7;TFORM1=1J;TTYPE1=ID;TFORM2=1D;TTYPE2=FLUX;TUNIT2=mas;TFORM3=4A;TTYPE3=NAME;TFORM4=1L;TTYPE4=FLAG;TFORM5=2E;TTYPE5=VEC;TFORM6=1K;TTYPE6=BIG;TFORM7=1I;END";
const BINARY_ROWS =
  "000000073ff80000000000004d333120543fa0000040200000002000000000000100030000000840040000000000004d333320464040000040800000000000000000002a000400000009400c0000000000004d3531205440a0000040c0000000000000000000010005";
const ASCII =
  "XTENSION=TABLE;BITPIX=8;NAXIS=2;NAXIS1=22;NAXIS2=3;PCOUNT=0;GCOUNT=1;TFIELDS=3;TFORM1=A8;TBCOL1=1;TTYPE1=NAME;TFORM2=I6;TBCOL2=9;TTYPE2=RA;TFORM3=F8.2;TBCOL3=15;TTYPE3=FLUX;TUNIT3=deg;END";
const ASCII_ROWS = `M31         10    1.50M33         23    2.25${" ".repeat(22)}`;

function primary(): Uint8Array {
  return hdu(PRIMARY, new Uint8Array());
}

function binaryFile(): Blob {
  return fitsFile([primary(), hdu(BINARY, hex(BINARY_ROWS))]);
}

describe("parseFits", () => {
  it("reads a binary table", async () => {
    const result = await parseFits(binaryFile(), { hduIndex: 1 });

    expect(result.columnDescriptions).toEqual([
      { name: "ID", data_type: "integer" },
      { name: "FLUX", data_type: "double", unit: "mas" },
      { name: "NAME", data_type: "string" },
      { name: "FLAG", data_type: "string" },
      { name: "VEC", data_type: "string" },
      { name: "BIG", data_type: "integer" },
      { name: "column_7", data_type: "integer" },
    ]);
    expect(result.rows[0]).toEqual({
      ID: "7",
      FLUX: "1.5",
      NAME: "M31",
      FLAG: "T",
      VEC: "[1.25,2.5]",
      BIG: "9007199254740993",
      column_7: "3",
    });
    expect(result.rows[1].FLAG).toBe("F");

    const preview = await parseFits(
      binaryFile(),
      { hduIndex: 1 },
      { truncate: 2 },
    );
    expect(preview.rows.map((row) => row.ID)).toEqual(["7", "8"]);
  });

  it("reads an ASCII table", async () => {
    const result = await parseFits(
      fitsFile([primary(), hdu(ASCII, new TextEncoder().encode(ASCII_ROWS))]),
      { hduIndex: 1 },
    );

    expect(result.columnDescriptions).toEqual([
      { name: "NAME", data_type: "string" },
      { name: "RA", data_type: "integer" },
      { name: "FLUX", data_type: "double", unit: "deg" },
    ]);
    expect(result.rows).toEqual([
      { NAME: "M31", RA: "10", FLUX: "1.5" },
      { NAME: "M33", RA: "23", FLUX: "2.25" },
      { NAME: "", RA: "", FLUX: "" },
    ]);
  });

  it("rejects HDUs that cannot be uploaded", async () => {
    const image = fitsFile([
      primary(),
      hdu(
        "XTENSION=IMAGE;BITPIX=8;NAXIS=2;NAXIS1=1;NAXIS2=1;PCOUNT=0;GCOUNT=1;END",
        Uint8Array.of(0),
      ),
    ]);

    await expect(parseFits(image, { hduIndex: 1 })).rejects.toThrow(
      "HDU 1 is not a table",
    );
    await expect(
      parseFits(fitsFile([primary()]), { hduIndex: 1 }),
    ).rejects.toThrow("HDU 1 does not exist");
    await expect(parseFits(binaryFile(), { hduIndex: -1 })).rejects.toThrow(
      "Invalid HDU index",
    );
    await expect(parseFits(new Blob(), { hduIndex: 1 })).rejects.toThrow(
      "FITS file is empty",
    );
  });
});
