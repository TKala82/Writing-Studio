export interface DictionarySense {
  partOfSpeech: string;
  definitions: string[];
  synonyms: string[];
  example?: string;
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  senses: DictionarySense[];
  source: "free-dictionary";
}

export interface ThesaurusResult {
  word: string;
  synonyms: string[];
  related: string[];
  source: "datamuse";
}
