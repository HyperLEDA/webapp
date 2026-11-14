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
    label: "abs",
    insert: "abs(${1:x})",
    kind: "function",
    detail: "Absolute value",
  },
  {
    label: "floor",
    insert: "floor(${1:x})",
    kind: "function",
    detail: "Round down to an integer, keeping units",
  },
  {
    label: "ceil",
    insert: "ceil(${1:x})",
    kind: "function",
    detail: "Round up to an integer, keeping units",
  },
  {
    label: "round",
    insert: "round(${1:x}, ${2:ndigits})",
    kind: "function",
    detail: "Round to ndigits decimal places, keeping units",
  },
  {
    label: "and_",
    insert: "and_(${1:a}, ${2:b})",
    kind: "function",
    detail: "Logical AND of two or more conditions",
  },
  {
    label: "or_",
    insert: "or_(${1:a}, ${2:b})",
    kind: "function",
    detail: "Logical OR of two or more conditions",
  },
  {
    label: "not_",
    insert: "not_(${1:cond})",
    kind: "function",
    detail: "Logical NOT of a condition",
  },
  {
    label: "select",
    insert:
      "select(${1:cond1}, ${2:value1}, ${3:cond2}, ${4:value2}, ${5:default})",
    kind: "function",
    detail:
      "Multi-way switch: value of the first true condition, otherwise the default; quantities are converted to the unit of the first quantity value",
  },
  {
    label: "isin",
    insert: "isin(${1:x}, ${2:v1}, ${3:v2})",
    kind: "function",
    detail: "True where x equals any of the listed values (text or numbers)",
  },
  {
    label: "contains",
    insert: "contains(${1:s}, ${2:sub})",
    kind: "function",
    detail: "True where the text contains the substring",
  },
  {
    label: "startswith",
    insert: "startswith(${1:s}, ${2:prefix})",
    kind: "function",
    detail: "True where the text starts with the prefix",
  },
  {
    label: "endswith",
    insert: "endswith(${1:s}, ${2:suffix})",
    kind: "function",
    detail: "True where the text ends with the suffix",
  },
  {
    label: "upper",
    insert: "upper(${1:s})",
    kind: "function",
    detail: "Upper-case text",
  },
  {
    label: "lower",
    insert: "lower(${1:s})",
    kind: "function",
    detail: "Lower-case text",
  },
  {
    label: "strip",
    insert: "strip(${1:s})",
    kind: "function",
    detail: "Remove leading and trailing whitespace",
  },
  {
    label: "replace",
    insert: "replace(${1:s}, ${2:old}, ${3:new})",
    kind: "function",
    detail: "Replace all occurrences of old with new in text",
  },
  {
    label: "slice",
    insert: "slice(${1:s}, ${2:start}, ${3:stop})",
    kind: "function",
    detail:
      "Substring from start (inclusive) to stop (exclusive); negative indices count from the end",
  },
  {
    label: "len",
    insert: "len(${1:s})",
    kind: "function",
    detail: "Text length",
  },
  {
    label: "find",
    insert: "find(${1:s}, ${2:sub})",
    kind: "function",
    detail: "Index of the first occurrence of sub in text, -1 if absent",
  },
  {
    label: "zfill",
    insert: "zfill(${1:s}, ${2:width})",
    kind: "function",
    detail: "Left-pad text with zeros to the given width",
  },
  {
    label: "num",
    insert: "num(${1:s})",
    kind: "function",
    detail: "Parse text to a dimensionless number; fails on unparseable values",
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
