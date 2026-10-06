const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_match, digits: string) => {
      const code = Number(digits);
      return Number.isSafeInteger(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isSafeInteger(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

function stripHtml(text: string): string {
  const withoutScripts = text
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "\n")
    .replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, "\n");
  const blockTagsAsBreaks = withoutScripts.replace(
    /<\/?(?:p|div|h[1-6]|li|ul|ol|table|tr|td|th|thead|tbody|section|article|header|footer|br|hr|blockquote|pre)[\s>]/gi,
    "\n",
  );
  return blockTagsAsBreaks.replace(/<[^<>]+>/g, "");
}

function stripMarkdown(text: string): string {
  let out = text;
  out = out.replace(/```[^\n]*\n?([\s\S]*?)```/g, "$1");
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/~~([^~]+)~~/g, "$1");
  out = out.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1$2");
  out = out.replace(/(^|[\s("'])_([^_\n]+)_(?=[\s).,"'!?;:»”]|$)/g, "$1$2");
  out = out
    .split("\n")
    .map((line) => {
      let cleaned = line.replace(/^#{1,6}\s+/, "").replace(/^>\s?/, "");
      cleaned = cleaned.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, "");
      if (/^[\s|:-]+$/.test(cleaned) && /[-:]/.test(cleaned)) {
        return "";
      }
      return cleaned.replace(/\|/g, " ");
    })
    .join("\n");
  return out;
}

/**
 * Remove marcas de formatação (Markdown, HTML, artefatos de PDF) para uma
 * leitura em voz alta mais fluida. Puro e sem DOM: roda no app e nos testes.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) {
    return "";
  }
  const decoded = decodeEntities(text);
  const withoutHtml = stripHtml(decoded);
  const withoutMarkdown = stripMarkdown(withoutHtml);
  const dehyphenated = withoutMarkdown
    .replace(/­/g, "")
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, "$1$2");
  return dehyphenated.replace(/\s+/g, " ").trim();
}
