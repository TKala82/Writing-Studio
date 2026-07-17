import { coverLetterRubric } from "./cover-letter";
import { forumEssayRubric } from "./forum-essay";
import { motivationStatementRubric } from "./motivation-statement";
import { outreachEmailRubric } from "./outreach-email";
import { policyBriefRubric } from "./policy-brief";
import { researchStatementRubric } from "./research-statement";
import { resumeRubric } from "./resume";
import { socialPostRubric } from "./social-post";
import { socialThreadRubric } from "./social-thread";
import type { GenreId, GenreRubric } from "./types";

export { genreIds, type GenreCriterion, type GenreId, type GenreRubric } from "./types";

export const genreRubrics: Record<GenreId, GenreRubric> = {
  "motivation-statement": motivationStatementRubric,
  resume: resumeRubric,
  "cover-letter": coverLetterRubric,
  "social-post": socialPostRubric,
  "forum-essay": forumEssayRubric,
  "research-statement": researchStatementRubric,
  "outreach-email": outreachEmailRubric,
  "policy-brief": policyBriefRubric,
  "social-thread": socialThreadRubric,
};

export const genreList = Object.values(genreRubrics);

export function getGenreRubric(genreId: GenreId): GenreRubric {
  return genreRubrics[genreId];
}
