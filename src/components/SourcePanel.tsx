import * as React from "react";

import { Button, Input } from "@agenteresolve/ui";

export interface SourcePanelProps {
  fileLabel: string;
  pdfBusy: boolean;
  pdfStatus: string;
  onFile: (file: File) => void;
  url: string;
  onUrlChange: (value: string) => void;
  onUrlGo: () => void;
  urlBusy: boolean;
  urlStatus: string;
  text: string;
  onTextChange: (value: string) => void;
  charCount: string;
  charCountAlert: boolean;
  onSample: () => void;
  onClear: () => void;
  reading: boolean;
  chunks: string[];
  activeIndex: number;
  onBackToText: () => void;
}

export function SourcePanel({
  fileLabel,
  pdfBusy,
  pdfStatus,
  onFile,
  url,
  onUrlChange,
  onUrlGo,
  urlBusy,
  urlStatus,
  text,
  onTextChange,
  charCount,
  charCountAlert,
  onSample,
  onClear,
  reading,
  chunks,
  activeIndex,
  onBackToText,
}: SourcePanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const readerTextRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!reading) {
      return;
    }
    const active = readerTextRef.current?.querySelector<HTMLElement>("[data-active='true']");
    if (!active) {
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    active.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [reading, activeIndex, chunks]);

  const pickFile = (file: File | undefined | null) => {
    if (file) {
      onFile(file);
    }
  };

  return (
    <div className="source-panel">
      <div
        id="dropzone"
        role="button"
        tabIndex={0}
        aria-label="Enviar arquivo PDF ou texto"
        className={dragging ? "dropzone-compact dragover" : "dropzone-compact"}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.tagName !== "BUTTON" && target.tagName !== "LABEL") {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pickFile(event.dataTransfer?.files?.[0]);
        }}
      >
        <span aria-hidden="true">📥</span>
        <span>
          <strong>Arraste um PDF, TXT, MD ou HTML</strong> <span className="muted">ou</span>
        </span>
        <label className="dropzone-pick" htmlFor="fileInput">
          Escolher arquivo
        </label>
        <input
          id="fileInput"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,.text,.html,.htm,text/plain,text/html,application/pdf"
          hidden
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      <p id="fileName" className="file-name muted">
        {fileLabel}
      </p>
      <p id="pdfProgress" className="muted small" hidden={!pdfBusy}>
        {pdfStatus}
      </p>

      <div className="url-row">
        <Input
          id="urlInput"
          type="url"
          inputMode="url"
          placeholder="https://exemplo.com/pagina para ler a página…"
          aria-label="URL da página para leitura"
          value={url}
          disabled={urlBusy}
          onChange={(event) => onUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onUrlGo();
            }
          }}
        />
        <Button id="urlBtn" disabled={urlBusy} onClick={onUrlGo}>
          🌐 Ler página
        </Button>
      </div>
      <p id="urlProgress" className="muted small" hidden={!urlBusy}>
        {urlStatus}
      </p>

      <div className="row">
        <Button id="sampleBtn" variant="ghost" size="sm" onClick={onSample}>
          ✨ Usar texto de exemplo
        </Button>
        <Button id="clearBtn" variant="ghost" size="sm" onClick={onClear}>
          🗑 Limpar
        </Button>
      </div>

      {!reading ? (
        <>
          <label className="source-label" htmlFor="textInput">
            Texto para leitura{" "}
            <span
              id="charCount"
              className="muted small"
              style={charCountAlert ? { color: "#e8590c" } : undefined}
            >
              {charCount}
            </span>
          </label>
          <textarea
            id="textInput"
            className="source-textarea"
            placeholder="Cole seu texto aqui, ou abra um arquivo / URL acima…"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
          />
        </>
      ) : (
        <div id="readerView" className="reader-view-full">
          <div className="reader-head">
            <span className="muted small">Acompanhamento da leitura</span>
            <button id="editBtn" type="button" className="link-btn" onClick={onBackToText}>
              voltar ao texto
            </button>
          </div>
          <div id="readerText" ref={readerTextRef} className="reader-text">
            {chunks.map((chunk, index) => (
              <span
                key={index}
                data-index={index}
                data-active={index === activeIndex}
                className={
                  index < activeIndex ? "done" : index === activeIndex ? "active" : undefined
                }
              >
                {chunk}{" "}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
