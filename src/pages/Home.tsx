import { ReactElement } from "react";
import { Link } from "../components/core/Link";

const homePageHint: ReactElement = (
  <div>
    <div>Examples:</div>
    <ul>
      <li>
        By PGC number and name: <Link href="/query?q=123">123</Link>
      </li>
      <li>
        By name (string match): <Link href="/query?q=IC%20144">IC 144</Link>
      </li>
      <li>
        By coordinates (J2000 packed):{" "}
        <Link href="/query?q=J123049.42%2B122328.0">J123049.42+122328.0</Link>
      </li>
      <li>
        By coordinates (sexagesimal):{" "}
        <Link href="/query?q=12h%2030m%2049.42s%20%2B12d%2023m%2028.0%22">
          12h 30m 49.42s +12d 23m 28.0&quot;
        </Link>
      </li>
      <li>
        By coordinates (decimal degrees):{" "}
        <Link href="/query?q=189.0866%20%2B25.9875">189.0866 +25.9875</Link>
      </li>
      <li>
        By coordinates (B1950):{" "}
        <Link href="/query?q=B132746.30%2B472711.0">B132746.30+472711.0</Link>
      </li>
      <li>
        By coordinates (galactic):{" "}
        <Link href="/query?q=G208.711%2B44.539">G208.711+44.539</Link>
      </li>
      <li>
        By coordinates (supergalactic):{" "}
        <Link href="/query?q=S95.61%2B6.12">S95.61+6.12</Link>
      </li>
    </ul>
  </div>
);

export function HomePage(): ReactElement {
  return (
    <>
      <div className="max-w-4xl mx-auto mt-8 prose dark:prose-invert leading-none prose-a:no-underline">
        {homePageHint}
      </div>
    </>
  );
}
