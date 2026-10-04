# 🔊 Louder — leia PDF e texto em voz alta, 100% no navegador

[![CI](https://github.com/alex-pimentel/louder/actions/workflows/ci.yml/badge.svg)](https://github.com/alex-pimentel/louder/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/alex-pimentel/louder)](https://github.com/alex-pimentel/louder/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

O Louder extrai o texto de **PDF, TXT e MD** (ou de um texto colado) e o reproduz em voz alta
usando as vozes do seu próprio sistema. É uma aplicação **web-only**: não há Electron, Python,
backend nem qualquer processamento no servidor.

> **100% client-side.** Seus arquivos nunca saem do dispositivo. Não existe upload, não existe
> API, não existe banco de dados. A extração de PDF e a síntese de voz acontecem inteiramente no
> navegador.

## Recursos

- 📄 Arrastar-e-soltar **PDF / TXT / MD**, seletor de arquivos e texto colado
- 📑 Extração de PDF com **barra de progresso** (PDF.js, dentro do navegador)
- ✂️ Segmentação em trechos (parágrafos/frases) com navegação anterior/próximo
- 🎙 Leitura com `window.speechSynthesis`; **vozes do sistema**
- 🗣 Seletor de voz + filtro de idioma (**pt-BR priorizado**)
- 🎚 Velocidade, tom e volume
- ⏮ ▶ ⏹ ⏭ play/pause/parar/anterior/próximo
- 🖍 Destaque do trecho atual durante a leitura
- ⌨ Atalhos: `Espaço` ler/pausar · `Esc` parar · `←`/`→` navegar trechos
- 🌗 Tema claro/escuro · 📱 Responsivo
- 📴 **Offline após o primeiro acesso** (service worker)
- 🔒 Preferências (voz, velocidade, tom, volume, tema) salvas **apenas em `localStorage`**
- 🧩 Shell compartilhado da Agenteresolve (`@agenteresolve/ui`): header, footer e tokens do
  design system; login Clerk **opcional** (funciona sem chave)

## Como rodar

Requer Node.js 20+.

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
```

## Como buildar

```bash
npm run build      # typecheck + build estático em dist/
npm run preview    # serve o dist/ localmente
```

O build gera um site estático em `dist/` — sem runtime de servidor.

### Login Clerk (opcional)

O Louder funciona **sem login**. Se `VITE_CLERK_PUBLISHABLE_KEY` estiver definida no build, o
`UserButton` do Clerk aparece no header; sem a variável, o shell renderiza um botão neutro e o
leitor continua funcionando normalmente. Veja `.env.example`.

## Shell compartilhado (`@agenteresolve/ui`)

O app é envolvido pelo `ServiceShell` do pacote `@agenteresolve/ui` (git dependency
`github:alex-pimentel/agenteresolve-ui`), que fornece header/footer/tokens compartilhados com os
outros serviços. O `styles.css` do pacote é importado junto ao Tailwind v4. A aplicação segue
**100% client-side**: o pacote é buildado no `install` (script `prepare`) e nada em runtime
depende de backend.

## Deploy (Cloudflare Pages)

O `dist/` é compatível com Cloudflare Pages e qualquer host estático:

| Configuração     | Valor           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Build output dir | `dist`          |
| Node version     | 20 ou superior  |

Deploy direto com Wrangler:

```bash
npm run build
npx wrangler pages deploy dist --project-name=louder
```

## Qualidade

```bash
npm run lint          # ESLint
npm run types         # tsc --noEmit
npm test              # Vitest (segmentação, fala, preferências, shell)
npm run test:coverage # cobertura V8 com meta mínima
npm run test:e2e      # Playwright (precisa de browsers instalados)
npm run build         # typecheck + build estático
```

## Estrutura

```
index.html                 → shell da aplicação
src/main.ts                → controlador da UI (fonte, voz, transporte, atalhos)
src/shell/                 → integração com o ServiceShell do @agenteresolve/ui
src/style.css              → tema claro/escuro + tokens do design system
src/lib/segmentation.ts    → normalização e segmentação em trechos
src/lib/speech.ts          → wrapper testável da Web Speech API
src/lib/pdf.ts             → extração de PDF com PDF.js
src/lib/preferences.ts     → normalização pura das preferências
src/lib/storage.ts         → preferências em localStorage (única persistência)
src/lib/shell.ts           → resolução da chave Clerk (login opcional)
public/sw.js               → service worker (cache offline)
public/manifest.webmanifest→ metadados PWA
tests/                     → testes Vitest
e2e/                       → smoke test Playwright
```

## Privacidade e limites

- PDF até **25 MB**; texto colado até **200 000 caracteres**.
- Depende das vozes do sistema operacional. Se não houver nenhuma, o app exibe um aviso.
- **Nenhuma requisição de upload de conteúdo é feita.** O service worker só guarda os arquivos
  estáticos do próprio app em cache.

## Licença

MIT.
