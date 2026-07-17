export const deliveryFormatIds = [
  "video-call",
  "presentation-panel",
  "negotiation",
  "cold-call",
  "async-posting",
] as const;

export type DeliveryFormatId = (typeof deliveryFormatIds)[number];

export interface DeliveryFormat {
  id: DeliveryFormatId;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  defaultPersona: string;
  bestPractices: string[];
}

export interface EngagementCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export interface EngagementRubric {
  format: DeliveryFormatId;
  name: string;
  criteria: EngagementCriterion[];
}
