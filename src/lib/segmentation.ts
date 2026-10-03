export const DEFAULT_MAX_CHUNK_LENGTH = 220;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function splitSentences(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) {
    return [];
  }
  const matches = clean.match(/[^.!?…]+[.!?…]+["»”)]?|\S[^.!?…]*$/g);
  if (!matches) {
    return [clean];
  }
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function splitLongSegment(segment: string, maxLength: number): string[] {
  if (segment.length <= maxLength) {
    return [segment];
  }
  const words = segment.split(" ");
  const parts: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxLength) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

export function chunkText(text: string, maxLength = DEFAULT_MAX_CHUNK_LENGTH): string[] {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return [];
  }
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const pieces = sentence.length > maxLength ? splitLongSegment(sentence, maxLength) : [sentence];
    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && candidate.length > maxLength) {
        chunks.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}
