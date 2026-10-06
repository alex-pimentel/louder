import { describe, expect, it } from "vitest";
import { cleanTextForSpeech } from "../src/lib/clean";

describe("cleanTextForSpeech", () => {
  it("returns an empty string for empty or whitespace input", () => {
    expect(cleanTextForSpeech("")).toBe("");
    expect(cleanTextForSpeech("   \n\t  ")).toBe("");
  });

  it("removes markdown headings", () => {
    expect(cleanTextForSpeech("# Título\n## Subtítulo")).toBe("Título Subtítulo");
  });

  it("removes bold and italic markers keeping the words", () => {
    expect(cleanTextForSpeech("Isto é **negrito** e *itálico*.")).toBe("Isto é negrito e itálico.");
  });

  it("keeps snake_case words intact", () => {
    expect(cleanTextForSpeech("a variável nome_completo importa")).toBe(
      "a variável nome_completo importa",
    );
  });

  it("keeps link text and drops the URL", () => {
    expect(cleanTextForSpeech("Veja [a documentação](https://exemplo.com/docs).")).toBe(
      "Veja a documentação.",
    );
  });

  it("keeps image alt text and drops the source", () => {
    expect(cleanTextForSpeech("Foto: ![pôr do sol](foto.jpg) linda.")).toBe(
      "Foto: pôr do sol linda.",
    );
  });

  it("removes inline code ticks and fenced code markers keeping the code", () => {
    expect(cleanTextForSpeech("Use `npm test` para testar.")).toBe("Use npm test para testar.");
    expect(cleanTextForSpeech("```js\nconst a = 1;\n```")).toBe("const a = 1;");
  });

  it("removes blockquote, list markers and horizontal rules", () => {
    expect(cleanTextForSpeech("> citação\n- item um\n1. item dois\n---")).toBe(
      "citação item um item dois",
    );
  });

  it("flattens markdown tables into plain words", () => {
    expect(cleanTextForSpeech("| nome | idade |\n| --- | --- |\n| Ana | 30 |")).toBe(
      "nome idade Ana 30",
    );
  });

  it("strips HTML tags", () => {
    expect(cleanTextForSpeech("<p>Olá <b>mundo</b></p>")).toBe("Olá mundo");
  });

  it("drops script and style content entirely", () => {
    expect(cleanTextForSpeech("<p>texto</p><script>alert(1)</script><style>p{}</style>")).toBe(
      "texto",
    );
  });

  it("decodes common HTML entities", () => {
    expect(cleanTextForSpeech("pão &amp; café &nbsp; 10 &lt; 20 &#39;ok&#39;")).toBe(
      "pão & café 10 < 20 'ok'",
    );
  });

  it("joins hyphenated line breaks from PDFs", () => {
    expect(cleanTextForSpeech("uma palavra-\nquebrada continua")).toBe(
      "uma palavraquebrada continua",
    );
  });

  it("collapses whitespace and trims", () => {
    expect(cleanTextForSpeech("  muito   espaço\n\nnovo ")).toBe("muito espaço novo");
  });

  it("leaves plain text untouched", () => {
    expect(cleanTextForSpeech("Olá, mundo! Tudo bem?")).toBe("Olá, mundo! Tudo bem?");
  });
});
