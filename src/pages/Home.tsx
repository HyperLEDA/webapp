import { ReactElement } from "react";
import { Link } from "../components/core/Link";

const homePageHint: ReactElement = (
  <div>
    <div>Examples:</div>
    <ul>
      <li>
        By name (string match): <Link href="/query?q=IC%20144">IC 144</Link>
      </li>
      <li>
        By coordinates (J2000 packed):{" "}
        <Link href="/query?q=J001122.33%2B443322.1">J001122.33+443322.1</Link>
      </li>
      <li>
        By coordinates (decimal degrees):{" "}
        <Link href="/query?q=187.7059%2B12.3911">187.7059+12.3911</Link>
      </li>
      <li>
        By coordinates (B1950):{" "}
        <Link href="/query?q=B123456.7-012345.6">B123456.7-012345.6</Link>
      </li>
      <li>
        By coordinates (galactic):{" "}
        <Link href="/query?q=G187.7059%2B12.3911">G187.7059+12.3911</Link>
      </li>
      <li>
        By coordinates (supergalactic):{" "}
        <Link href="/query?q=S123.45-01.23">S123.45-01.23</Link>
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
