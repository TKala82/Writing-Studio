import type { LegalRegime } from "./types";

export const popiaRegime: LegalRegime = {
  id: "popia",
  name: "Protection of Personal Information Act (POPIA)",
  shortName: "POPIA",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "South Africa's data-protection statute governing when personal information may be collected, used, shared, stored, or transferred across borders.",
  triggers: [
    "personal information",
    "personal data",
    "customer data",
    "email address",
    "identity number",
    "ID number",
    "phone number",
    "consent",
    "opt-in",
    "opt out",
    "process data",
    "data processing",
    "cross-border",
    "transfer overseas",
    "privacy policy",
    "data subject",
    "biometric",
    "special personal information",
  ],
  provisions: [
    {
      citation: "POPIA s4–s5",
      summary:
        "Processing must be lawful, reasonable, and limited to a defined purpose with a recognised lawful basis.",
    },
    {
      citation: "POPIA s11",
      summary:
        "Consent is one lawful basis; other bases include contract necessity, legal obligation, and legitimate interest with safeguards.",
    },
    {
      citation: "POPIA s18",
      summary:
        "Data subjects must be notified about collection purpose, recipients, and rights unless an exemption applies.",
    },
    {
      citation: "POPIA s72",
      summary:
        "Cross-border transfers require adequate protection, consent, or another permitted transfer mechanism.",
    },
  ],
  riskFlags: [
    "Claiming blanket consent covers all future uses",
    "Sharing customer lists without a stated purpose or basis",
    "Implying overseas transfer is unrestricted",
  ],
  disclaimerScope:
    "POPIA application depends on whether personal information is processed and which lawful basis applies.",
};
