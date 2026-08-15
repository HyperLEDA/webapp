import { createClient as createBackendClient } from "./backend/client";
import { createClient as createAdminClient } from "./admin/client";
import { config } from "../config";
import { getAuthToken } from "../auth/token";

export const backendClient = createBackendClient({
  baseUrl: config.backendBaseUrl,
  auth: () => getAuthToken(),
});

export const adminClient = createAdminClient({
  baseUrl: config.adminBaseUrl,
  auth: () => getAuthToken(),
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

backendClient.interceptors.request.use(addAuthHeader);
adminClient.interceptors.request.use(addAuthHeader);
