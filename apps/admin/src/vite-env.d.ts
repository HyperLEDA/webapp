/// <reference types="vite/client" />

interface AppConfig {
  backendBaseUrl: string;
  adminBaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

export {};
