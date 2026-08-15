import { useSyncExternalStore } from "react";
import { AUTH_CHANGE_EVENT, isLoggedIn } from "./token";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
}

export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, isLoggedIn, () => false);
}
