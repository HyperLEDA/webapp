/* Monaco completion inserts use `${n:name}` snippet placeholders. */
/* eslint-disable no-template-curly-in-string */

export type ExpressionToken = {
  label: string;
  insert: string;
  kind: "function" | "constant";
  detail: string;
};

export const EXPRESSION_TOKENS: ExpressionToken[] = [
  {
    label: "col",
    insert: 'col("${1:name}")',
    kind: "function",
    detail: "Rawdata column",
  },
  {
    label: "sin",
    insert: "sin(${1:x})",
    kind: "function",
    detail: "Sine (argument must be an angle)",
  },
  {
    label: "cos",
    insert: "cos(${1:x})",
    kind: "function",
    detail: "Cosine (argument must be an angle)",
  },
  {
    label: "tan",
    insert: "tan(${1:x})",
    kind: "function",
    detail: "Tangent (argument must be an angle)",
  },
  {
    label: "asin",
    insert: "asin(${1:x})",
    kind: "function",
    detail: "Arcsine (returns radians)",
  },
  {
    label: "acos",
    insert: "acos(${1:x})",
    kind: "function",
    detail: "Arccosine (returns radians)",
  },
  {
    label: "atan",
    insert: "atan(${1:x})",
    kind: "function",
    detail: "Arctangent (returns radians)",
  },
  {
    label: "atan2",
    insert: "atan2(${1:y}, ${2:x})",
    kind: "function",
    detail: "Two-argument arctangent (returns radians)",
  },
  {
    label: "deg2rad",
    insert: "deg2rad(${1:deg})",
    kind: "function",
    detail: "Convert degrees to radians",
  },
  {
    label: "rad2deg",
    insert: "rad2deg(${1:rad})",
    kind: "function",
    detail: "Convert radians to degrees",
  },
  {
    label: "wrap360",
    insert: "wrap360(${1:deg})",
    kind: "function",
    detail: "Wrap angle to [0, 360) degrees",
  },
  {
    label: "sqrt",
    insert: "sqrt(${1:x})",
    kind: "function",
    detail: "Square root",
  },
  {
    label: "exp",
    insert: "exp(${1:x})",
    kind: "function",
    detail: "Exponential",
  },
  {
    label: "log10",
    insert: "log10(${1:x})",
    kind: "function",
    detail: "Base-10 logarithm",
  },
  {
    label: "ln",
    insert: "ln(${1:x})",
    kind: "function",
    detail: "Natural logarithm",
  },
  {
    label: "pow",
    insert: "pow(${1:x}, ${2:y})",
    kind: "function",
    detail: "Raise x to the power y",
  },
  {
    label: "max",
    insert: "max(${1:x}, ${2:y})",
    kind: "function",
    detail: "Larger of two values",
  },
  {
    label: "min",
    insert: "min(${1:x}, ${2:y})",
    kind: "function",
    detail: "Smaller of two values",
  },
  {
    label: "str",
    insert: "str(${1:x})",
    kind: "function",
    detail:
      "Convert to text; slow, converts each value separately. Prefer text literals or text columns directly",
  },
  {
    label: "where",
    insert: "where(${1:cond}, ${2:then}, ${3:else})",
    kind: "function",
    detail:
      "Pick then if cond is true, otherwise the third argument; nest for extra branches",
  },
  {
    label: "to_deg",
    insert: "to_deg(${1:x})",
    kind: "function",
    detail:
      'Convert to degrees; e.g. "00 02 08.4" (hourangle), "+16 35 13" (deg), "00h02m08.4s". Slow on text, parses each value separately. Prefer numeric columns with units, e.g. col("ra") or col("ra_h") / unit("h") * 15 * deg',
  },
  {
    label: "unit",
    insert: 'unit("${1:name}")',
    kind: "function",
    detail: 'Astropy unit from a name string; e.g. "Mpc", "km/s", "Jy"',
  },
  { label: "pi", insert: "pi", kind: "constant", detail: "Pi" },
  { label: "c", insert: "c", kind: "constant", detail: "Speed of light" },
  {
    label: "G",
    insert: "G",
    kind: "constant",
    detail: "Gravitational constant",
  },
  { label: "h", insert: "h", kind: "constant", detail: "Planck constant" },
  {
    label: "k_B",
    insert: "k_B",
    kind: "constant",
    detail: "Boltzmann constant",
  },
  {
    label: "sigma",
    insert: "sigma",
    kind: "constant",
    detail: "Stefan-Boltzmann constant",
  },
  { label: "m_e", insert: "m_e", kind: "constant", detail: "Electron mass" },
  { label: "m_p", insert: "m_p", kind: "constant", detail: "Proton mass" },
  {
    label: "au",
    insert: "au",
    kind: "constant",
    detail: "Astronomical unit",
  },
  { label: "pc", insert: "pc", kind: "constant", detail: "Parsec" },
  { label: "ly", insert: "ly", kind: "constant", detail: "Light year" },
  { label: "eV", insert: "eV", kind: "constant", detail: "Electronvolt" },
  { label: "Jy", insert: "Jy", kind: "constant", detail: "Jansky" },
  { label: "M_sun", insert: "M_sun", kind: "constant", detail: "Solar mass" },
  {
    label: "R_sun",
    insert: "R_sun",
    kind: "constant",
    detail: "Nominal solar radius",
  },
  {
    label: "L_sun",
    insert: "L_sun",
    kind: "constant",
    detail: "Nominal solar luminosity",
  },
  {
    label: "M_earth",
    insert: "M_earth",
    kind: "constant",
    detail: "Earth mass",
  },
  {
    label: "M_jup",
    insert: "M_jup",
    kind: "constant",
    detail: "Jupiter mass",
  },
  { label: "deg", insert: "deg", kind: "constant", detail: "Degree" },
  { label: "rad", insert: "rad", kind: "constant", detail: "Radian" },
  { label: "arcmin", insert: "arcmin", kind: "constant", detail: "Arcminute" },
  { label: "arcsec", insert: "arcsec", kind: "constant", detail: "Arcsecond" },
  { label: "mag", insert: "mag", kind: "constant", detail: "Magnitude" },
];
