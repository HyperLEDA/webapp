const AUTH_TOKEN_STORAGE_KEY = "leda.auth.token";
export const AUTH_CHANGE_EVENT = "leda.auth.change";

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAuthToken(): string | undefined {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token || undefined;
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  notifyAuthChange();
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  notifyAuthChange();
}
