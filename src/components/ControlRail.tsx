import { Button, Label, Separator } from "@agenteresolve/ui";

import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import type { SpeechSynthesisVoiceLike } from "../lib/speech";

export interface ControlRailProps {
  hasVoices: boolean;
  filter: string;
  onFilterChange: (value: string) => void;
  voiceChoices: SpeechSynthesisVoiceLike[];
  voiceURI: string;
  onVoiceChange: (value: string) => void;
  voiceCount: string;
  onPreview: () => void;
  synthSupported: boolean;
  rate: number;
  pitch: number;
  volume: number;
  onRateChange: (value: number) => void;
  onPitchChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  cleanChecked: boolean;
  onCleanChange: (checked: boolean) => void;
}

export function formatRate(value: number): string {
  return Number(value).toFixed(2).replace(/0$/, "");
}

function SliderRow({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-row">
      <Label htmlFor={id}>
        {label} <span id={`${id}Val`}>{display}</span>
        {id === "rate" ? "x" : null}
      </Label>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(values) => {
          const next = values[0];
          if (typeof next === "number") {
            onChange(next);
          }
        }}
      />
    </div>
  );
}

export function ControlRail({
  hasVoices,
  filter,
  onFilterChange,
  voiceChoices,
  voiceURI,
  onVoiceChange,
  voiceCount,
  onPreview,
  synthSupported,
  rate,
  pitch,
  volume,
  onRateChange,
  onPitchChange,
  onVolumeChange,
  cleanChecked,
  onCleanChange,
}: ControlRailProps) {
  return (
    <div className="control-rail">
      <section aria-label="Voz">
        <h3 className="rail-heading">🎙 Voz</h3>
        {!synthSupported || !hasVoices ? (
          <div id="voiceWarning" className="warn">
            <strong>⚠ Nenhuma voz encontrada neste navegador.</strong> O Louder usa as vozes
            instaladas no seu sistema operacional (Web Speech API). Se a lista estiver vazia,
            instale/ative vozes no sistema e reabra o navegador.
          </div>
        ) : null}

        <Label htmlFor="voiceFilter">Filtrar idioma</Label>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger id="voiceFilter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (recomendado)</SelectItem>
            <SelectItem value="all">Todos os idiomas</SelectItem>
            <SelectItem value="en">Inglês</SelectItem>
            <SelectItem value="es">Espanhol</SelectItem>
          </SelectContent>
        </Select>

        <Label htmlFor="voiceSelect">
          Escolher voz{" "}
          <span id="voiceCount" className="muted small">
            {voiceCount}
          </span>
        </Label>
        <Select value={voiceURI} onValueChange={onVoiceChange} disabled={!hasVoices}>
          <SelectTrigger id="voiceSelect">
            <SelectValue placeholder="Nenhuma voz disponível" />
          </SelectTrigger>
          <SelectContent>
            {voiceChoices.map((voice) => (
              <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                {`${voice.name} — ${voice.lang}${voice.default ? " · padrão" : ""}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          id="previewBtn"
          variant="ghost"
          size="sm"
          disabled={!synthSupported || !hasVoices}
          onClick={onPreview}
        >
          ▶ Ouvir amostra da voz
        </Button>
      </section>

      <Separator />

      <section aria-label="Ajustes">
        <h3 className="rail-heading">🎚 Ajustes</h3>
        <div className="sliders">
          <SliderRow
            id="rate"
            label="Velocidade"
            display={formatRate(rate)}
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={onRateChange}
          />
          <SliderRow
            id="pitch"
            label="Tom"
            display={formatRate(pitch)}
            min={0.5}
            max={2}
            step={0.05}
            value={pitch}
            onChange={onPitchChange}
          />
          <SliderRow
            id="volume"
            label="Volume"
            display={String(Math.round(volume * 100))}
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={onVolumeChange}
          />
        </div>
      </section>

      <Separator />

      <section aria-label="Leitura">
        <h3 className="rail-heading">🧹 Leitura</h3>
        <label className="check" htmlFor="cleanToggle">
          <Checkbox
            id="cleanToggle"
            checked={cleanChecked}
            onCheckedChange={(checked) => onCleanChange(checked === true)}
          />
          🧹 Ler texto limpo
        </label>
        <p className="muted small">
          Remove formatação de Markdown, HTML e PDF antes de ler. Vale para texto colado, arquivos e
          páginas.
        </p>
      </section>
    </div>
  );
}
