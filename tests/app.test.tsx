// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
