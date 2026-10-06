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
  // Block removal tolerates attributes and whitespace inside both tags, so
  // odd-but-valid closings like `</script \n foo>` are consumed as well.
  const withoutBlocks = text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, "\n");
  const blockTagsAsBreaks = withoutBlocks.replace(
    /<\/?(?:p|div|h[1-6]|li|ul|ol|table|tr|td|th|thead|tbody|section|article|header|footer|br|hr|blockquote|pre)[\s>/]/gi,
    "\n",
  );
  // Repeat until no complete tag remains: each pass unwraps one nesting
  // level (e.g. `<scr<script>ipt>`), so doubled tags cannot resurface.
  let previous = "";
  let stripped = blockTagsAsBreaks;
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripped.replace(/<[^<>]+>/g, "");
  }
  // Drop an unclosed tag-like tail (`Texto <script`); a `<` followed by a
  // space or digit (comparisons like `10 < 20`) is left untouched.
  return stripped.replace(/<[a-zA-Z/][^<>]*$/g, "");
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
