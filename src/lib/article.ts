import { Readability } from "@mozilla/readability";

export type ArticleSource = "direct" | "reader-proxy";

export interface ArticleResult {
  title: string;
  text: string;
  via: ArticleSource;
}

export type ArticleErrorCode = "invalid-url" | "proxy-failed";

export class ArticleError extends Error {
  readonly code: ArticleErrorCode;

  constructor(code: ArticleErrorCode, message: string) {
    super(message);
    this.name = "ArticleError";
    this.code = code;
  }
}

export interface ArticleDeps {
  fetchImpl?: typeof fetch;
  parseHtml?: (html: string) => Document;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const READER_PROXY_BASE = "https://r.jina.ai/";

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function defaultParseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface ResolvedDeps {
  fetchImpl: typeof fetch;
  parseHtml: (html: string) => Document;
  timeoutMs: number;
}

async function readDirect(url: string, deps: ResolvedDeps): Promise<ArticleResult | null> {
  try {
    const response = await fetchWithTimeout(deps.fetchImpl, url, deps.timeoutMs, {
      headers: { Accept: "text/html,application/xhtml+xml,text/plain" },
    });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("html")) {
      const html = await response.text();
      const parsed = new Readability(deps.parseHtml(html)).parse();
      const text = parsed?.textContent?.trim() ?? "";
      if (!text) {
        return null;
      }
      return { title: parsed?.title?.trim() || url, text, via: "direct" };
    }
    if (contentType.includes("text")) {
      const text = (await response.text()).trim();
      return text ? { title: url, text, via: "direct" } : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function readViaProxy(url: string, deps: ResolvedDeps): Promise<ArticleResult | null> {
  try {
    const response = await fetchWithTimeout(
      deps.fetchImpl,
      `${READER_PROXY_BASE}${url}`,
      deps.timeoutMs,
      { headers: { Accept: "text/plain" } },
    );
    if (!response.ok) {
      return null;
    }
    const text = (await response.text()).trim();
    return text ? { title: url, text, via: "reader-proxy" } : null;
  } catch {
    return null;
  }
}

/**
 * Lê o texto principal de uma página web: tenta o fetch direto no navegador
 * (extração do artigo com Readability) e, se o site bloquear (CORS/rede),
 * recorre ao proxy público de leitura r.jina.ai.
 */
export async function fetchArticleText(
  rawUrl: string,
  deps: ArticleDeps = {},
): Promise<ArticleResult> {
  const value = rawUrl.trim();
  if (!isHttpUrl(value)) {
    throw new ArticleError(
      "invalid-url",
      "URL inválida. Use um endereço http(s) completo, ex.: https://exemplo.com/pagina",
    );
  }
  const url = new URL(value).href;
  const resolved: ResolvedDeps = {
    fetchImpl: deps.fetchImpl ?? globalThis.fetch.bind(globalThis),
    parseHtml: deps.parseHtml ?? defaultParseHtml,
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  const direct = await readDirect(url, resolved);
  if (direct) {
    return direct;
  }
  const proxied = await readViaProxy(url, resolved);
  if (proxied) {
    return proxied;
  }
  throw new ArticleError(
    "proxy-failed",
    "Não foi possível ler a página (acesso direto e proxy de leitura falharam).",
  );
}
