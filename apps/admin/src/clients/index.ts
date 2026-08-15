import { createClient as createAdminClient } from "./admin/client";
import { getAuthToken } from "../auth/token";

function getAdminBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "";
  }

  if (!window.__APP_CONFIG__) {
    throw new Error(
      "App configuration is required. Please set window.__APP_CONFIG__",
    );
  }

  return window.__APP_CONFIG__.adminBaseUrl;
}

export const adminClient = createAdminClient({
  baseUrl: getAdminBaseUrl(),
});

function addAuthHeader(request: Request): Request {
  const token = getAuthToken();
  if (!token) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return new Request(request, { headers });
}

adminClient.interceptors.request.use(addAuthHeader);
