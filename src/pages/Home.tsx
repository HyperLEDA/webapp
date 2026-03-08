import { ReactElement } from "react";
import { Link } from "../components/core/Link";

const homePageHint: ReactElement = (
  <div>
    <div>Examples:</div>
    <ul>
      <li>
        By name (string match): <Link href="/query?q=IC1445">IC1445</Link>
      </li>
      <li>
        By coordinates (hms+dms):{" "}
        <Link href="/query?q=12h32m22s%2B15d22m45s">12h32m22s+15d22m45s</Link>
      </li>
      <li>
        By coordinates (J2000):{" "}
        <Link href="/query?q=J001122.33%2B443322.1">J001122.33+443322.1</Link>
      </li>
    </ul>
  </div>
);

export function HomePage(): ReactElement {
  return (
    <>
      <div className="max-w-4xl mx-auto mt-8 prose prose-invert leading-none prose-a:no-underline">
        {homePageHint}
      </div>
    </>
  );
}
