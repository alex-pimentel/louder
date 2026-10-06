export interface SpeechSynthesisVoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
}

export interface UtteranceLike {
  text: string;
  voice: SpeechSynthesisVoiceLike | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onend: ((event?: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

export interface SpeechSynthesisLike {
  getVoices(): SpeechSynthesisVoiceLike[];
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  readonly speaking: boolean;
  onvoiceschanged?: (() => void) | null;
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoiceLike | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeakHandlers {
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export interface SpeechEngineDeps {
  synth: SpeechSynthesisLike;
  createUtterance?: (text: string) => UtteranceLike;
}

export interface SpeechEngine {
  getVoices(): SpeechSynthesisVoiceLike[];
  speak(text: string, options: SpeakOptions, handlers?: SpeakHandlers): void;
  cancel(): void;
  pause(): void;
  resume(): void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "language-unavailable": "Idioma indisponível nesta voz — escolha outra voz.",
  "language-not-supported": "Idioma não suportado por esta voz — escolha outra voz.",
  "voice-unavailable": "Voz indisponível no momento — escolha outra voz.",
  "synthesis-failed": "Falha no motor de voz do navegador.",
  "synthesis-unavailable": "Motor de voz indisponível neste dispositivo.",
  "audio-busy": "Saída de áudio ocupada — feche outro app usando som.",
  "audio-hardware": "Dispositivo de áudio indisponível.",
  network: "Esta voz precisa de internet — use uma voz local.",
  "text-too-long": "Trecho muito longo para esta voz.",
  "invalid-argument": "Parâmetro de voz inválido.",
};

const IGNORED_ERRORS = new Set(["canceled", "interrupted"]);

export function describeSpeechError(code?: string): string | null {
  if (!code) {
    return "Não foi possível reproduzir o trecho.";
  }
  if (IGNORED_ERRORS.has(code)) {
    return null;
  }
  return ERROR_MESSAGES[code] ?? `Erro na voz: ${code}.`;
}

export function voiceScore(voice: SpeechSynthesisVoiceLike): number {
  const lang = (voice.lang || "").toLowerCase();
  if (lang.startsWith("pt-br")) {
    return 100;
  }
  if (lang.startsWith("pt")) {
    return 80;
  }
  if (lang.startsWith("en")) {
    return 10;
  }
  return 0;
}

export function sortVoices(voices: SpeechSynthesisVoiceLike[]): SpeechSynthesisVoiceLike[] {
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function filterVoices(
  voices: SpeechSynthesisVoiceLike[],
  filter: string,
): SpeechSynthesisVoiceLike[] {
  if (!filter || filter === "all") {
    return [...voices];
  }
  const needle = filter.toLowerCase();
  const matched = voices.filter((voice) => (voice.lang || "").toLowerCase().startsWith(needle));
  return matched.length ? matched : [...voices];
}

export function pickDefaultVoice(
  voices: SpeechSynthesisVoiceLike[],
  filter: string,
  savedUri: string | null,
): SpeechSynthesisVoiceLike | null {
  const list = filterVoices(voices, filter);
  if (!list.length) {
    return null;
  }
  if (savedUri) {
    const saved = list.find((voice) => voice.voiceURI === savedUri);
    if (saved) {
      return saved;
    }
  }
  return list[0];
}

/**
 * Resolves the voice URI the UI should select: keeps the saved URI when that
 * voice is in the filtered list, otherwise falls back to the filtered default
 * (never a stale URI pointing at a voice that is gone or filtered out).
 */
export function resolveVoiceURI(
  voices: SpeechSynthesisVoiceLike[],
  filter: string,
  savedUri: string | null,
): string {
  return pickDefaultVoice(voices, filter, savedUri)?.voiceURI ?? "";
}

function defaultCreateUtterance(text: string): UtteranceLike {
  const ctor = (
    globalThis as {
      SpeechSynthesisUtterance?: new (value: string) => unknown;
    }
  ).SpeechSynthesisUtterance;
  if (!ctor) {
    throw new Error("Web Speech API indisponível neste navegador.");
  }
  return new ctor(text) as UtteranceLike;
}

export function getBrowserSynthesis(): SpeechSynthesisLike | null {
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis;
  return synth ?? null;
}

export function createSpeechEngine(deps: SpeechEngineDeps): SpeechEngine {
  const { synth } = deps;
  const createUtterance = deps.createUtterance ?? defaultCreateUtterance;

  return {
    getVoices: () => synth.getVoices(),

    speak(text, options, handlers = {}) {
      synth.cancel();
      const utterance = createUtterance(text);
      utterance.text = text;
      if (options.voice) {
        utterance.voice = options.voice;
        utterance.lang = options.voice.lang;
      }
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.volume = options.volume;
      utterance.onend = () => handlers.onEnd?.();
      utterance.onerror = (event) => {
        const message = describeSpeechError(event?.error);
        if (message) {
          handlers.onError?.(message);
        }
      };
      synth.speak(utterance);
    },

    cancel: () => synth.cancel(),
    pause: () => synth.pause(),
    resume: () => synth.resume(),
  };
}
