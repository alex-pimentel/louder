import * as React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { Sheet, SheetContent, SheetTitle } from "@agenteresolve/ui";

import { usePreferences } from "./hooks/usePreferences";
import { useReader } from "./hooks/useReader";
import { useSpeech } from "./hooks/useSpeech";
import { ControlRail } from "../components/ControlRail";
import { SourcePanel } from "../components/SourcePanel";
import { TopBar } from "../components/TopBar";
import { TransportBar } from "../components/TransportBar";
import { ArticleError, fetchArticleText, isHttpUrl } from "../lib/article";
import { MAX_PDF_BYTES, extractPdfText } from "../lib/pdf";
import {
  createSpeechEngine,
  filterVoices,
  getBrowserSynthesis,
  resolveVoiceURI,
  sortVoices,
  type SpeakOptions,
  type SpeechEngine,
} from "../lib/speech";

const MAX_TEXT_LENGTH = 200_000;

const SAMPLE_TEXT = `Bem-vindo ao Louder!\n\nArraste um PDF ou arquivo de texto para cá, escolha uma voz em português e aperte o play.\n\nTudo roda 100% no seu navegador. Nenhum arquivo sai do seu dispositivo.\n\nVocê pode ajustar a velocidade, o tom e o volume, pausar com a tecla espaço e navegar entre trechos com as setas do teclado.`;

const SAMPLE_UTTERANCE = "Olá! Eu sou a voz do Louder. Assim vou ler seus textos.";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", listener);
    return () => list.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

