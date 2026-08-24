interface AppConfig {
  backendBaseUrl: string;
  adminBaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

export type BackendEnvironment = "test" | "prod";

const DEV_BACKEND_ENV_STORAGE_KEY = "leda.backend-env";

const backendEnvironmentUrls = {
  test: {
    backendBaseUrl: "https://leda.kraysent.dev",
    adminBaseUrl: "https://leda.kraysent.dev",
  },
  prod: {
    backendBaseUrl: "https://leda.sao.ru",
    adminBaseUrl: "https://admin.leda.sao.ru",
  },
} satisfies Record<BackendEnvironment, AppConfig>;

const backendEnvironmentLabels = {
  test: "Test",
  prod: "Production",
} satisfies Record<BackendEnvironment, string>;

const backendEnvironmentCycle: BackendEnvironment[] = ["test", "prod"];

export function readDevBackendEnvironment(): BackendEnvironment {
  if (!import.meta.env.DEV) {
    return "test";
  }

  const stored = localStorage.getItem(DEV_BACKEND_ENV_STORAGE_KEY);
  if (stored === "prod") {
    return "prod";
  }
  return "test";
}

export function setDevBackendEnvironment(
  environment: BackendEnvironment,
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  localStorage.setItem(DEV_BACKEND_ENV_STORAGE_KEY, environment);
}

export function nextBackendEnvironment(
  current: BackendEnvironment,
): BackendEnvironment {
  const index = backendEnvironmentCycle.indexOf(current);
  return backendEnvironmentCycle[(index + 1) % backendEnvironmentCycle.length];
}

export function backendEnvironmentLabel(
  environment: BackendEnvironment,
): string {
  return backendEnvironmentLabels[environment];
}

function getDevConfig(): AppConfig {
  return backendEnvironmentUrls[readDevBackendEnvironment()];
}

function getConfig(): AppConfig {
  if (!("window" in globalThis)) {
    throw new Error(
      "App configuration is required. Please set window.__APP_CONFIG__",
    );
  }

  if (import.meta.env.DEV) {
    return getDevConfig();
  }

  if (!window.__APP_CONFIG__) {
    throw new Error(
      "App configuration is required. Please set window.__APP_CONFIG__",
    );
  }

  return window.__APP_CONFIG__;
}

export const config = getConfig();
