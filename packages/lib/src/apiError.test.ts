import { expect, it } from "vitest";
import {
  describeUnknownError,
  formatApiError,
  formatCaughtError,
} from "./apiError";

it("formats network Error objects instead of empty braces", () => {
  const networkError = new TypeError("Failed to fetch");
  expect(formatApiError(networkError)).toBe("Failed to fetch");
  expect(describeUnknownError(networkError)).toBe("Failed to fetch");
  expect(formatCaughtError(networkError)).toBe("Failed to fetch");
});

it("formats empty error payloads as a readable failure", () => {
  expect(formatApiError({})).toBe("Request failed");
  expect(describeUnknownError({})).toBe("Request failed");
  expect(formatCaughtError({})).toBe("Request failed");
});

it("keeps FastAPI validation details readable", () => {
  expect(
    formatApiError({
      detail: [{ msg: "table already exists", type: "value_error", loc: [] }],
    }),
  ).toBe("table already exists");
});

it("uses admin API message payloads", () => {
  expect(
    formatApiError({
      code: "conflict",
      status: 409,
      message: "table already exists",
    }),
  ).toBe("table already exists");
});
