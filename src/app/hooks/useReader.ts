import * as React from "react";

import { chunkText } from "../../lib/segmentation";
import { cleanTextForSpeech } from "../../lib/clean";

export interface ReaderControls {
  chunks: string[];
  index: number;
  load: (text: string, clean: boolean) => void;
  jump: (delta: number) => void;
  goTo: (index: number) => void;
  reset: () => void;
}

/**
 * Chunk list + cursor. Same rules as vanilla `main.ts`: text is cleaned
 * first when the toggle is on, then segmented; jumps clamp to bounds.
 */
export function useReader(): ReaderControls {
  const [chunks, setChunks] = React.useState<string[]>([]);
  const [index, setIndex] = React.useState(0);
  const countRef = React.useRef(0);
  countRef.current = chunks.length;

  const load = React.useCallback((text: string, clean: boolean) => {
    const prepared = clean ? cleanTextForSpeech(text) : text;
    setChunks(chunkText(prepared));
    setIndex(0);
  }, []);

  const clamp = React.useCallback((value: number) => {
    const max = Math.max(0, countRef.current - 1);
    return Math.min(max, Math.max(0, value));
  }, []);

  const jump = React.useCallback(
    (delta: number) => {
      setIndex((previous) => clamp(previous + delta));
    },
    [clamp],
  );

  const goTo = React.useCallback(
    (value: number) => {
      setIndex(clamp(value));
    },
    [clamp],
  );

  const reset = React.useCallback(() => {
    setChunks([]);
    setIndex(0);
  }, []);

  return { chunks, index, load, jump, goTo, reset };
}
