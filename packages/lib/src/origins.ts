const localWebOrigin = "http://localhost:5173";
const localAdminOrigin = "http://localhost:5174";

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

export function sameEnvAdminOrigin(): string {
  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localAdminOrigin;
  }
  if (hostname.startsWith("admin.")) {
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }
  return `${protocol}//admin.${hostname}${port ? `:${port}` : ""}`;
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

export function adminTableUrl(tableName: string): {
  href: string;
  external: boolean;
} {
  const encodedName = encodeURIComponent(tableName);
  if (isAdminInterface()) {
    return {
      href: `/table/${encodedName}`,
      external: false,
    };
  }
  return {
    href: `${sameEnvAdminOrigin()}/table/${encodedName}`,
    external: true,
  };
}
