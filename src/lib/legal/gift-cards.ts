import type { LegalRegime } from "./types";

export const giftCardsRegime: LegalRegime = {
  id: "gift-cards",
  name: "CPA prepaid certificates and gift cards",
  shortName: "Gift cards",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "South African prepaid gift certificates and similar instruments are regulated under the Consumer Protection Act, especially rules on expiry and unused value.",
  triggers: [
    "gift card",
    "gift voucher",
    "voucher",
    "prepaid card",
    "store credit",
    "credit note",
    "prepaid certificate",
    "expires",
    "expiry date",
    "unused balance",
  ],
  provisions: [
    {
      citation: "CPA s63",
      summary:
        "A prepaid certificate, credit, or voucher generally remains redeemable for at least three years from the date of issue unless a longer period is provided.",
    },
    {
      citation: "CPA s63 read with s22",
      summary:
        "Expiry and redemption conditions must be communicated clearly in plain language.",
    },
  ],
  riskFlags: [
    "Advertising a gift card that expires in under three years without a lawful exception",
    "Forfeiting unused balances without clear, lawful disclosure",
  ],
  disclaimerScope:
    "Exact treatment can depend on the instrument design and whether another financial-product regime also applies.",
};
