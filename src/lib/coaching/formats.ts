import type { DeliveryFormat } from "./types";

export const deliveryFormats: DeliveryFormat[] = [
  {
    id: "video-call",
    name: "Video call or interview",
    shortName: "Video call",
    description:
      "A live conversation where clear answers, visible listening, and concise follow-ups matter.",
    accent: "Answer in complete thoughts, then stop and invite the next question.",
    defaultPersona: "A thoughtful but time-conscious interviewer",
    bestPractices: [
      "Lead with the answer before supplying context.",
      "Use one concrete example per substantive point.",
      "Pause after important claims instead of filling the silence.",
      "Keep supporting notes beside the camera, not across the screen.",
    ],
  },
  {
    id: "presentation-panel",
    name: "Presentation or panel",
    shortName: "Presentation",
    description:
      "A structured spoken delivery followed by questions from people with mixed levels of context.",
    accent: "Build a memorable spoken spine rather than reading the written document aloud.",
    defaultPersona: "A skeptical panel moderator with limited time",
    bestPractices: [
      "State the destination and the route in the opening minute.",
      "Translate paragraphs into one claim and one proof point.",
      "Signpost transitions so listeners can recover if attention drifts.",
      "Prepare a shorter ending in case the session runs over.",
    ],
  },
  {
    id: "negotiation",
    name: "Negotiation call",
    shortName: "Negotiation",
    description:
      "A live exchange where interests, trade-offs, evidence, and deliberate concessions shape the outcome.",
    accent: "Separate the underlying interest from the position being argued.",
    defaultPersona: "A commercially astute counterpart protecting their constraints",
    bestPractices: [
      "Open by confirming the shared objective and decision process.",
      "Ask diagnostic questions before defending a position.",
      "Trade concessions; do not give them away without reciprocity.",
      "Summarise agreed points and unresolved conditions before closing.",
    ],
  },
  {
    id: "cold-call",
    name: "Cold or outreach call",
    shortName: "Cold call",
    description:
      "A short, permission-based conversation that must establish relevance before asking for attention.",
    accent: "Earn the next thirty seconds before explaining the whole case.",
    defaultPersona: "A busy decision-maker who did not expect the call",
    bestPractices: [
      "Ask permission to take thirty seconds and honour the limit.",
      "Name a relevant problem before describing your solution.",
      "Use one credible signal instead of a list of credentials.",
      "Make the next step specific, small, and easy to decline.",
    ],
  },
  {
    id: "async-posting",
    name: "Async post, thread, or AMA",
    shortName: "Async",
    description:
      "A written-online exchange where the opening must carry context and replies may arrive out of order.",
    accent: "Design the post and replies so each can survive being read in isolation.",
    defaultPersona: "A critical reader asking public follow-up questions",
    bestPractices: [
      "Put the claim and essential context in the first screen.",
      "Quote the point you are answering before replying.",
      "Distinguish evidence, inference, and opinion explicitly.",
      "Correct misunderstandings without rewarding hostile framing.",
    ],
  },
];

export function getDeliveryFormat(id: DeliveryFormat["id"]): DeliveryFormat {
  const format = deliveryFormats.find((item) => item.id === id);
  if (!format) throw new Error(`Unknown delivery format: ${id}`);
  return format;
}
