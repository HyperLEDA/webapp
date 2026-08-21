export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export interface RaComponents {
  h: number;
  m: number;
  s: number;
}

export interface DecComponents {
  sign: string;
  d: number;
  m: number;
  s: number;
}

export function decomposeRa(degrees: number): RaComponents {
  const totalSeconds = degrees * 240;
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

export function decomposeDec(degrees: number): DecComponents {
  const sign = degrees < 0 ? "-" : "+";
  const absDec = Math.abs(degrees);
  const d = Math.floor(absDec);
  const minutesFloat = (absDec - d) * 60;
  const m = Math.floor(minutesFloat);
  const s = (minutesFloat - m) * 60;
  return { sign, d, m, s };
}
