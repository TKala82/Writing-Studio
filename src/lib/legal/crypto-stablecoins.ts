import type { LegalRegime } from "./types";

export const cryptoStablecoinsRegime: LegalRegime = {
  id: "crypto-stablecoins",
  name: "South African crypto-asset and stablecoin framework",
  shortName: "Crypto",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "Crypto assets are treated as financial products for FAIS purposes in South Africa, with FIC Act anti-money-laundering duties and ongoing exchange-control and payment-system considerations for stablecoins.",
  triggers: [
    "crypto",
    "cryptocurrency",
    "bitcoin",
    "ethereum",
    "stablecoin",
    "USDT",
    "USDC",
    "token",
    "digital asset",
    "blockchain",
    "wallet",
    "exchange",
    "DeFi",
    "NFT",
    "mining",
  ],
  provisions: [
    {
      citation: "FAIS crypto-asset declaration (2022)",
      summary:
        "Crypto assets are declared financial products, bringing advice and intermediary services into the FAIS licensing and conduct framework where applicable.",
    },
    {
      citation: "FIC Act / FIC guidance",
      summary:
        "Crypto asset service providers may face customer due diligence, record-keeping, and suspicious-transaction reporting obligations.",
    },
    {
      citation: "Exchange control / SARB policy notes",
      summary:
        "Cross-border crypto transfers and settlement arrangements can engage exchange-control and payment-system expectations; stablecoin use is not a free pass around FX rules.",
    },
  ],
  riskFlags: [
    "Implying crypto returns are guaranteed or risk-free",
    "Offering crypto advice or intermediation without addressing licensing",
    "Treating stablecoins as ordinary rand cash without regulatory caveats",
  ],
  disclaimerScope:
    "Crypto regulation is evolving; activity type (advice, exchange, custody, payment) changes which obligations bite.",
};
