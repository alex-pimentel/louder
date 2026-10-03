import { describe, expect, it } from "vitest";
import { chunkText, normalizeText, splitSentences } from "../src/lib/segmentation";

describe("normalizeText", () => {
  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeText("   \n\t  ")).toBe("");
  });

  it("collapses runs of whitespace and newlines into single spaces", () => {
    expect(normalizeText("hello   world\n\n\nagain")).toBe("hello world again");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("One. Two! Three?")).toEqual(["One.", "Two!", "Three?"]);
  });

  it("keeps ellipsis as a single boundary", () => {
    expect(splitSentences("Hmm… Yes.")).toEqual(["Hmm…", "Yes."]);
  });

  it("returns the trailing fragment without punctuation", () => {
    expect(splitSentences("Done. And then")).toEqual(["Done.", "And then"]);
  });

  it("returns an empty array for empty input", () => {
    expect(splitSentences("")).toEqual([]);
  });
});

describe("chunkText", () => {
  it("returns an empty array for empty or whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n ")).toEqual([]);
  });

  it("keeps a single short sentence as one chunk", () => {
    expect(chunkText("Hello world.")).toEqual(["Hello world."]);
  });

  it("groups consecutive short sentences up to the limit", () => {
    expect(chunkText("One. Two. Three.", 100)).toEqual(["One. Two. Three."]);
  });

  it("splits when adding a sentence would exceed the limit", () => {
    const result = chunkText("First one here. Second one here.", 20);
    expect(result).toEqual(["First one here.", "Second one here."]);
  });

  it("breaks a single sentence that exceeds the limit", () => {
    const result = chunkText("alpha beta gamma delta epsilon", 12);
    expect(result).toEqual(["alpha beta", "gamma delta", "epsilon"]);
  });

  it("honours a custom maximum length", () => {
    const text = "word ".repeat(200).trim() + ".";
    const chunks = chunkText(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => {
      if (i < chunks.length - 1) expect(c.length).toBeLessThanOrEqual(50);
    });
  });

  it("never loses content", () => {
    const text = "Alpha beta. Gamma delta. Epsilon zeta.";
    expect(chunkText(text, 15).join(" ")).toBe(text);
  });
});
