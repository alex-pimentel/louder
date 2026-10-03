export interface Preferences {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  filter: string;
  theme: "light" | "dark";
}

export const PREFERENCES_KEY = "louder-preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  voiceURI: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  filter: "pt-BR",
  theme: "light",
};

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
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
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
