import type { DictionaryResult, DictionarySense } from "./types";

interface FreeDictionaryMeaning {
  partOfSpeech?: string;
  definitions?: Array<{
    definition?: string;
    example?: string;
    synonyms?: string[];
  }>;
  synonyms?: string[];
}

interface FreeDictionaryEntry {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string }>;
  meanings?: FreeDictionaryMeaning[];
}

function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[^a-zA-Z0-9'-]+|[^a-zA-Z0-9'-]+$/g, "");
}

export function extractLookupWord(selection: string): string | null {
  const words = selection
    .trim()
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
  if (words.length !== 1) return null;
  return words[0] ?? null;
}

export async function lookupDefinition(
  selection: string,
): Promise<DictionaryResult> {
  const word = extractLookupWord(selection);
  if (!word) {
    throw new Error("Select one word to look up");
  }

  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (response.status === 404) {
    throw new Error(`No dictionary entry found for “${word}”`);
  }
  if (!response.ok) {
    throw new Error(`Dictionary lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as FreeDictionaryEntry[];
  const entry = payload[0];
  if (!entry?.meanings?.length) {
    throw new Error(`No usable definitions found for “${word}”`);
  }

  const senses: DictionarySense[] = entry.meanings.slice(0, 4).map((meaning) => {
    const definitions = (meaning.definitions ?? [])
      .map((item) => item.definition?.trim())
      .filter((item): item is string => Boolean(item))
      .slice(0, 3);
    const synonyms = [
      ...(meaning.synonyms ?? []),
      ...((meaning.definitions ?? []).flatMap((item) => item.synonyms ?? [])),
    ]
      .filter(Boolean)
      .slice(0, 8);
    const example = meaning.definitions?.find((item) => item.example)?.example;
    return {
      partOfSpeech: meaning.partOfSpeech || "unknown",
      definitions,
      synonyms,
      example,
    };
  });

  return {
    word: entry.word || word,
    phonetic:
      entry.phonetic ||
      entry.phonetics?.find((item) => item.text)?.text ||
      undefined,
    senses,
    source: "free-dictionary",
  };
}
