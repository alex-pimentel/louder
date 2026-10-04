import { coercePreferences, DEFAULT_PREFERENCES, type Preferences } from "./preferences";

export type { Preferences, Theme } from "./preferences";
export { DEFAULT_PREFERENCES };

export const PREFERENCES_KEY = "louder-preferences";

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) {
    return storage;
  }
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPreferences(storage?: Storage): Preferences {
  const store = resolveStorage(storage);
  if (!store) {
    return { ...DEFAULT_PREFERENCES };
  }
  try {
    const raw = store.getItem(PREFERENCES_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }
    return coercePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: Preferences, storage?: Storage): void {
  const store = resolveStorage(storage);
  if (!store) {
    return;
  }
  try {
    store.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage indisponível (modo privado): seguimos sem persistir.
  }
}
