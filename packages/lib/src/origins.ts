const localWebOrigin = "http://localhost:5173";

export function sameEnvWebOrigin(): string {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localWebOrigin;
  }
  if (hostname.startsWith("admin.")) {
    return `${protocol}//${hostname.slice("admin.".length)}`;
  }
  return `${protocol}//${hostname}`;
}

function isAdminInterface(): boolean {
  const { hostname, port } = window.location;
  if (hostname.startsWith("admin.")) {
    return true;
  }
  return (
    (hostname === "localhost" || hostname === "127.0.0.1") && port === "5174"
  );
}

export function publicObjectUrl(pgc: number): {
  href: string;
  external: boolean;
} {
  if (isAdminInterface()) {
    return {
      href: `${sameEnvWebOrigin()}/object/${pgc}`,
      external: true,
    };
  }
  return {
    href: `/object/${pgc}`,
    external: false,
  };
}

export function publicDataCatalogQueryUrl(sql: string): {
  href: string;
  external: boolean;
} {
  const path = `/data-catalog/query?q=${encodeURIComponent(sql)}`;
  if (isAdminInterface()) {
    return {
      href: `${sameEnvWebOrigin()}${path}`,
      external: true,
    };
  }
  return {
    href: path,
    external: false,
  };
}