export function App() {
  const [preferences, updatePreferences] = usePreferences();
  const reader = useReader();

  const synth = React.useMemo(() => getBrowserSynthesis(), []);
  const [engine] = React.useState<SpeechEngine | null>(() =>
    synth ? createSpeechEngine({ synth }) : null,
  );
  const speech = useSpeech(engine, synth as unknown as SpeechSynthesis | null);

  const [text, setTextState] = React.useState("");
  const [reading, setReading] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [fileLabel, setFileLabel] = React.useState("");
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [pdfStatus, setPdfStatus] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [urlBusy, setUrlBusy] = React.useState(false);
  const [urlStatus, setUrlStatus] = React.useState("");
  const [toast, setToast] = React.useState<{ id: number; message: string } | null>(null);
  const [online, setOnline] = React.useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [railOpen, setRailOpen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 900px)");

  const speakingRef = React.useRef(false);
  const pausedRef = React.useRef(false);
  const spokenRef = React.useRef(-1);
  const toastTimer = React.useRef(0);
  const optsRef = React.useRef<SpeakOptions>({ voice: null, rate: 1, pitch: 1, volume: 1 });

  const announce = React.useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const allVoices = React.useMemo(() => sortVoices(speech.voices), [speech.voices]);
  const voiceChoices = React.useMemo(
    () => filterVoices(allVoices, preferences.filter),
    [allVoices, preferences.filter],
  );
  const voiceURI = resolveVoiceURI(allVoices, preferences.filter, preferences.voiceURI);
  const selectedVoice = allVoices.find((voice) => voice.voiceURI === voiceURI) ?? null;
  const hasVoices = allVoices.length > 0;

  optsRef.current = {
    voice: selectedVoice,
    rate: preferences.rate,
    pitch: preferences.pitch,
    volume: preferences.volume,
  };

  const stopReading = React.useCallback(() => {
    engine?.cancel();
    speakingRef.current = false;
    pausedRef.current = false;
    spokenRef.current = -1;
    setSpeaking(false);
    setPaused(false);
  }, [engine]);

  const finishReading = React.useCallback(() => {
    speakingRef.current = false;
    pausedRef.current = false;
    spokenRef.current = -1;
    setSpeaking(false);
    setPaused(false);
    announce("Leitura concluída.");
  }, [announce]);

  const startReading = React.useCallback(() => {
    const value = text.trim();
    if (!value) {
      announce("Cole um texto ou abra um arquivo primeiro.");
      return;
    }
    if (!engine) {
      announce("Este navegador não suporta leitura em voz alta.");
      return;
    }
    reader.load(value, preferences.cleanText);
    spokenRef.current = -1;
    speakingRef.current = true;
    pausedRef.current = false;
    setSpeaking(true);
    setPaused(false);
    setReading(true);
  }, [announce, engine, preferences.cleanText, reader, text]);

  const pauseReading = React.useCallback(() => {
    engine?.pause();
    pausedRef.current = true;
    setPaused(true);
  }, [engine]);

  const resumeReading = React.useCallback(() => {
    engine?.resume();
    pausedRef.current = false;
    setPaused(false);
  }, [engine]);

  const toggle = React.useCallback(() => {
    if (speakingRef.current && !pausedRef.current) {
      pauseReading();
      return;
    }
    if (pausedRef.current) {
      resumeReading();
      return;
    }
    startReading();
  }, [pauseReading, resumeReading, startReading]);

  const jump = React.useCallback(
    (delta: number) => {
      if (!reader.chunks.length) {
        return;
      }
      reader.jump(delta);
    },
    [reader],
  );

  React.useEffect(() => {
    if (!speaking || paused || !engine) {
      return;
    }
    if (reader.index >= reader.chunks.length) {
      finishReading();
      return;
    }
    if (spokenRef.current === reader.index) {
      return;
    }
    spokenRef.current = reader.index;
    const index = reader.index;
    const total = reader.chunks.length;
    engine.speak(reader.chunks[index] ?? "", optsRef.current, {
      onEnd: () => {
        if (!speakingRef.current || pausedRef.current) {
          return;
        }
        if (index + 1 >= total) {
          finishReading();
        } else {
          reader.goTo(index + 1);
        }
      },
      onError: (message) => announce(message),
    });
  }, [announce, engine, finishReading, paused, reader, speaking]);

  const applyLoadedText = React.useCallback(
    (value: string, label?: string) => {
      stopReading();
      let next = value;
      if (next.length > MAX_TEXT_LENGTH) {
        next = next.slice(0, MAX_TEXT_LENGTH);
        announce(`Texto limitado a ${MAX_TEXT_LENGTH.toLocaleString("pt-BR")} caracteres.`);
      }
      setTextState(next);
      reader.load(next, preferences.cleanText);
      setReading(true);
      if (label !== undefined) {
        setFileLabel(label);
      }
    },
    [announce, preferences.cleanText, reader, stopReading],
  );

  const handleTextChange = React.useCallback(
    (value: string) => {
      let next = value;
      if (next.length > MAX_TEXT_LENGTH) {
        next = next.slice(0, MAX_TEXT_LENGTH);
        announce(`Texto limitado a ${MAX_TEXT_LENGTH.toLocaleString("pt-BR")} caracteres.`);
      }
      setTextState(next);
      stopReading();
    },
    [announce, stopReading],
  );

  const handleFile = React.useCallback(
    async (file: File) => {
      stopReading();
      const sizeKb = (file.size / 1024).toFixed(1);
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith(".pdf") || file.type === "application/pdf") {
          if (file.size > MAX_PDF_BYTES) {
            announce(`PDF maior que ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`);
            return;
          }
          setPdfBusy(true);
          const extracted = await extractPdfText(file, {
            onProgress: ({ page, total }) => {
              setPdfStatus(`Extraindo página ${page}/${total}…`);
            },
          });
          setPdfBusy(false);
          applyLoadedText(extracted, `📎 ${file.name} (${sizeKb} KB)`);
        } else {
          const content = await file.text();
          applyLoadedText(content.replace(/\r\n/g, "\n"), `📎 ${file.name} (${sizeKb} KB)`);
        }
        announce("Arquivo carregado. Aperte ▶ para ouvir.");
      } catch (error) {
        setPdfBusy(false);
        announce(`Não foi possível ler o arquivo: ${(error as Error).message}`);
      }
    },
    [announce, applyLoadedText, stopReading],
  );

  const handleUrl = React.useCallback(async () => {
    const raw = url.trim();
    if (!isHttpUrl(raw)) {
      announce("URL inválida. Use um endereço http(s) completo, ex.: https://exemplo.com/pagina");
      return;
    }
    stopReading();
    setUrlBusy(true);
    setUrlStatus("Buscando página…");
    try {
      const article = await fetchArticleText(raw);
      const host = new URL(raw).hostname;
      applyLoadedText(article.text, `🌐 ${article.title} — ${host}`);
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
      setUrlBusy(false);
      setUrlStatus("");
    }
  }, [announce, applyLoadedText, stopReading, url]);

  const previewVoice = React.useCallback(() => {
    if (!engine) {
      return;
    }
    stopReading();
    engine.speak(SAMPLE_UTTERANCE, optsRef.current, {
      onError: (message) => announce(message),
    });
  }, [announce, engine, stopReading]);

  React.useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme === "dark" ? "dark" : "light";
  }, [preferences.theme]);

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape" && document.querySelector('[data-state="open"]')) {
        return;
      }
      const isTextArea = target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      const isTextInput = target instanceof HTMLInputElement && target.type !== "range";
      const isWidget = Boolean(
        target.closest?.('[data-slot="slider"],[data-slot="select-trigger"]'),
      );
      if ((isTextArea || isTextInput || isWidget) && event.key !== "Escape") {
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [jump, stopReading, toggle]);

  React.useEffect(() => {
    const synth = getBrowserSynthesis();
    const timer = window.setInterval(() => {
      if (speakingRef.current && !pausedRef.current && synth?.paused) {
        synth.resume();
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const total = reader.chunks.length;
  const status = !engine
    ? "Este navegador não suporta leitura em voz alta. Use Chrome, Edge ou Safari."
    : speaking && total && reader.index < total
      ? `Lendo trecho ${Math.min(reader.index + 1, total)}/${total}…`
      : speaking && total && reader.index >= total
        ? "Leitura concluída."
        : paused
          ? "Pausado."
          : "Pronto para ler.";
  const percent = !total ? 0 : Math.round((Math.min(reader.index, total) / total) * 100);
  const positionLabel = total ? `${Math.min(reader.index + 1, total)}/${total}` : "0/0";
  const charCount = `${text.length.toLocaleString("pt-BR")} caracteres`;
  const voiceCount = hasVoices
    ? `(${voiceChoices.length} ${voiceChoices.length > 1 ? "disponíveis" : "disponível"})`
    : "";

  const rail = (
    <ControlRail
      hasVoices={hasVoices}
      filter={preferences.filter}
      onFilterChange={(filter) => updatePreferences({ filter })}
      voiceChoices={voiceChoices}
      voiceURI={voiceURI}
      onVoiceChange={(voiceURI) => updatePreferences({ voiceURI: voiceURI || null })}
      voiceCount={voiceCount}
      onPreview={previewVoice}
      synthSupported={engine !== null}
      rate={preferences.rate}
      pitch={preferences.pitch}
      volume={preferences.volume}
      onRateChange={(rate) => updatePreferences({ rate })}
      onPitchChange={(pitch) => updatePreferences({ pitch })}
      onVolumeChange={(volume) => updatePreferences({ volume })}
      cleanChecked={preferences.cleanText}
      onCleanChange={(cleanText) => {
        updatePreferences({ cleanText });
        stopReading();
        if (text.trim()) {
          reader.load(text, cleanText);
          setReading(true);
        }
      }}
    />
  );

  return (
    <div className="app-shell">
      <TopBar
        sourceLabel={fileLabel}
        engineLabel={hasVoices ? `${allVoices.length} vozes` : "sem voz"}
        online={online}
        dark={preferences.theme === "dark"}
        showRailButton={isMobile}
        onToggleTheme={() =>
          updatePreferences({ theme: preferences.theme === "dark" ? "light" : "dark" })
        }
        onOpenRail={() => setRailOpen(true)}
      />
      <div className="app-body">
        {isMobile ? (
          <>
            <div className="source-col">
              <SourcePanel
                fileLabel={fileLabel}
                pdfBusy={pdfBusy}
                pdfStatus={pdfStatus}
                onFile={(file) => void handleFile(file)}
                url={url}
                onUrlChange={setUrl}
                onUrlGo={() => void handleUrl()}
                urlBusy={urlBusy}
                urlStatus={urlStatus}
                text={text}
                onTextChange={handleTextChange}
                charCount={charCount}
                charCountAlert={text.length >= MAX_TEXT_LENGTH}
                onSample={() => {
                  applyLoadedText(SAMPLE_TEXT);
                  announce("Texto de exemplo carregado. Aperte ▶ para ouvir.");
                }}
                onClear={() => {
                  stopReading();
                  setTextState("");
                  reader.reset();
                  setReading(false);
                  setFileLabel("");
                }}
                reading={reading}
                chunks={reader.chunks}
                activeIndex={speaking ? reader.index : -1}
                onBackToText={() => setReading(false)}
              />
              <TransportBar
                speaking={speaking}
                paused={paused}
                canPlay={engine !== null && hasVoices}
                status={status}
                percent={speaking ? percent : 0}
                positionLabel={positionLabel}
                onToggle={toggle}
                onStop={stopReading}
                onPrev={() => jump(-1)}
                onNext={() => jump(1)}
              />
            </div>
            <Sheet open={railOpen} onOpenChange={setRailOpen}>
              <SheetContent side="right" className="rail-sheet">
                <SheetTitle>Controles</SheetTitle>
                {rail}
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <PanelGroup direction="horizontal" className="app-panels">
            <Panel defaultSize={75} minSize={50} className="source-col">
              <SourcePanel
                fileLabel={fileLabel}
                pdfBusy={pdfBusy}
                pdfStatus={pdfStatus}
                onFile={(file) => void handleFile(file)}
                url={url}
                onUrlChange={setUrl}
                onUrlGo={() => void handleUrl()}
                urlBusy={urlBusy}
                urlStatus={urlStatus}
                text={text}
                onTextChange={handleTextChange}
                charCount={charCount}
                charCountAlert={text.length >= MAX_TEXT_LENGTH}
                onSample={() => {
                  applyLoadedText(SAMPLE_TEXT);
                  announce("Texto de exemplo carregado. Aperte ▶ para ouvir.");
                }}
                onClear={() => {
                  stopReading();
                  setTextState("");
                  reader.reset();
                  setReading(false);
                  setFileLabel("");
                }}
                reading={reading}
                chunks={reader.chunks}
                activeIndex={speaking ? reader.index : -1}
                onBackToText={() => setReading(false)}
              />
              <TransportBar
                speaking={speaking}
                paused={paused}
                canPlay={engine !== null && hasVoices}
                status={status}
                percent={speaking ? percent : 0}
                positionLabel={positionLabel}
                onToggle={toggle}
                onStop={stopReading}
                onPrev={() => jump(-1)}
                onNext={() => jump(1)}
              />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={25} minSize={18} maxSize={38} className="rail-col">
              {rail}
            </Panel>
          </PanelGroup>
        )}
      </div>
      {toast ? (
        <div key={toast.id} className="toast show" role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
