import { DOMParser } from "linkedom";
import { describe, expect, it, vi } from "vitest";
import { ArticleError, fetchArticleText, isHttpUrl } from "../src/lib/article";

const ARTICLE_HTML = `<!doctype html><html><head><title>Artigo Teste</title></head><body>
<nav>menu início contato</nav>
<article><h1>Como ler melhor</h1>
<p>A leitura em voz alta ajuda a compreender textos longos com menos esforço e mais atenção aos detalhes importantes do conteúdo apresentado aqui.</p>
<p>Um segundo parágrafo traz exemplos práticos de como a segmentação em trechos curtos melhora a experiência de quem acompanha a leitura pelo áudio.</p>
<p>Por fim, um terceiro parágrafo encerra o artigo com uma conclusão clara sobre os benefícios da leitura assistida por voz no dia a dia.</p>
</article>
<footer>rodapé institucional 2026</footer>
</body></html>`;

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function textResponse(text: string): Response {
  return new Response(text, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html") as unknown as Document;
}

describe("isHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isHttpUrl("https://exemplo.com/pagina")).toBe(true);
    expect(isHttpUrl("http://exemplo.com")).toBe(true);
  });

  it("rejects empty, relative and non-http URLs", () => {
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("  ")).toBe(false);
    expect(isHttpUrl("não é url")).toBe(false);
    expect(isHttpUrl("ftp://exemplo.com/a.txt")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("fetchArticleText", () => {
  it("rejects an invalid URL without fetching anything", async () => {
    const fetchImpl = vi.fn();
    const error = await fetchArticleText("nem-url", { fetchImpl, parseHtml }).catch((e) => e);
    expect(error).toBeInstanceOf(ArticleError);
    expect((error as ArticleError).code).toBe("invalid-url");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("extracts the article directly when the site allows it", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse(ARTICLE_HTML));
    const result = await fetchArticleText("https://exemplo.com/artigo", {
      fetchImpl,
      parseHtml,
    });
    expect(result.via).toBe("direct");
    expect(result.title).toContain("Artigo Teste");
    expect(result.text).toContain("leitura em voz alta");
    expect(result.text).not.toContain("rodapé institucional");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reads plain-text URLs directly without readability", async () => {
    const fetchImpl = vi.fn(async () => textResponse("Texto puro do arquivo."));
    const result = await fetchArticleText("https://exemplo.com/notas.txt", {
      fetchImpl,
      parseHtml,
    });
    expect(result.via).toBe("direct");
    expect(result.text).toBe("Texto puro do arquivo.");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the reader proxy when direct fetch fails", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("https://r.jina.ai/")) {
        return textResponse("# Título via proxy\n\nTexto do artigo via proxy.");
      }
      throw new TypeError("Failed to fetch");
    });
    const result = await fetchArticleText("https://exemplo.com/artigo", {
      fetchImpl,
      parseHtml,
    });
    expect(result.via).toBe("reader-proxy");
    expect(result.text).toContain("Texto do artigo via proxy");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back to the proxy when the page has no readable content", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("https://r.jina.ai/")) {
        return textResponse("Texto do proxy.");
      }
      return htmlResponse("<html><head><title>Vazia</title></head><body><div></div></body></html>");
    });
    const result = await fetchArticleText("https://exemplo.com/vazia", {
      fetchImpl,
      parseHtml,
    });
    expect(result.via).toBe("reader-proxy");
  });

  it("throws proxy-failed when both attempts fail", async () => {
    const fetchImpl = vi.fn(async () => new Response("erro", { status: 500 }));
    const error = await fetchArticleText("https://exemplo.com/fora", {
      fetchImpl,
      parseHtml,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ArticleError);
    expect((error as ArticleError).code).toBe("proxy-failed");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
