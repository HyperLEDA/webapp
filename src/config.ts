interface AppConfig {
  backendBaseUrl: string;
  adminBaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

function getConfig(): AppConfig {
  if (typeof window === 'undefined' || !window.__APP_CONFIG__) {
    throw new Error('App configuration is required. Please set window.__APP_CONFIG__');
  }
  
  return window.__APP_CONFIG__;
}

export const config = getConfig();
