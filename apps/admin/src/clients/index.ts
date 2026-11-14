import { config } from "@leda/lib/config";
import { createClient as createAdminClient } from "./admin/client";

export const adminClient = createAdminClient({
  baseUrl: config.adminBaseUrl,
  credentials: "include",
});
