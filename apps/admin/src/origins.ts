import { sameEnvWebOrigin } from "@leda/lib/origins";

interface ExternalLinkTarget {
  href: string;
  external: boolean;
}

export function publicObjectUrl(pgc: number): ExternalLinkTarget {
  return {
    href: `${sameEnvWebOrigin()}/object/${pgc}`,
    external: true,
  };
}

export function adminTableUrl(tableName: string): ExternalLinkTarget {
  return {
    href: `/table/${encodeURIComponent(tableName)}`,
    external: false,
  };
}
