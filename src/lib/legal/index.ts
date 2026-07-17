import { cpaRegime } from "./cpa";
import { cryptoStablecoinsRegime } from "./crypto-stablecoins";
import { euAiActRegime } from "./eu-ai-act";
import { giftCardsRegime } from "./gift-cards";
import { kingGovernanceRegime } from "./king-governance";
import { loyaltyRewardsRegime } from "./loyalty-rewards";
import { popiaRegime } from "./popia";
import type { LegalRegime, LegalRegimeId } from "./types";

export {
  legalRegimeIds,
  type LegalJurisdiction,
  type LegalProvision,
  type LegalRegime,
  type LegalRegimeId,
} from "./types";

export const legalRegimes: Record<LegalRegimeId, LegalRegime> = {
  popia: popiaRegime,
  cpa: cpaRegime,
  "gift-cards": giftCardsRegime,
  "loyalty-rewards": loyaltyRewardsRegime,
  "crypto-stablecoins": cryptoStablecoinsRegime,
  "king-governance": kingGovernanceRegime,
  "eu-ai-act": euAiActRegime,
};

export const legalRegimeList = Object.values(legalRegimes);

export function getLegalRegime(id: LegalRegimeId): LegalRegime {
  return legalRegimes[id];
}

export function compactLegalRegimesForPrompt(): string {
  return JSON.stringify(
    legalRegimeList.map((regime) => ({
      id: regime.id,
      name: regime.name,
      shortName: regime.shortName,
      jurisdiction: regime.jurisdiction,
      lastReviewed: regime.lastReviewed,
      overview: regime.overview,
      triggers: regime.triggers,
      provisions: regime.provisions,
      riskFlags: regime.riskFlags,
    })),
    null,
    2,
  );
}
