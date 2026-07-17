import type {
  DeliveryFormatId,
  EngagementCriterion,
  EngagementRubric,
} from "./types";

const coreCriteria: EngagementCriterion[] = [
  {
    id: "clarity",
    label: "Clear spoken point",
    description:
      "Answers lead with the main point, use plain structure, and avoid unnecessary setup.",
    weight: 3,
  },
  {
    id: "evidence",
    label: "Evidence under pressure",
    description:
      "Claims are supported with relevant examples while uncertainty remains calibrated.",
    weight: 3,
  },
  {
    id: "responsiveness",
    label: "Listens and responds",
    description:
      "The response addresses the actual question or objection rather than delivering a prepared monologue.",
    weight: 3,
  },
  {
    id: "audience",
    label: "Audience awareness",
    description:
      "Language, depth, and framing match what the counterpart plausibly knows and needs.",
    weight: 2,
  },
];

const formatCriterion: Record<DeliveryFormatId, EngagementCriterion> = {
  "video-call": {
    id: "presence",
    label: "Concise conversational presence",
    description:
      "Responses are complete but compact, with space for the other person to participate.",
    weight: 2,
  },
  "presentation-panel": {
    id: "throughline",
    label: "Stays on the throughline",
    description:
      "Answers reconnect difficult questions to the presentation's central claim without evasion.",
    weight: 2,
  },
  negotiation: {
    id: "tradeoffs",
    label: "Handles interests and trade-offs",
    description:
      "The writer diagnoses interests, protects priorities, and makes conditional rather than unilateral concessions.",
    weight: 3,
  },
  "cold-call": {
    id: "permission",
    label: "Earns the next step",
    description:
      "The exchange respects time, establishes relevance quickly, and makes a proportionate ask.",
    weight: 3,
  },
  "async-posting": {
    id: "public-reply",
    label: "Replies for the wider audience",
    description:
      "Responses remain self-contained, precise, and constructive when read outside the immediate thread.",
    weight: 2,
  },
};

export function getEngagementRubric(
  format: DeliveryFormatId,
): EngagementRubric {
  return {
    format,
    name: "Engagement and delivery",
    criteria: [...coreCriteria, formatCriterion[format]],
  };
}
