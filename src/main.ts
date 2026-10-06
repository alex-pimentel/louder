import "./style.css";
import * as React from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./shell/shell";
import { MAX_PDF_BYTES, extractPdfText } from "./lib/pdf";
import { chunkText } from "./lib/segmentation";
import { cleanTextForSpeech } from "./lib/clean";
import { ArticleError, fetchArticleText, isHttpUrl } from "./lib/article";
import {
  createSpeechEngine,
  filterVoices,
  getBrowserSynthesis,
  pickDefaultVoice,
  sortVoices,
  type SpeechEngine,
  type SpeechSynthesisVoiceLike,
} from "./lib/speech";
import { loadPreferences, savePreferences, type Preferences } from "./lib/storage";

const MAX_TEXT_LENGTH = 200_000;

const SAMPLE_TEXT = `Bem-vindo ao Louder!\n\nArraste um PDF ou arquivo de texto para cá, escolha uma voz em português e aperte o play.\n\nTudo roda 100% no seu navegador. Nenhum arquivo sai do seu dispositivo.\n\nVocê pode ajustar a velocidade, o tom e o volume, pausar com a tecla espaço e navegar entre trechos com as setas do teclado.`;

const SAMPLE_UTTERANCE = "Olá! Eu sou a voz do Louder. Assim vou ler seus textos.";

function $(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento #${id} não encontrado.`);
  }
  return element;
}

const dropzone = $("dropzone");
const fileInput = $("fileInput") as HTMLInputElement;
const fileName = $("fileName");
const pdfProgress = $("pdfProgress");
const textInput = $("textInput") as HTMLTextAreaElement;
const charCount = $("charCount");
const sampleBtn = $("sampleBtn") as HTMLButtonElement;
const clearBtn = $("clearBtn") as HTMLButtonElement;
const editBtn = $("editBtn") as HTMLButtonElement;
const urlInput = $("urlInput") as HTMLInputElement;
const urlBtn = $("urlBtn") as HTMLButtonElement;
const urlProgress = $("urlProgress");
const cleanToggle = $("cleanToggle") as HTMLInputElement;
const readerView = $("readerView");
const readerText = $("readerText");
const voiceFilter = $("voiceFilter") as HTMLSelectElement;
const voiceSelect = $("voiceSelect") as HTMLSelectElement;
const voiceCount = $("voiceCount");
const previewBtn = $("previewBtn") as HTMLButtonElement;
const voiceWarning = $("voiceWarning");
const enginePill = $("enginePill");
const rate = $("rate") as HTMLInputElement;
const pitch = $("pitch") as HTMLInputElement;
const volume = $("volume") as HTMLInputElement;
const rateVal = $("rateVal");
const pitchVal = $("pitchVal");
const volumeVal = $("volumeVal");
const prevBtn = $("prevBtn") as HTMLButtonElement;
const playBtn = $("playBtn") as HTMLButtonElement;
const stopBtn = $("stopBtn") as HTMLButtonElement;
const nextBtn = $("nextBtn") as HTMLButtonElement;
const statusLabel = $("statusLabel");
const progressBar = $("progressBar");
const progressLabel = $("progressLabel");
const themeBtn = $("themeBtn");
const offlineBadge = $("offlineBadge");
const toast = $("toast");

let announceTimer = 0;

const synth = getBrowserSynthesis();
const engine: SpeechEngine | null = synth ? createSpeechEngine({ synth }) : null;

let preferences: Preferences = loadPreferences();
let allVoices: SpeechSynthesisVoiceLike[] = [];
let chunks: string[] = [];
let chunkIndex = 0;
let speaking = false;
let paused = false;

applyTheme(preferences.theme);
voiceFilter.value = preferences.filter;
rate.value = String(preferences.rate);
pitch.value = String(preferences.pitch);
volume.value = String(preferences.volume);
cleanToggle.checked = preferences.cleanText;
syncSliderLabels();

if (!synth) {
  announce("Este navegador não suporta leitura em voz alta. Use Chrome, Edge ou Safari.");
  voiceWarning.hidden = false;
  playBtn.disabled = true;
  previewBtn.disabled = true;
  enginePill.textContent = "sem voz";
}

