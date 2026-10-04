import { describe, expect, it, vi } from "vitest";
import {
  createSpeechEngine,
  describeSpeechError,
  filterVoices,
  pickDefaultVoice,
  sortVoices,
  voiceScore,
  type SpeechSynthesisVoiceLike,
  type UtteranceLike,
} from "../src/lib/speech";

function voice(partial: Partial<SpeechSynthesisVoiceLike>): SpeechSynthesisVoiceLike {
  return {
    name: "Voice",
    lang: "en-US",
    voiceURI: "voice",
    default: false,
    ...partial,
  };
}

function makeUtterance(text: string): UtteranceLike {
  return {
    text,
    voice: null,
    lang: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    onend: null,
    onerror: null,
  };
}

function makeSynth() {
  const synth = {
    spoken: [] as UtteranceLike[],
    getVoices: vi.fn((): SpeechSynthesisVoiceLike[] => []),
    speak: vi.fn((u: UtteranceLike) => {
      synth.spoken.push(u);
    }),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    paused: false,
    speaking: false,
  };
  return synth;
}

describe("voiceScore", () => {
  it("ranks pt-BR above all others", () => {
    const ptbr = voiceScore(voice({ lang: "pt-BR" }));
    const pt = voiceScore(voice({ lang: "pt-PT" }));
    const en = voiceScore(voice({ lang: "en-US" }));
    const other = voiceScore(voice({ lang: "de-DE" }));
    expect(ptbr).toBeGreaterThan(pt);
    expect(pt).toBeGreaterThan(en);
    expect(en).toBeGreaterThan(other);
  });

  it("is case-insensitive", () => {
    expect(voiceScore(voice({ lang: "PT-br" }))).toBe(voiceScore(voice({ lang: "pt-BR" })));
  });
});

describe("sortVoices", () => {
  it("puts pt-BR first without mutating the input", () => {
    const input = [voice({ lang: "en-US", name: "A" }), voice({ lang: "pt-BR", name: "B" })];
    const sorted = sortVoices(input);
    expect(sorted[0].lang).toBe("pt-BR");
    expect(input[0].lang).toBe("en-US");
  });
});

describe("filterVoices", () => {
  const voices = [voice({ lang: "pt-BR", name: "PT" }), voice({ lang: "en-US", name: "EN" })];

  it("returns every voice for the 'all' filter", () => {
    expect(filterVoices(voices, "all")).toHaveLength(2);
  });

  it("matches by language prefix", () => {
    expect(filterVoices(voices, "pt").map((v) => v.name)).toEqual(["PT"]);
  });

  it("falls back to all voices when nothing matches", () => {
    expect(filterVoices(voices, "zz")).toHaveLength(2);
  });
});

describe("pickDefaultVoice", () => {
  it("prefers the saved voice when present", () => {
    const list = [voice({ voiceURI: "a", lang: "pt-BR" }), voice({ voiceURI: "b", lang: "pt-BR" })];
    expect(pickDefaultVoice(list, "pt", "b")?.voiceURI).toBe("b");
  });

  it("falls back to the first voice when the saved one is gone", () => {
    const list = [voice({ voiceURI: "a" }), voice({ voiceURI: "b" })];
    expect(pickDefaultVoice(list, "all", "missing")?.voiceURI).toBe("a");
  });

  it("returns null for an empty list", () => {
    expect(pickDefaultVoice([], "all", null)).toBeNull();
  });
});

describe("describeSpeechError", () => {
  it("returns null for cancellations", () => {
    expect(describeSpeechError("canceled")).toBeNull();
    expect(describeSpeechError("interrupted")).toBeNull();
  });

  it("maps known codes to a message", () => {
    expect(describeSpeechError("language-unavailable")).toContain("voz");
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(describeSpeechError("weird")).toContain("weird");
  });
});

describe("createSpeechEngine", () => {
  it("speaks the given text with the configured options", () => {
    const synth = makeSynth();
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    const selected = voice({ lang: "pt-BR", voiceURI: "pt" });

    engine.speak("Olá mundo", { voice: selected, rate: 1.5, pitch: 0.8, volume: 0.5 });

    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utter = synth.spoken[0];
    expect(utter.text).toBe("Olá mundo");
    expect(utter.rate).toBe(1.5);
    expect(utter.pitch).toBe(0.8);
    expect(utter.volume).toBe(0.5);
    expect(utter.voice).toBe(selected);
    expect(utter.lang).toBe("pt-BR");
  });

  it("cancels any previous utterance before speaking", () => {
    const synth = makeSynth();
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    engine.speak("a", { rate: 1, pitch: 1, volume: 1 });
    engine.speak("b", { rate: 1, pitch: 1, volume: 1 });
    expect(synth.cancel).toHaveBeenCalledTimes(2);
  });

  it("invokes onEnd when the utterance ends", () => {
    const synth = makeSynth();
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    const onEnd = vi.fn();
    engine.speak("a", { rate: 1, pitch: 1, volume: 1 }, { onEnd });
    synth.spoken[0].onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("reports known errors and ignores cancellations", () => {
    const synth = makeSynth();
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    const onError = vi.fn();

    engine.speak("a", { rate: 1, pitch: 1, volume: 1 }, { onError });
    synth.spoken[0].onerror?.({ error: "canceled" });
    expect(onError).not.toHaveBeenCalled();

    engine.speak("b", { rate: 1, pitch: 1, volume: 1 }, { onError });
    synth.spoken[1].onerror?.({ error: "synthesis-failed" });
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("voz"));
  });

  it("delegates cancel, pause and resume to the synthesizer", () => {
    const synth = makeSynth();
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    engine.cancel();
    engine.pause();
    engine.resume();
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.pause).toHaveBeenCalled();
    expect(synth.resume).toHaveBeenCalled();
  });

  it("exposes the synthesizer voices", () => {
    const synth = makeSynth();
    synth.getVoices.mockReturnValue([voice({ name: "PT", lang: "pt-BR" })]);
    const engine = createSpeechEngine({ synth, createUtterance: makeUtterance });
    expect(engine.getVoices()).toHaveLength(1);
  });
});
