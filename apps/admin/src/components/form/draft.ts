const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface StoredDraft<T> {
  savedAt: number;
  value: T;
}

export function readFormDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    // SAFETY: writeFormDraft is the only writer; savedAt expiry rejects stale or corrupt payloads.
    const draft = JSON.parse(raw) as StoredDraft<T>;
    if (
      !Number.isFinite(draft.savedAt) ||
      Date.now() - draft.savedAt > DRAFT_TTL_MS ||
      draft.value === null ||
      draft.value === undefined
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft.value;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeFormDraft<T>(key: string, value: T): void {
  const payload: StoredDraft<T> = { savedAt: Date.now(), value };
  window.localStorage.setItem(key, JSON.stringify(payload));
}

export function clearFormDraft(key: string): void {
  window.localStorage.removeItem(key);
}
