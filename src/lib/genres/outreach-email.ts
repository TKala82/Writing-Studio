import type { GenreRubric } from "./types";

export const outreachEmailRubric: GenreRubric = {
  id: "outreach-email",
  name: "Cold outreach email",
  shortName: "Outreach email",
  description:
    "A respectful, specific message that makes a low-friction request worth answering.",
  icon: "letter",
  accent: "Earn a reply without pretending familiarity",
  length: {
    minWords: 70,
    maxWords: 220,
    targetGradeMin: 7,
    targetGradeMax: 10,
  },
  systemPrompt: `Edit this outreach email for a busy recipient. Establish relevance in the first two sentences,
show why this specific person is being contacted, and make one bounded request that is easy to answer or decline.
Preserve professional warmth without flattery, urgency theatre, or false familiarity. Never invent a connection,
achievement, shared interest, or knowledge of the recipient's work.`,
  criteria: [
    { id: "relevance", label: "Relevance is immediate", description: "The recipient can see why this message is for them.", kind: "judgment", weight: 3 },
    { id: "specificity", label: "Specific without flattery", description: "The reference to the recipient or topic is concrete and earned.", kind: "judgment", weight: 2 },
    { id: "request", label: "Request is bounded", description: "One clear ask is easy to answer or decline.", kind: "judgment", weight: 3 },
    { id: "respect", label: "Respects recipient time", description: "The email is concise and does not manufacture urgency.", kind: "judgment", weight: 2 },
    { id: "word-count", label: "Brief enough to answer", description: "The message fits a busy inbox.", kind: "measurable", check: "word-count", weight: 2 },
    { id: "anti-slop", label: "No outreach templates", description: "Avoids empty admiration and generic networking language.", kind: "measurable", check: "banned-phrases", weight: 2 },
  ],
  preferredPatterns: [
    "specific relevance → concise credibility → bounded ask",
    "shared problem → useful context → easy next step",
  ],
  discouragedPatterns: [
    "I hope this email finds you well",
    "picking your brain",
    "lengthy autobiography before the ask",
  ],
};
