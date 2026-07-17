import { extractLookupWord } from "./dictionary";
import type { ThesaurusResult } from "./types";

interface DatamuseWord {
  word?: string;
  score?: number;
}

async function fetchDatamuse(params: string): Promise<string[]> {
  const response = await fetch(`https://api.datamuse.com/words?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Thesaurus lookup failed (${response.status})`);
  }
  const payload = (await response.json()) as DatamuseWord[];
  return payload
    .map((item) => item.word?.trim())
    .filter((item): item is string => Boolean(item));
}

export async function lookupThesaurus(
  selection: string,
): Promise<ThesaurusResult> {
  const word = extractLookupWord(selection);
  if (!word) {
    throw new Error("Select one word for synonyms");
  }

  const [synonyms, related] = await Promise.all([
    fetchDatamuse(`rel_syn=${encodeURIComponent(word)}&max=16`),
    fetchDatamuse(`ml=${encodeURIComponent(word)}&max=12`),
  ]);

  const uniqueSynonyms = [...new Set(synonyms)].filter(
    (item) => item.toLowerCase() !== word,
  );
  const uniqueRelated = [...new Set(related)].filter(
    (item) =>
      item.toLowerCase() !== word &&
      !uniqueSynonyms.includes(item),
  );

  if (uniqueSynonyms.length === 0 && uniqueRelated.length === 0) {
    throw new Error(`No synonyms found for “${word}”`);
  }

  return {
    word,
    synonyms: uniqueSynonyms.slice(0, 12),
    related: uniqueRelated.slice(0, 8),
    source: "datamuse",
  };
}
