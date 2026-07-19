export function sanitizeQuotedContent(value: string): string {
  return value.replaceAll("<", "‹").replaceAll(">", "›").trim();
}

export function capQuotedContent(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) return value;
  return `${value.slice(0, Math.max(0, maxCharacters - 1)).trimEnd()}…`;
}
