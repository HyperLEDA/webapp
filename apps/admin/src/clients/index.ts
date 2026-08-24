import { config } from "@leda/lib/config";
import { createClient as createAdminClient } from "./admin/client";
import { getAuthToken } from "../auth/token";

export const adminClient = createAdminClient({
  baseUrl: config.adminBaseUrl,
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
