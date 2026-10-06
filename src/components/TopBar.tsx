import { Badge, Button } from "@agenteresolve/ui";

export interface TopBarProps {
  sourceLabel: string;
  engineLabel: string;
  online: boolean;
  dark: boolean;
  showRailButton: boolean;
  onToggleTheme: () => void;
  onOpenRail: () => void;
}

export function TopBar({
  sourceLabel,
  engineLabel,
  online,
  dark,
  showRailButton,
  onToggleTheme,
  onOpenRail,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo" aria-hidden="true">
          🔊
        </span>
        <span className="topbar-title">Louder</span>
        {sourceLabel ? (
          <span className="topbar-source" title={sourceLabel}>
            {sourceLabel}
          </span>
        ) : null}
      </div>
      <div className="topbar-right">
        <Badge id="enginePill" variant="outline">
          {engineLabel}
        </Badge>
        <Badge
          id="offlineBadge"
          variant="outline"
          className={online ? "badge-online" : "badge-offline"}
        >
          {online ? "● online" : "● offline — voz continua funcionando"}
        </Badge>
        {showRailButton ? (
          <Button variant="outline" size="sm" onClick={onOpenRail}>
            ⚙ Controles
          </Button>
        ) : null}
        <Button
          id="themeBtn"
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          title="Alternar tema"
          aria-label="Alternar tema"
        >
          {dark ? "☀️" : "🌙"}
        </Button>
      </div>
    </header>
  );
}