function announce(message: string): void {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function persist(): void {
  savePreferences(preferences);
}

function currentFilter(): string {
  return voiceFilter.value;
}

function selectedVoice(): SpeechSynthesisVoiceLike | null {
  return allVoices.find((voice) => voice.voiceURI === voiceSelect.value) ?? null;
}

function currentSpeakOptions() {
  return {
    voice: selectedVoice(),
    rate: Number(rate.value),
    pitch: Number(pitch.value),
    volume: Number(volume.value),
  };
}

function refreshVoices(): void {
  if (!engine) {
    renderVoiceOptions();
    return;
  }
  allVoices = sortVoices(engine.getVoices());
  renderVoiceOptions();
}

function renderVoiceOptions(): void {
  const filter = currentFilter();
  const list = filterVoices(allVoices, filter);
  voiceSelect.innerHTML = "";

  if (!list.length) {
    const option = document.createElement("option");
    option.textContent = "Nenhuma voz disponível";
    voiceSelect.appendChild(option);
    voiceSelect.disabled = true;
    voiceCount.textContent = "";
  } else {
    voiceSelect.disabled = false;
    for (const voice of list) {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} — ${voice.lang}${voice.default ? " · padrão" : ""}`;
      voiceSelect.appendChild(option);
    }
    const chosen = pickDefaultVoice(allVoices, filter, preferences.voiceURI);
    if (chosen) {
      voiceSelect.value = chosen.voiceURI;
    }
    voiceCount.textContent = `(${list.length} disponível${list.length > 1 ? "is" : ""})`;
  }

  const hasVoices = allVoices.length > 0;
  voiceWarning.hidden = hasVoices;
  enginePill.textContent = hasVoices ? `${allVoices.length} vozes` : "sem voz";
  playBtn.disabled = !hasVoices;
  previewBtn.disabled = !hasVoices;
}

if (synth && "onvoiceschanged" in synth) {
  synth.onvoiceschanged = () => {
    refreshVoices();
  };
}
refreshVoices();

voiceFilter.addEventListener("change", () => {
  preferences.filter = currentFilter();
  persist();
  renderVoiceOptions();
});

voiceSelect.addEventListener("change", () => {
  preferences.voiceURI = voiceSelect.value || null;
  persist();
});

previewBtn.addEventListener("click", () => {
  if (!engine) {
    return;
  }
  stopReading();
  statusLabel.textContent = "Ouvindo amostra…";
  engine.speak(SAMPLE_UTTERANCE, currentSpeakOptions(), {
    onEnd: () => {
      statusLabel.textContent = "Pronto para ler.";
    },
    onError: (message) => announce(message),
  });
});

function syncSliderLabels(): void {
  rateVal.textContent = Number(rate.value).toFixed(2).replace(/0$/, "");
  pitchVal.textContent = Number(pitch.value).toFixed(2).replace(/0$/, "");
  volumeVal.textContent = String(Math.round(Number(volume.value) * 100));
}

for (const slider of [rate, pitch, volume]) {
  slider.addEventListener("input", () => {
    syncSliderLabels();
    const values = { rate: rate.value, pitch: pitch.value, volume: volume.value };
    preferences = {
      ...preferences,
      rate: Number(values.rate),
      pitch: Number(values.pitch),
      volume: Number(values.volume),
    };
    persist();
  });
}

function updateCharCount(): void {
  const length = textInput.value.length;
  charCount.textContent = `${length.toLocaleString("pt-BR")} caracteres`;
  charCount.style.color = length >= MAX_TEXT_LENGTH ? "#e8590c" : "";
}

function setText(value: string, label?: string): void {
  stopReading();
  let text = value;
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
    announce(`Texto limitado a ${MAX_TEXT_LENGTH.toLocaleString("pt-BR")} caracteres.`);
  }
  textInput.value = text;
  updateCharCount();
  if (label !== undefined) {
    fileName.textContent = label;
  }
}

textInput.addEventListener("input", () => {
  if (textInput.value.length > MAX_TEXT_LENGTH) {
    textInput.value = textInput.value.slice(0, MAX_TEXT_LENGTH);
    announce(`Texto limitado a ${MAX_TEXT_LENGTH.toLocaleString("pt-BR")} caracteres.`);
  }
  updateCharCount();
  stopReading();
});

sampleBtn.addEventListener("click", () => {
  setText(SAMPLE_TEXT);
  announce("Texto de exemplo carregado. Aperte ▶ para ouvir.");
});

clearBtn.addEventListener("click", () => {
  setText("", "");
});

cleanToggle.addEventListener("change", () => {
  preferences.cleanText = cleanToggle.checked;
  persist();
  stopReading();
  if (textInput.value.trim()) {
    renderReader(textInput.value);
  }
});

urlBtn.addEventListener("click", () => {
  void handleUrl();
});

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void handleUrl();
  }
});

async function handleUrl(): Promise<void> {
  const raw = urlInput.value.trim();
  if (!isHttpUrl(raw)) {
    announce("URL inválida. Use um endereço http(s) completo, ex.: https://exemplo.com/pagina");
    return;
  }
  stopReading();
  urlBtn.disabled = true;
  urlProgress.hidden = false;
  urlProgress.textContent = "Buscando página…";
  try {
    const article = await fetchArticleText(raw);
    const host = new URL(raw).hostname;
    setText(article.text, `🌐 ${article.title} — ${host}`);
    renderReader(textInput.value);
    if (article.via === "reader-proxy") {
      announce(
        "Página carregada via proxy de leitura (o site bloqueou o acesso direto; " +
          "nesse modo o conteúdo passa por um serviço de terceiros). Aperte ▶ para ouvir.",
      );
    } else {
      announce("Página carregada. Aperte ▶ para ouvir.");
    }
  } catch (error) {
    const message = error instanceof ArticleError ? error.message : (error as Error).message;
    announce(`Não foi possível ler a página: ${message}`);
  } finally {
    urlBtn.disabled = false;
    urlProgress.hidden = true;
  }
}

editBtn.addEventListener("click", () => {
  readerView.hidden = true;
  textInput.style.display = "";
});

dropzone.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName !== "BUTTON" && target.tagName !== "LABEL") {
    fileInput.click();
  }
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

for (const eventName of ["dragover", "dragenter"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
}

dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    void handleFile(file);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) {
    void handleFile(file);
  }
  fileInput.value = "";
});

async function handleFile(file: File): Promise<void> {
  stopReading();
  const sizeKb = (file.size / 1024).toFixed(1);
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      if (file.size > MAX_PDF_BYTES) {
        announce(`PDF maior que ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`);
        return;
      }
      pdfProgress.hidden = false;
      const text = await extractPdfText(file, {
        onProgress: ({ page, total }) => {
          pdfProgress.textContent = `Extraindo página ${page}/${total}…`;
        },
      });
      pdfProgress.hidden = true;
      setText(text, `📎 ${file.name} (${sizeKb} KB)`);
      renderReader(text);
    } else {
      const text = await file.text();
      setText(text.replace(/\r\n/g, "\n"), `📎 ${file.name} (${sizeKb} KB)`);
      renderReader(text);
    }
    announce("Arquivo carregado. Aperte ▶ para ouvir.");
  } catch (error) {
    pdfProgress.hidden = true;
    announce(`Não foi possível ler o arquivo: ${(error as Error).message}`);
  }
}

playBtn.addEventListener("click", toggle);
stopBtn.addEventListener("click", stopReading);
prevBtn.addEventListener("click", () => jump(-1));
nextBtn.addEventListener("click", () => jump(1));

document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement;
  const isTextArea = target.tagName === "TEXTAREA" || target.tagName === "SELECT";
  const isTextInput = target instanceof HTMLInputElement && target.type !== "range";
  if ((isTextArea || isTextInput) && event.key !== "Escape") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    toggle();
  } else if (event.key === "Escape") {
    stopReading();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    jump(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    jump(-1);
  }
});

function prepareForSpeech(text: string): string {
  return preferences.cleanText ? cleanTextForSpeech(text) : text;
}

function toggle(): void {
  if (speaking && !paused) {
    pauseReading();
    return;
  }
  if (paused) {
    resumeReading();
    return;
  }
  startReading();
}

function startReading(): void {
  const text = textInput.value.trim();
  if (!text) {
    announce("Cole um texto ou abra um arquivo primeiro.");
    return;
  }
  if (!engine) {
    announce("Este navegador não suporta leitura em voz alta.");
    return;
  }

  chunks = chunkText(prepareForSpeech(text));
  if (!chunks.length) {
    return;
  }
  chunkIndex = 0;
  speaking = true;
  paused = false;
  buildReaderView();
  speakCurrentChunk();
}

function speakCurrentChunk(): void {
  if (!engine) {
    return;
  }
  if (chunkIndex >= chunks.length) {
    finishReading();
    return;
  }
  updateTransport();
  updateProgress();
  highlight();
  engine.speak(chunks[chunkIndex], currentSpeakOptions(), {
    onEnd: () => {
      if (!speaking || paused) {
        return;
      }
      chunkIndex += 1;
      speakCurrentChunk();
    },
    onError: (message) => announce(message),
  });
}

function pauseReading(): void {
  engine?.pause();
  paused = true;
  updateTransport();
  updateProgress();
  statusLabel.textContent = "Pausado.";
}

function resumeReading(): void {
  engine?.resume();
  paused = false;
  updateTransport();
  updateProgress();
}

function stopReading(): void {
  engine?.cancel();
  speaking = false;
  paused = false;
  chunkIndex = 0;
  updateTransport();
  updateProgress(true);
  highlight();
  statusLabel.textContent = "Pronto para ler.";
}

function jump(delta: number): void {
  if (!chunks.length) {
    return;
  }
  chunkIndex = Math.min(chunks.length - 1, Math.max(0, chunkIndex + delta));
  if (speaking) {
    speakCurrentChunk();
  } else {
    updateProgress();
    highlight();
  }
}

function finishReading(): void {
  speaking = false;
  paused = false;
  updateTransport();
  updateProgress();
  highlight();
  statusLabel.textContent = "✅ Leitura concluída.";
  announce("Leitura concluída.");
}

function updateTransport(): void {
  const active = speaking && !paused;
  playBtn.textContent = active ? "⏸" : "▶";
  playBtn.classList.toggle("playing", active);
  playBtn.title = active ? "Pausar (Espaço)" : "Ler (Espaço)";
  playBtn.setAttribute("aria-label", active ? "Pausar" : "Ler");
}

function updateProgress(reset = false): void {
  const total = chunks.length;
  const completed = speaking && chunkIndex >= total;
  const percent = reset || !total ? 0 : Math.round((chunkIndex / total) * 100);
  const shown = completed ? 100 : percent;
  progressBar.style.width = `${shown}%`;
  progressLabel.textContent = `${shown}%`;
  if (speaking && total && !completed) {
    statusLabel.textContent = `Lendo trecho ${Math.min(chunkIndex + 1, total)}/${total}…`;
  }
}

function buildReaderView(): void {
  readerText.innerHTML = "";
  chunks.forEach((chunk, index) => {
    const span = document.createElement("span");
    span.textContent = `${chunk} `;
    span.dataset.index = String(index);
    readerText.appendChild(span);
  });
  readerView.hidden = false;
  textInput.style.display = "none";
}

function renderReader(text: string): void {
  chunks = chunkText(prepareForSpeech(text));
  chunkIndex = 0;
  buildReaderView();
  highlight();
}

function highlight(): void {
  for (const element of Array.from(readerText.children)) {
    const index = Number((element as HTMLElement).dataset.index);
    element.className =
      index < chunkIndex ? "done" : index === chunkIndex && speaking ? "active" : "";
  }
  const active = readerText.querySelector(".active");
  active?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function applyTheme(theme: "light" | "dark"): void {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeBtn.addEventListener("click", () => {
  preferences.theme = preferences.theme === "dark" ? "light" : "dark";
  applyTheme(preferences.theme);
  persist();
});

function updateOnlineStatus(): void {
  const online = navigator.onLine;
  offlineBadge.textContent = online ? "● online" : "● offline — voz continua funcionando";
  offlineBadge.className = `badge ${online ? "online" : "offline"}`;
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();
updateTransport();

window.setInterval(() => {
  if (speaking && !paused && synth?.paused) {
    synth.resume();
  }
}, 5000);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

function mountShell(): void {
  const root = document.getElementById("app");
  const content = document.getElementById("app-content");
  if (!root || !content) {
    return;
  }
  content.remove();
  root.replaceChildren();
  createRoot(root).render(createElement(Shell, null, createElement(DomContent, { node: content })));
}

interface DomContentProps {
  node: HTMLElement;
}

function DomContent({ node }: DomContentProps) {
  const host = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = host.current;
    if (element && !element.contains(node)) {
      element.appendChild(node);
    }
  }, [node]);

  return createElement("div", { ref: host });
}

mountShell();
