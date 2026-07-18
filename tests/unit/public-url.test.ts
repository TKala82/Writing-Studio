import { describe, expect, it } from "vitest";

import { isYouTubeUrl, normalizePublicUrl } from "@/lib/security/public-url";

describe("normalizePublicUrl", () => {
  it("accepts public https URLs", () => {
    const url = normalizePublicUrl("https://example.com/path?q=1");
    expect(url.hostname).toBe("example.com");
  });

  it("rejects private and local hosts", () => {
    const blocked = [
      "http://localhost/admin",
      "http://127.0.0.1/",
      "http://10.0.0.8/",
      "http://192.168.1.1/",
      "http://172.16.0.2/",
      "http://169.254.1.1/",
      "http://printer.local/",
    ];
    for (const value of blocked) {
      expect(() => normalizePublicUrl(value)).toThrow(/Private network|complete public URL/i);
    }
  });

  it("rejects non-http schemes and oversized URLs", () => {
    expect(() => normalizePublicUrl("file:///etc/passwd")).toThrow(/HTTP and HTTPS/i);
    expect(() => normalizePublicUrl("ftp://example.com/a")).toThrow(/HTTP and HTTPS/i);
    expect(() => normalizePublicUrl(`https://example.com/${"a".repeat(3_000)}`)).toThrow(
      /2,048 characters/i,
    );
  });

  it("detects YouTube hosts", () => {
    expect(isYouTubeUrl(new URL("https://www.youtube.com/watch?v=abc"))).toBe(true);
    expect(isYouTubeUrl(new URL("https://youtu.be/abc"))).toBe(true);
    expect(isYouTubeUrl(new URL("https://example.com/watch?v=abc"))).toBe(false);
  });
});
