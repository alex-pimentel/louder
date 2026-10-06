import { Button } from "@agenteresolve/ui";
import { cn } from "@agenteresolve/ui";

export interface TransportBarProps {
  speaking: boolean;
  paused: boolean;
  canPlay: boolean;
  status: string;
  percent: number;
  positionLabel: string;
  onToggle: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function TransportBar({
  speaking,
  paused,
  canPlay,
  status,
  percent,
  positionLabel,
  onToggle,
  onStop,
  onPrev,
  onNext,
}: TransportBarProps) {
  const active = speaking && !paused;
  return (
    <div className="transport-bar">
      <div className="transport-buttons" role="group" aria-label="Controles de leitura">
        <Button
          id="prevBtn"
          variant="outline"
          size="icon"
          onClick={onPrev}
          title="Trecho anterior (←)"
          aria-label="Trecho anterior"
        >
          ⏮
        </Button>
        <Button
          id="playBtn"
          variant={active ? "secondary" : "default"}
          size="icon"
          className={cn("transport-play", active && "transport-playing")}
          disabled={!canPlay}
          onClick={onToggle}
          title={active ? "Pausar (Espaço)" : "Ler (Espaço)"}
          aria-label={active ? "Pausar" : "Ler"}
        >
          {active ? "⏸" : "▶"}
        </Button>
        <Button
          id="stopBtn"
          variant="outline"
          size="icon"
          onClick={onStop}
          title="Parar (Esc)"
          aria-label="Parar"
        >
          ⏹
        </Button>
        <Button
          id="nextBtn"
          variant="outline"
          size="icon"
          onClick={onNext}
          title="Próximo trecho (→)"
          aria-label="Próximo trecho"
        >
          ⏭
        </Button>
      </div>
      <div className="transport-progress">
        <div className="transport-progress-head">
          <span id="statusLabel" className="transport-status">
            {status}
          </span>
          <span id="progressLabel" className="transport-percent">
            {positionLabel} · {percent}%
          </span>
        </div>
        <div
          className="transport-track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div id="progressBar" className="transport-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
