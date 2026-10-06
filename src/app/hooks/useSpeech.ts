import * as React from "react";

import type {
  SpeakHandlers,
  SpeakOptions,
  SpeechEngine,
  SpeechSynthesisVoiceLike,
} from "../../lib/speech";

export interface SpeechControls {
  supported: boolean;
  voices: SpeechSynthesisVoiceLike[];
  speak: (text: string, options: SpeakOptions, handlers?: SpeakHandlers) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Thin wrapper over a SpeechEngine: voice list (refreshed on mount and on
 * the browser `voiceschanged` event) plus speak/pause/resume/stop
 * delegation. A null engine means speech is unsupported.
 */
export function useSpeech(
  engine: SpeechEngine | null,
  synth: SpeechSynthesis | null,
): SpeechControls {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoiceLike[]>([]);

  const refresh = React.useCallback(() => {
    setVoices(engine ? [...engine.getVoices()] : []);
  }, [engine]);

  React.useEffect(() => {
    refresh();
    if (synth && "onvoiceschanged" in synth) {
      const handler = () => refresh();
      synth.onvoiceschanged = handler;
      return () => {
        if (synth.onvoiceschanged === handler) {
          synth.onvoiceschanged = null;
        }
      };
    }
    return undefined;
  }, [refresh, synth]);

  const speak = React.useCallback(
    (text: string, options: SpeakOptions, handlers?: SpeakHandlers) => {
      engine?.speak(text, options, handlers);
    },
    [engine],
  );

  const pause = React.useCallback(() => {
    engine?.pause();
  }, [engine]);

  const resume = React.useCallback(() => {
    engine?.resume();
  }, [engine]);

  const stop = React.useCallback(() => {
    engine?.cancel();
  }, [engine]);

  return { supported: engine !== null, voices, speak, pause, resume, stop };
}
