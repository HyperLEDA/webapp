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
        <Link href="/query?q=J123049.42%2B122328.0">J123049.42+122328.0</Link>
      </li>
      <li>
        By coordinates (decimal degrees):{" "}
        <Link href="/query?q=187.7059%2B12.3911">187.7059+12.3911</Link>
      </li>
      <li>
        By coordinates (B1950):{" "}
        <Link href="/query?q=B123049.4%2B122328">B123049.4+122328</Link>
      </li>
      <li>
        By coordinates (galactic):{" "}
        <Link href="/query?q=G283.777%2B74.491">G283.777+74.491</Link>
      </li>
      <li>
        By coordinates (supergalactic):{" "}
        <Link href="/query?q=S102.89-2.35">S102.89-2.35</Link>
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
