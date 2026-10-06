// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
import { App } from "../src/app/App";
import type { SpeechSynthesisVoiceLike } from "../src/lib/speech";

vi.mock("../src/lib/article", () => ({
  isHttpUrl: () => true,
  ArticleError: class extends Error {},
  fetchArticleText: async () => ({ title: "T", text: "corpo da página", via: "reader-proxy" }),
}));

vi.mock("../src/lib/pdf", () => ({
  MAX_PDF_BYTES: 1,
  extractPdfText: async () => "texto do pdf",
}));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders source area, transport and control rail", () => {
    render(<App />);
    expect(document.getElementById("dropzone")).toBeTruthy();
    expect(document.getElementById("textInput")).toBeTruthy();
    expect(document.getElementById("playBtn")).toBeTruthy();
    expect(screen.getByLabelText(/ler texto limpo/i)).toBeTruthy();
  });

  it("disables transport with a note when speech synthesis is unavailable", () => {
    render(<App />);
    expect((document.getElementById("playBtn") as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById("voiceWarning")).toBeTruthy();
    expect(screen.getByText(/nenhuma voz encontrada/i)).toBeTruthy();
  });

  it("shows a persistent proxy privacy note in the rail", () => {
    render(<App />);
    expect(screen.getByText(/r\.jina\.ai/i)).toBeTruthy();
  });

  it("toasts the privacy notice when the page loads via reader proxy", async () => {
    render(<App />);
    fireEvent.change(document.getElementById("urlInput") as HTMLInputElement, {
      target: { value: "https://exemplo.com/pagina" },
    });
    fireEvent.click(document.getElementById("urlBtn") as HTMLButtonElement);
    expect(
      await screen.findByText(/proxy de leitura/i, undefined, { timeout: 5_000 }),
    ).toBeTruthy();
  });

  it("selects the pt-BR default when voices arrive and keeps the user pick", async () => {
    let voices: SpeechSynthesisVoiceLike[] = [];
    let changed: (() => void) | null = null;
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [...voices],
      set onvoiceschanged(handler: (() => void) | null) {
        changed = handler;
      },
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      paused: false,
    });
    try {
      const english = { name: "EN", lang: "en-US", voiceURI: "en", default: false };
      const portuguese = { name: "PT", lang: "pt-BR", voiceURI: "pt", default: true };
      render(<App />);
      expect((document.getElementById("playBtn") as HTMLButtonElement).disabled).toBe(true);
      voices = [english, portuguese];
      await act(async () => {
        changed?.();
      });
      expect((document.getElementById("playBtn") as HTMLButtonElement).disabled).toBe(false);
      expect(screen.getByText(/PT — pt-BR/)).toBeTruthy();

      cleanup();
      window.localStorage.setItem(
        "louder-preferences",
        JSON.stringify({ voiceURI: "en", filter: "all" }),
      );
      render(<App />);
      expect(screen.getByText(/EN — en-US/)).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
