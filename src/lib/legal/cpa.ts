import type { LegalRegime } from "./types";

export const cpaRegime: LegalRegime = {
  id: "cpa",
  name: "Consumer Protection Act 68 of 2008",
  shortName: "CPA",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "South Africa's primary consumer statute regulating marketing, unfair terms, plain language, product quality, and promotional practices in consumer transactions.",
  triggers: [
    "consumer",
    "customer",
    "marketing",
    "advertise",
    "advertisement",
    "promotion",
    "discount",
    "guarantee",
    "warranty",
    "refund",
    "cooling-off",
    "cooling off",
    "terms and conditions",
    "unfair",
    "misleading",
    "plain language",
    "bundle",
    "direct marketing",
  ],
  provisions: [
    {
      citation: "CPA s22",
      summary:
        "Notices and agreements intended for consumers must be in plain and understandable language.",
    },
    {
      citation: "CPA s29–s41",
      summary:
        "Marketing must not be misleading, unfair, or improperly coerce consumers; comparative and bait marketing are regulated.",
    },
    {
      citation: "CPA s48–s52",
      summary:
        "Unfair, unreasonable, or unjust contract terms may be challenged; suppliers must not impose excessively one-sided conditions.",
    },
    {
      citation: "CPA s16",
      summary:
        "A cooling-off right can apply to certain direct-marketing transactions concluded away from the supplier's premises.",
    },
  ],
  riskFlags: [
    "Absolute claims that cannot be substantiated",
    "Hidden exclusions that defeat the main offer",
    "Using legal jargon where CPA plain-language duties apply",
  ],
  disclaimerScope:
    "CPA coverage turns on whether the audience is a consumer and whether the supplier falls within the Act.",
};
