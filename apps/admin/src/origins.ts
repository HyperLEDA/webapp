import { sameEnvWebOrigin } from "@hyperleda/lib/origins";

export function publicObjectUrl(pgc: number): {
  href: string;
  external: boolean;
} {
  return {
    href: `${sameEnvWebOrigin()}/object/${pgc}`,
    external: true,
  };
}

export function adminTableUrl(tableName: string): {
  href: string;
  external: boolean;
} {
  return {
    href: `/table/${encodeURIComponent(tableName)}`,
    external: false,
  };
}
