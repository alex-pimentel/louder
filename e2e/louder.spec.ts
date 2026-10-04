import { expect, test, type Page } from "@playwright/test";

const SPEECH_STUB = `
  window.__speakCalls = [];
  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.voice = null;
      this.lang = "";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.onend = null;
      this.onerror = null;
    }
  }
  window.SpeechSynthesisUtterance = FakeUtterance;
  const fakeVoices = [
    { name: "Voz Teste", lang: "pt-BR", voiceURI: "voz-teste", default: true },
  ];
  const synth = {
    paused: false,
    speaking: false,
    onvoiceschanged: null,
    getVoices: () => fakeVoices,
    speak: (utterance) => {
      window.__speakCalls.push(utterance.text);
    },
    cancel: () => {},
    pause: () => {},
    resume: () => {},
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    get: () => synth,
  });
`;

function countSpeakCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __speakCalls: string[] }).__speakCalls.length);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(SPEECH_STUB);
});

test("mostra a dropzone e fala o texto colado ao apertar play", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#dropzone")).toBeVisible();
  await expect(page.locator("#dropzone")).toHaveAttribute("role", "button");

  const text = "Olá, mundo. Esta é a primeira frase. E esta é a segunda frase.";
  await page.locator("#textInput").fill(text);

  const playBtn = page.locator("#playBtn");
  await expect(playBtn).toBeEnabled();
  await playBtn.click();

  await expect.poll(() => countSpeakCalls(page)).toBeGreaterThan(0);
});

test("renderiza o header e footer compartilhados do Agenteresolve", async ({ page }) => {
  await page.goto("/");

  const header = page.locator('header[data-slot="header"]');
  await expect(header).toBeVisible();
  await expect(header.getByText("Agenteresolve")).toBeVisible();

  const footer = page.locator('footer[data-slot="footer"]');
  await expect(footer).toBeVisible();
  await expect(footer.getByText("Todos os direitos reservados")).toBeVisible();

  await expect(page.getByRole("link", { name: /Institucional/ }).first()).toBeVisible();
  await expect(page.getByText("Carregando interface…")).toHaveCount(0);
});
