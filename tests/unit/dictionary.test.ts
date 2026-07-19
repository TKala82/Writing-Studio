import { describe, expect, it } from "vitest";

import { extractLookupWord } from "@/lib/lexicon/dictionary";

describe("extractLookupWord", () => {
  it("extracts a single normalized word", () => {
    expect(extractLookupWord("  Ambiguity! ")).toBe("ambiguity");
  });

  it("rejects multi-word selections", () => {
    expect(extractLookupWord("open question")).toBeNull();
  });
});
