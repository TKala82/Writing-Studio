import type { LegalRegime } from "./types";

export const kingGovernanceRegime: LegalRegime = {
  id: "king-governance",
  name: "King IV / King V corporate governance",
  shortName: "King",
  jurisdiction: "ZA",
  lastReviewed: "2026-07",
  overview:
    "South Africa's King codes set apply-and-explain governance expectations for ethical leadership, strategy, risk, assurance, and stakeholder inclusivity. King IV remains the established reference; King V is the newer IoDSA evolution and should be cited carefully by version.",
  triggers: [
    "governance",
    "board",
    "directors",
    "King IV",
    "King V",
    "King Code",
    "apply and explain",
    "stakeholder",
    "ESG",
    "ethics",
    "assurance",
    "audit committee",
    "combined assurance",
    "corporate reporting",
  ],
  provisions: [
    {
      citation: "King IV Part 5 / Principle cluster",
      summary:
        "Governing bodies should practise ethical and effective leadership, set strategy with risk and opportunity in view, and govern ethics and compliance.",
    },
    {
      citation: "King IV disclosure philosophy",
      summary:
        "Organisations should apply the principles and explain practices; box-ticking compliance language is discouraged.",
    },
    {
      citation: "King V transition note",
      summary:
        "If claiming King V alignment, state the version and avoid presenting draft or transitional expectations as settled law.",
    },
  ],
  riskFlags: [
    "Claiming full King compliance without apply-and-explain disclosure",
    "Confusing King guidance with hard statute",
    "Using King V language without confirming the organisation's adopted version",
  ],
  disclaimerScope:
    "King codes are governance frameworks, not Acts of Parliament; listing rules and sector regulators may give them practical force.",
};
