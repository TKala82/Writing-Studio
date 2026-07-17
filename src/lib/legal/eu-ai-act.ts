import type { LegalRegime } from "./types";

export const euAiActRegime: LegalRegime = {
  id: "eu-ai-act",
  name: "EU Artificial Intelligence Act",
  shortName: "EU AI Act",
  jurisdiction: "EU",
  lastReviewed: "2026-07",
  overview:
    "The EU AI Act regulates AI systems by risk tier, with particular duties for high-risk systems, prohibited practices, transparency for certain AI interactions, and provider/deployer obligations. Included here only for EU-facing AI policy and governance content.",
  triggers: [
    "artificial intelligence",
    "AI system",
    "AI model",
    "high-risk AI",
    "foundation model",
    "GPAI",
    "general-purpose AI",
    "AI Act",
    "deployer",
    "provider",
    "transparency obligation",
    "biometric identification",
    "automated decision",
  ],
  provisions: [
    {
      citation: "EU AI Act risk tiers",
      summary:
        "Obligations differ by prohibited, high-risk, limited-risk/transparency, and minimal-risk categories; classify before asserting compliance.",
    },
    {
      citation: "Provider vs deployer duties",
      summary:
        "Providers and deployers carry different documentation, monitoring, and human-oversight responsibilities.",
    },
    {
      citation: "Transparency / human interaction",
      summary:
        "Certain AI systems that interact with people or generate content must make that clear to users.",
    },
  ],
  riskFlags: [
    "Claiming EU AI Act compliance without naming the system's risk class",
    "Assuming South African use alone triggers the EU AI Act",
    "Treating voluntary AI ethics pledges as legal compliance",
  ],
  disclaimerScope:
    "EU AI Act applicability depends on placing on the market / putting into service in the EU or affecting people in the EU.",
};
