# 🔊 Louder — leia PDF e texto em voz alta, 100% no navegador

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

## Deploy (Cloudflare Pages)

O `dist/` é compatível com Cloudflare Pages e qualquer host estático:

| Configuração     | Valor           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Build output dir | `dist`          |
| Node version     | 20 ou superior  |

## Qualidade

```bash
npm run lint       # ESLint
npm run types      # tsc --noEmit
npm test           # Vitest (segmentação + wrapper de fala)
```

## Estrutura

```
index.html                 → shell da aplicação
src/main.ts                → controlador da UI (fonte, voz, transporte, atalhos)
src/style.css              → tema claro/escuro e responsivo
src/lib/segmentation.ts    → normalização e segmentação em trechos
src/lib/speech.ts          → wrapper testável da Web Speech API
src/lib/pdf.ts             → extração de PDF com PDF.js
src/lib/storage.ts         → preferências em localStorage (única persistência)
public/sw.js               → service worker (cache offline)
public/manifest.webmanifest→ metadados PWA
tests/                     → testes Vitest
```

## Privacidade e limites

- PDF até **25 MB**; texto colado até **200 000 caracteres**.
- Depende das vozes do sistema operacional. Se não houver nenhuma, o app exibe um aviso.
- **Nenhuma requisição de upload de conteúdo é feita.** O service worker só guarda os arquivos
  estáticos do próprio app em cache.

## Licença

MIT.
