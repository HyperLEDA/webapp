const localWebOrigin = "http://localhost:5173";
const localAdminOrigin = "http://localhost:5174";
const localTasksOrigin = "http://localhost:4200";

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

export function sameEnvTasksOrigin(): string {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localTasksOrigin;
  }
  const baseHost = hostname.startsWith("admin.")
    ? hostname.slice("admin.".length)
    : hostname;
  return `${protocol}//tasks.${baseHost}`;
}
