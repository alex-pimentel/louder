// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePreferences } from "../src/app/hooks/usePreferences";
import { useReader } from "../src/app/hooks/useReader";
import { useSpeech } from "../src/app/hooks/useSpeech";
import type { SpeechEngine, SpeechSynthesisVoiceLike } from "../src/lib/speech";

beforeEach(() => {
  window.localStorage.clear();
});

function stubEngine(): SpeechEngine & { calls: string[] } {
  const calls: string[] = [];
  const engine = {
    calls,
    getVoices: () => [],
    speak: (
      text: string,
      _options: unknown,
      handlers?: { onEnd?: () => void; onError?: (message: string) => void },
    ) => {
      calls.push(text);
      (engine as { lastHandlers?: unknown }).lastHandlers = handlers;
    },
    pause: () => {},
    resume: () => {},
    cancel: () => {},
  };
  return engine as SpeechEngine & { calls: string[] };
}

describe("usePreferences", () => {
  it("persists patches to localStorage", () => {
    const { result } = renderHook(() => usePreferences());
    act(() => {
      result.current[1]({ rate: 1.5 });
    });
    expect(result.current[0].rate).toBe(1.5);
    const stored = JSON.parse(window.localStorage.getItem("louder-preferences") ?? "{}");
    expect(stored.rate).toBe(1.5);
  });

  it("loads persisted values on mount", () => {
    window.localStorage.setItem(
      "louder-preferences",
      JSON.stringify({ cleanText: false, theme: "dark" }),
    );
    const { result } = renderHook(() => usePreferences());
    expect(result.current[0].cleanText).toBe(false);
    expect(result.current[0].theme).toBe("dark");
  });
});

describe("useReader", () => {
  it("loads text into chunks and clamps jumps", () => {
    const sentence = "Uma frase bem longa para ultrapassar o limite de empacotamento dos trechos. ";
    const { result } = renderHook(() => useReader());
    act(() => {
      result.current.load(`${sentence}${sentence}${sentence}${sentence}`, true);
    });
    expect(result.current.chunks.length).toBeGreaterThan(1);
    const last = result.current.chunks.length - 1;
    act(() => {
      result.current.jump(99);
    });
    expect(result.current.index).toBe(last);
    act(() => {
      result.current.jump(-99);
    });
    expect(result.current.index).toBe(0);
  });

  it("cleans markdown when the toggle is on and keeps it raw when off", () => {
    const { result } = renderHook(() => useReader());
    act(() => {
      result.current.load("# Título **forte**", true);
    });
    expect(result.current.chunks.join(" ")).not.toContain("#");
    act(() => {
      result.current.load("# Título **forte**", false);
    });
    expect(result.current.chunks.join(" ")).toContain("#");
  });
});

describe("useSpeech", () => {
  it("delegates speak to the engine", () => {
    const engine = stubEngine();
    const { result } = renderHook(() => useSpeech(engine, null));
    act(() => {
      result.current.speak("oi", { rate: 1, pitch: 1, volume: 1, voice: null });
    });
    expect(engine.calls).toEqual(["oi"]);
  });

  it("refreshes voices when the browser announces them", () => {
    const announced: SpeechSynthesisVoiceLike[] = [];
    const listeners: Record<string, () => void> = {};
    const synth = {
      set onvoiceschanged(handler: (() => void) | null) {
        if (handler) {
          listeners.changed = handler;
        }
      },
    };
    const engine = stubEngine();
    engine.getVoices = () => [...announced];
    const { result } = renderHook(() => useSpeech(engine, synth as unknown as SpeechSynthesis));
    expect(result.current.voices).toHaveLength(0);
    announced.push({ name: "Voz", lang: "pt-BR", voiceURI: "v", default: true });
    act(() => {
      listeners.changed();
    });
    expect(result.current.voices.map((v) => v.voiceURI)).toEqual(["v"]);
  });
});
