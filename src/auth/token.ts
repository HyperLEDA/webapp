const AUTH_TOKEN_STORAGE_KEY = "hyperleda.auth.token";

export function getAuthToken(): string | undefined {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token || undefined;
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
