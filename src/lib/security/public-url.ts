/**
 * Shared public-URL validation used by Convex source ingestion and unit tests.
 * Rejects non-HTTP(S) schemes and common private/link-local hostnames before DNS.
 */
export function normalizePublicUrl(value: string): URL {
  if (value.length > 2_048) {
    throw new Error("Links are limited to 2,048 characters");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a complete public URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public HTTP and HTTPS links are supported");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Private network addresses cannot be imported");
  }
  return url;
}

export function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.replace(/^www\./, "");
  return (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  );
}
