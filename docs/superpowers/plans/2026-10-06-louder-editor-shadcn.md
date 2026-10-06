# Louder editor + shadcn React Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Louder's vanilla-DOM UI to a React 19 + shadcn editor layout (wide content left, resizable 300px control rail right, graphite-black dark theme) reusing all domain logic untouched, then ship to production.

**Architecture:** New React shell (`src/app/`, `src/components/`) over unchanged `src/lib/*`; missing shadcn primitives created locally in `src/components/ui/`; state moves from module globals to hooks with identical behavior.

**Tech Stack:** React 19, Tailwind v4, `@agenteresolve/ui` primitives, Radix (slider/select/checkbox), `react-resizable-panels`, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-louder-shadcn-design.md`

## Global Constraints

- `src/lib/*` behavior unchanged (pdf, segmentation, clean, article, speech, storage, preferences).
- Light/dark toggle kept, default light (persisted `theme`).
- Coverage thresholds never lowered (stmts 64 / branch 65 / funcs 75 / lines 63).
- e2e ids (`dropzone`, `textInput`, `playBtn`, …) preserved on the React equivalents.
- No new backend; static `dist/` deploy as today.
- TDD: failing test first for every new unit; full gates per task (`npm test`, `tsc --noEmit`, `eslint`, `vite build`).

## Review Focus

- No speechSynthesis in browser: transport disabled with explanatory note, nothing throws → pinned by Task 5 app tests.
- Voices arrive async: pt-BR default selected once loaded without resetting user choice → pinned by Task 4 hook tests.
- Old localStorage prefs without `cleanText`: toggle coerces ON, never crashes → already pinned by `tests/preferences.test.ts`.
- Proxy fallback toasts the third-party privacy notice once per URL load → pinned by Task 5 app tests (mocked `fetchArticleText`).
- Mobile rail drawer + `prefers-reduced-motion` honored in highlight scroll → pinned by Task 5 (media-query structure) and existing CSS behavior.

---
### Task 1: Checkpoint + dependencies

**Files:**
- Commit (existing worktree): `src/lib/clean.ts`, `src/lib/article.ts`, `src/lib/preferences.ts`, `src/main.ts`, `index.html`, `src/style.css`, `tests/*`, `package.json`, `package-lock.json`, `README.md`, `.better-web-ui.md`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: uncommitted feature work already in tree (clean + URL).
- Produces: committed base; new runtime deps available to later tasks.

- [ ] **Step 1: Commit pending feature work**

```bash
git add src/lib/clean.ts src/lib/article.ts src/lib/preferences.ts src/main.ts index.html src/style.css tests/clean.test.ts tests/article.test.ts tests/preferences.test.ts tests/shell.dom.test.tsx package.json package-lock.json README.md .better-web-ui.md
git commit -m "feat(louder): clean-text toggle + read pages via URL"
```
- [ ] **Step 2: Install shadcn runtime deps**

```bash
npm install @radix-ui/react-slider @radix-ui/react-select @radix-ui/react-checkbox react-resizable-panels class-variance-authority clsx tailwind-merge
```
Expected: `package.json` gains 7 deps, `npm run build` still passes.
- [ ] **Step 3: Verify gates on clean tree**

Run: `npm test` (expect 67 PASS), `npm run types`, `npm run lint`. Then commit deps:
```bash
git add package.json package-lock.json
git commit -m "chore(louder): shadcn runtime deps (radix slider/select/checkbox, resizable, cva)"
```

---
### Task 2: Theme graphite + Tailwind wiring

**Files:**
- Modify: `src/style.css`
- Test: none (visual tokens; verified by build + manual smoke in Task 6)

**Interfaces:**
- Consumes: ui lib tokens (`@agenteresolve/ui/styles.css` already imported).
- Produces: `[data-theme]`-driven shadcn vars consumed by all components.

- [ ] **Step 1: Replace louder palette with shadcn vars**

In `src/style.css`: delete `:root` purple brand block (`--brand: #6c5ce7`, hero `.hl`, `.bg-blob`); define shadcn vars for dark graphite default (map to ui lib values: `--background: oklch(0.16 0.006 265)` etc.) plus `[data-theme="light"]` overrides (white/zinc light equivalents). Keep `color-scheme` switching.
- [ ] **Step 2: Add Tailwind v4 `@theme inline` mappings**

Map `--color-background/foreground/card/border/primary/...` to the vars so ui primitives + new components resolve utilities. Keep it minimal (only tokens used).
- [ ] **Step 3: Build**

Run: `npm run build`. Expected: PASS (visual check deferred to Task 6).
- [ ] **Step 4: Commit**

```bash
git add src/style.css
git commit -m "style(louder): graphite shadcn theme, drop purple brand"
```

---
### Task 3: Local shadcn primitives (slider, select, checkbox)

**Files:**
- Create: `src/components/ui/slider.tsx`, `src/components/ui/select.tsx`, `src/components/ui/checkbox.tsx`, `src/lib/cn.ts` (re-export `cn` from ui lib or local clsx+twMerge)
- Test: `tests/ui.test.tsx` (`@vitest-environment jsdom`)

**Interfaces:**
- Consumes: Radix primitives, `cn`, theme vars from Task 2.
- Produces: `<Slider>`, `<Select>` (+ Item/Content/Trigger/Value), `<Checkbox>` with shadcn API used by Task 5.

- [ ] **Step 1: Write failing render tests**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../src/components/ui/checkbox";
import { Slider } from "../src/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/components/ui/select";

describe("ui primitives", () => {
  it("renders a slider with accessible role", () => {
    render(<Slider defaultValue={[50]} max={100} aria-label="Velocidade" />);
    expect(screen.getByRole("slider")).toBeTruthy();
  });
  it("renders a closed select with its trigger", () => {
    render(<Select><SelectTrigger aria-label="Voz"><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent><SelectItem value="a">A</SelectItem></SelectContent></Select>);
    expect(screen.getByLabelText("Voz")).toBeTruthy();
  });
  it("renders a checkbox with its label", () => {
    render(<div><Checkbox id="c" /><label htmlFor="c">Limpo</label></div>);
    expect(screen.getByLabelText("Limpo")).toBeTruthy();
  });
});
```
- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- tests/ui.test.tsx`. Expected: FAIL "Cannot find module".
- [ ] **Step 3: Implement the three primitives** (standard shadcn/new-york code adapted to project `cn`; no behavior inventions).
- [ ] **Step 4: Run to verify green**

Run: `npm test -- tests/ui.test.tsx` (expect 3 PASS), then `npm run types`, `npm run lint`.
- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/ui.test.tsx src/lib/cn.ts
git commit -m "feat(louder): local shadcn slider, select, checkbox"
```

---
### Task 4: State hooks (behavior parity)

**Files:**
- Create: `src/app/hooks/usePreferences.ts`, `src/app/hooks/useSpeech.ts`, `src/app/hooks/useReader.ts`
- Test: `tests/hooks.test.tsx` (`@vitest-environment jsdom`)

**Interfaces:**
- Consumes: `src/lib/*` (speech engine, chunkText, storage); `SpeechEngine` type.
- Produces: hook APIs consumed by Task 5:
  - `usePreferences(): [Preferences, (patch: Partial<Preferences>) => void]`
  - `useSpeech(engineDeps): { voices, status, speak(text), pause(), resume(), stop(), ... }`
  - `useReader(): { chunks, index, load(text), jump(delta), ... }`

- [ ] **Step 1: Write failing hook tests** (renderHook from `@testing-library/react`): preferences persist patch to localStorage; reader loads text into chunks and jumps clamp; speech with stubbed engine speaks chunk and advances onEnd; voices arriving async select the pt-BR default without overriding an explicit user choice.
- [ ] **Step 2: Run to verify they fail** (`npm test -- tests/hooks.test.tsx`, module missing).
- [ ] **Step 3: Implement hooks** by porting `main.ts` logic 1:1 (same MAX_TEXT_LENGTH rule, same chunk flow, same keyboard-shortcut set goes to App effect in Task 5, not here).
- [ ] **Step 4: Verify green + gates** (`npm test -- tests/hooks.test.tsx`, full `npm test`, types, lint).
- [ ] **Step 5: Commit**

```bash
git add src/app/hooks tests/hooks.test.tsx
git commit -m "feat(louder): reader state hooks with behavior parity"
```

---
### Task 5: Editor shell (App + panels + entry)

**Files:**
- Create: `src/app/App.tsx`, `src/components/TopBar.tsx`, `src/components/SourcePanel.tsx`, `src/components/ControlRail.tsx`, `src/components/TransportBar.tsx`, `src/main.tsx`
- Modify: `index.html` (minimal `#root` shell; keep `<div id="app">` mount point name)
- Delete: `src/main.ts` (only after App passes gates)
- Test: extend `e2e/louder.spec.ts` ids stay; add `tests/app.test.tsx` smoke (renders App, dropzone + play + rail present)

**Interfaces:**
- Consumes: hooks (Task 4), ui primitives (Task 3 + ui lib), lib (clean/article/pdf).
- Produces: working app; e2e selectors stable.

- [ ] **Step 1: Write failing App smoke test**

```tsx
// @vitest-environment jsdom
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
});

it("toasts the privacy notice when the page loads via reader proxy", async () => {
  vi.mock("../src/lib/article", () => ({
    isHttpUrl: () => true,
    ArticleError: class extends Error {},
    fetchArticleText: async () => ({ title: "T", text: "corpo", via: "reader-proxy" }),
  }));
  render(<App />);
  // fill #urlInput, click #urlBtn, expect toast mentioning third-party proxy
});
```
- [ ] **Step 2: Run to verify it fails** (App missing).
- [ ] **Step 3: Implement shell**: TopBar (logo, file/url label, status, theme, offline); SourcePanel (compact dropzone + URL row + textarea + reader view, ids preserved); ControlRail in ResizablePanel (default 300/min 240/max 420; Sheet drawer <900px); TransportBar (transport ids preserved + progress). Port all `main.ts` handlers incl. URL flow with proxy notice, toasts, shortcuts, SW registration. Honor `prefers-reduced-motion` in highlight scrolling.
- [ ] **Step 4: Verify green + gates** (app test, full suite, types, lint, build). Delete `src/main.ts`; rebuild.
- [ ] **Step 5: Commit**

```bash
git add src/app src/components src/main.tsx index.html e2e/louder.spec.ts tests/app.test.tsx
git commit -m "feat(louder): editor shell with shadcn rail, port vanilla app to React"
```
(Include `git rm src/main.ts` in same commit; update e2e selectors only where ids changed.)

---
### Task 6: E2E + release verification

**Files:**
- Modify: `e2e/louder.spec.ts` (only if selectors changed)

**Interfaces:**
- Consumes: built app from Task 5.

- [ ] **Step 1: Run Playwright e2e**

Run: `npm run test:e2e`. Expected: all PASS (speech stubbed as today).
- [ ] **Step 2: Full gates**

Run: `npm test`, `npm run test:coverage` (thresholds hold), `npm run types`, `npm run lint`, `npx prettier --check .`, `npm run build`.
- [ ] **Step 3: Commit e2e fixes if any**

```bash
git add e2e/louder.spec.ts
git commit -m "test(louder): e2e for editor shell"
```

---
### Task 7: PR + publish

**Files:** none (git/GitHub/Cloudflare ops).

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin feat/louder-editor-shadcn
```
(Note: branch contains a workflow-file commit from earlier `chore/ci-deploy-env` lineage — if push is rejected for `workflow` scope, push without that commit via `git rebase --onto main` or open the PR from a fresh branch; document whichever was used.)
Open PR `feat(louder): editor shadcn` with summary + verification evidence.
- [ ] **Step 2: Wait CI green, squash-merge, pull main**.
- [ ] **Step 3: Deploy Pages** (canonical procedure: `npm ci`, build with `VITE_*` from `.env.deploy`, `wrangler pages deploy ./dist --project-name=louder --branch main`) and smoke-test (200 + new bundle hash + toggle/URL present).
- [ ] **Step 4: Update `STATUS.md`** (louder editor live) and report.
