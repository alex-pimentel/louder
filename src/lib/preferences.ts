export type Theme = "light" | "dark";

export interface Preferences {
  voiceURI: string | null;
  filter: string;
  rate: number;
  pitch: number;
  volume: number;
  theme: Theme;
  cleanText: boolean;
}

/** Valid voice filter values accepted by the UI. */
export const VOICE_FILTERS = ["pt-BR", "all", "en", "es"] as const;

const FILTERS: ReadonlySet<string> = new Set(VOICE_FILTERS);

export const DEFAULT_PREFERENCES: Preferences = {
  voiceURI: null,
  filter: "pt-BR",
  rate: 1,
  pitch: 1,
  volume: 1,
  theme: "light",
  cleanText: true,
};

function toNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toFilter(value: unknown): string {
  return typeof value === "string" && FILTERS.has(value) ? value : DEFAULT_PREFERENCES.filter;
}

function toTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Normalizes an untyped value (typically parsed `localStorage`) into a valid
 * `Preferences` object, falling back per-field. Pure and safe to unit test.
 */
export function coercePreferences(value: unknown): Preferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }

  const source = value as Record<string, unknown>;

  return {
    voiceURI: toStringOrNull(source.voiceURI),
    filter: toFilter(source.filter),
    rate: toNumber(source.rate, 0.5, 2, DEFAULT_PREFERENCES.rate),
    pitch: toNumber(source.pitch, 0.5, 2, DEFAULT_PREFERENCES.pitch),
    volume: toNumber(source.volume, 0, 1, DEFAULT_PREFERENCES.volume),
    theme: toTheme(source.theme),
    cleanText: toBoolean(source.cleanText, DEFAULT_PREFERENCES.cleanText),
  };
}
