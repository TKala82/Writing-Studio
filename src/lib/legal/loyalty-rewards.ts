import type { LegalRegime } from "./types";

export const loyaltyRewardsRegime: LegalRegime = {
  id: "loyalty-rewards",
  name: "CPA loyalty programmes",
  shortName: "Loyalty",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "Loyalty and rewards programmes offered to consumers are specifically regulated under the Consumer Protection Act, including disclosure of rules and changes.",
  triggers: [
    "loyalty",
    "rewards programme",
    "rewards program",
    "points",
    "earn points",
    "redeem points",
    "membership",
    "tier",
    "frequent flyer",
    "cashback",
    "cash back",
    "reward miles",
  ],
  provisions: [
    {
      citation: "CPA s35",
      summary:
        "A person who offers a loyalty programme must disclose the nature of the programme, rules for earning and redeeming benefits, and any restrictions.",
    },
    {
      citation: "CPA s35",
      summary:
        "Programme changes that prejudice participants generally require advance notice in the manner contemplated by the Act.",
    },
  ],
  riskFlags: [
    "Changing redemption rules without adequate notice",
    "Advertising rewards that are practically unavailable",
    "Hiding material exclusions in fine print",
  ],
  disclaimerScope:
    "Loyalty rules interact with general CPA marketing and unfair-terms provisions.",
};
