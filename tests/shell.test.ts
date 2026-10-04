import { describe, expect, it } from "vitest";
import { CLERK_ENV_KEY, resolveClerkKey } from "../src/lib/shell";

describe("resolveClerkKey", () => {
  it("returns undefined when the key is absent", () => {
    expect(resolveClerkKey({})).toBeUndefined();
  });

  it("returns undefined for a blank key", () => {
    expect(resolveClerkKey({ [CLERK_ENV_KEY]: "   " })).toBeUndefined();
  });

  it("returns undefined for a non-string key", () => {
    expect(resolveClerkKey({ [CLERK_ENV_KEY]: 42 })).toBeUndefined();
  });

  it("returns the trimmed key when present", () => {
    expect(resolveClerkKey({ [CLERK_ENV_KEY]: "  pk_test_123  " })).toBe("pk_test_123");
  });
});
