import { describe, expect, it } from "vitest";
import { coercePreferences } from "../src/lib/preferences";

describe("coercePreferences", () => {
  it("returns the defaults for a missing value", () => {
    expect(coercePreferences(null)).toEqual({
      voiceURI: null,
      filter: "pt-BR",
      rate: 1,
      pitch: 1,
      volume: 1,
      theme: "light",
      cleanText: true,
    });
  });

  it("returns the defaults for a non-object value", () => {
    expect(coercePreferences("nope")).toEqual(coercePreferences(undefined));
  });

  it("keeps valid persisted values", () => {
    const prefs = coercePreferences({
      voiceURI: "voz-teste",
      filter: "all",
      rate: 1.5,
      pitch: 0.8,
      volume: 0.4,
      theme: "dark",
      cleanText: true,
    });

    expect(prefs).toEqual({
      voiceURI: "voz-teste",
      filter: "all",
      rate: 1.5,
      pitch: 0.8,
      volume: 0.4,
      theme: "dark",
      cleanText: true,
    });
  });

  it("falls back per-field when values are invalid", () => {
    const prefs = coercePreferences({
      voiceURI: "",
      filter: "klingon",
      rate: "fast",
      pitch: 99,
      volume: -3,
      theme: "neon",
    });

    expect(prefs).toEqual({
      voiceURI: null,
      filter: "pt-BR",
      rate: 1,
      pitch: 2,
      volume: 0,
      theme: "light",
      cleanText: true,
    });
  });

  it("clamps numeric values into their valid range", () => {
    expect(coercePreferences({ rate: 5 }).rate).toBe(2);
    expect(coercePreferences({ rate: 0 }).rate).toBe(0.5);
    expect(coercePreferences({ volume: 2 }).volume).toBe(1);
    expect(coercePreferences({ pitch: 0 }).pitch).toBe(0.5);
  });

  it("coerces the clean-text toggle, defaulting to on", () => {
    expect(coercePreferences({ cleanText: false }).cleanText).toBe(false);
    expect(coercePreferences({ cleanText: true }).cleanText).toBe(true);
    expect(coercePreferences({}).cleanText).toBe(true);
    expect(coercePreferences({ cleanText: "yes" }).cleanText).toBe(true);
  });
});
