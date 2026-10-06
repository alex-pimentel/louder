# Louder — remodel editor + shadcn React (design)

Data: 2026-10-06. Status: aprovada pelo usuário em 2026-10-06 (4 seções).

## 1. Contexto

O Louder é um leitor de PDF/TXT/MD/HTML/URL em voz alta, 100% client-side.
Hoje a UI é DOM vanilla (`src/main.ts`, 582 linhas) com visual de página web
(hero, container centralizado, grade de cards). O pedido: cara de aplicação
editor/IDE — área ampla de conteúdo à esquerda, painel estreito de controles
à direita (~25%), usando componentes prontos do sistema shadcn
(`@agenteresolve/ui`) e tema dark preto grafite (sem roxo).

Contexto de design canônico: `louder/.better-web-ui.md` (usuário: estudo e
trabalho; personalidade: técnico e direto; toggle claro/escuro começando no
claro).

## 2. Arquitetura

- Migração total da camada de apresentação vanilla → React 19. Nenhuma
  lógica de domínio é reescrita: `src/lib/{pdf,segmentation,clean,article,
  speech,storage,preferences}.ts` são reaproveitados sem alteração de
  comportamento.
- Estrutura nova:
  - `src/app/App.tsx` — composição do shell + provedores de estado.
  - `src/app/hooks/` — `useSpeech` (engine, vozes, speak/pause/stop),
    `useReader` (chunks, índice, navegação, highlight), `usePreferences`
    (load/persist em localStorage).
  - `src/components/` — `TopBar`, `SourcePanel` (dropzone + URL + textarea +
    reader view), `ControlRail` (voz, ajustes, texto limpo), `TransportBar`.
  - `src/components/ui/` — apenas o que o `@agenteresolve/ui` não tem:
    `slider`, `select`, `checkbox` (+ `resizable`), no padrão shadcn oficial
    (Radix + class-variance-authority + tailwind-merge).
  - Entry: `src/main.tsx` monta `<App/>` em `#root`; `index.html` vira
    casca mínima. O `src/main.ts` vanilla é removido ao final da migração
    (não mantido em paralelo).
- Efeitos colaterais (voiceschanged, online/offline, atalhos de teclado,
  intervalo anti-pausa do Chrome, service worker) migram para `useEffect`
  com cleanup, preservando semântica atual.

## 3. Componentes (shadcn)

- Do `@agenteresolve/ui`, sem duplicar: `Button`, `Input`, `Textarea`,
  `Label`, `Separator`, `Sheet` (rail vira drawer no mobile), `Tooltip`,
  `Badge` (pílula de engine, offline), `Skeleton` (loading da página).
- Novos locais (`src/components/ui/`): `slider`, `select`, `checkbox`,
  `resizable` — código no padrão shadcn/new-york adaptado ao Tailwind v4.
- Dependências novas (produção): `@radix-ui/react-slider`,
  `@radix-ui/react-select`, `@radix-ui/react-checkbox`,
  `react-resizable-panels`, `class-variance-authority`, `clsx`,
  `tailwind-merge`.
- Tema: dark grafite do ui (`--background: oklch(0.16 0.006 265)`) como base;
  modo light via overrides `[data-theme="light"]` das mesmas vars. O roxo
  próprio do Louder (`--brand: #6c5ce7`, hero, blob) é removido. Toggle
  mantido, padrão claro (preferência persistida como hoje).

## 4. Layout editor

- Shell `h-dvh` flex coluna: `TopBar` (52px: logo, arquivo/URL atual, status
  da leitura, offline badge, toggle tema) → corpo flex: `SourcePanel`
  (flex-1, min-w-0) + `ResizablePanel` rail (default 300px, min 240, max 420)
  → `TransportBar` fixa no rodapé da área de conteúdo (play/pause/stop/
  anterior/próximo + progresso + posição trecho x/y).
- `SourcePanel`: dropzone compacta + linha URL + textarea (cresce com a
  viewport) + reader view com highlight por chunk (scroll suave preservado).
- `ControlRail`: seções Voz (filtro + select + amostra), Ajustes (3 sliders),
  Leitura (checkbox texto limpo + nota do proxy), separadas por `Separator`,
  sem cards aninhados.
- Responsivo: `< ~900px` o rail sai do layout e vira `Sheet` lateral aberta
  por botão na TopBar; transporte continua visível. Nenhuma função é
  amputada no mobile.
- Acessibilidade: labels reais, `aria-label` no transporte, foco visível,
  `prefers-reduced-motion` respeitado no smooth scroll/highlight.

## 5. Estado e regras preservadas

- `MAX_TEXT_LENGTH`, truncamento com aviso, limpeza condicional
  (`prepareForSpeech`), chunking, fluxo URL direto→proxy com aviso de
  privacidade, atalhos (Espaço/Esc/setas, ignorados em inputs), preferências
  (inclui `cleanText`), toasts de status. Nenhuma regra muda — só o
  contêiner (hooks em vez de listeners manuais).

## 6. Testes e verificação

- TDD nos hooks novos (`tests/` + `@vitest-environment jsdom` onde houver
  DOM; lógica pura continua em node).
- e2e Playwright atualizado para a nova estrutura; `id`s legados
  (`dropzone`, `textInput`, `playBtn`…) preservados como `id` nos
  componentes React para churn mínimo.
- Portões: `vitest` 100% verde, `tsc --noEmit`, `eslint`, `prettier --check`,
  `vite build`, thresholds de cobertura sem redução, `playwright test`
  (com stub de voz existente).
- Rollout: branch `feat/louder-editor-shadcn`, PR, CI verde, merge, deploy
  Pages + smoke (200 + bundle novo). Sem backend, sem mudança de rota.

## 7. Fora do escopo

- Reescrever `pdf/clean/article/speech`; novas vozes ou idiomas; mudança
  nas regras de chunking; modo offline além do atual; PWA install;
  migração dos outros apps para o mesmo shell.
