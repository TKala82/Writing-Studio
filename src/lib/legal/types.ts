export const legalRegimeIds = [
  "popia",
  "cpa",
  "gift-cards",
  "loyalty-rewards",
  "crypto-stablecoins",
  "king-governance",
  "eu-ai-act",
] as const;

export type LegalRegimeId = (typeof legalRegimeIds)[number];

export type LegalJurisdiction = "ZA" | "EU";

export interface LegalProvision {
  citation: string;
  summary: string;
}

export interface LegalRegime {
  id: LegalRegimeId;
  name: string;
  shortName: string;
  jurisdiction: LegalJurisdiction;
  lastReviewed: string;
  overview: string;
  triggers: readonly string[];
  provisions: readonly LegalProvision[];
  riskFlags: readonly string[];
  disclaimerScope: string;
}
