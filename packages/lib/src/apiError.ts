import type { ValidationError } from "@leda/lib/clients/backend";

interface ApiErrorPayload {
  code?: string;
  status?: number;
  detail?: ValidationError[];
  message?: string;
}

type ApiClientError =
  string | Error | ApiErrorPayload | ValidationError[] | null | undefined;

export function describeUnknownError(error: ApiClientError): string {
  if (error === null || error === undefined) {
    return String(error);
  }
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }
  if (Object(error) !== error) {
    return String(error);
  }
  if (Array.isArray(error)) {
    return error.length ? JSON.stringify(error) : "Unknown error";
  }
  if (Object.keys(error).length === 0) {
    return "Request failed";
  }
  return JSON.stringify(error);
}

export function formatApiError(error: ApiClientError): string {
  if (error === null || error === undefined) {
    return "Unknown error";
  }
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }
  if (Array.isArray(error)) {
    return error.length
      ? error.map((entry) => entry.msg).join(", ")
      : "Unknown error";
  }
  if (Object(error) !== error) {
    return String(error);
  }
  // SAFETY: Remaining errors are API payloads after array and primitive checks.
  const payload = error as ApiErrorPayload;
  if (payload.detail?.length) {
    return payload.detail.map((entry) => entry.msg).join(", ");
  }
  if (payload.message) {
    return payload.message;
  }
  return describeUnknownError(error);
}

export function formatCaughtError(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message || cause.name || "Unknown error";
  }
  // SAFETY: Non-Error catches come from API clients that return ApiClientError values.
  return describeUnknownError(cause as ApiClientError);
}
