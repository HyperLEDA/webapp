import { createClient as createBackendClient } from "./backend/client";
import { config } from "../config";

export const backendClient = createBackendClient({
  baseUrl: config.backendBaseUrl,
});
