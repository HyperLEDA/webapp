import { createClient as createBackendClient } from './backend/client';
import { createClient as createAdminClient } from './admin/client';
import { config } from '../config';

export const backendClient = createBackendClient({
  baseUrl: config.backendBaseUrl,
});

export const adminClient = createAdminClient({
  baseUrl: config.adminBaseUrl,
});
