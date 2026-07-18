/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiUsage from "../aiUsage.js";
import type * as coach from "../coach.js";
import type * as coachActions from "../coachActions.js";
import type * as customRubrics from "../customRubrics.js";
import type * as documents from "../documents.js";
import type * as editorialMemory from "../editorialMemory.js";
import type * as ideation from "../ideation.js";
import type * as ideationActions from "../ideationActions.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_demoPipeline from "../lib/demoPipeline.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_pipelineSchemas from "../lib/pipelineSchemas.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as lib_validators from "../lib/validators.js";
import type * as library from "../library.js";
import type * as libraryActions from "../libraryActions.js";
import type * as pipelineActions from "../pipelineActions.js";
import type * as practice from "../practice.js";
import type * as practiceActions from "../practiceActions.js";
import type * as preflight from "../preflight.js";
import type * as rubricActions from "../rubricActions.js";
import type * as selectionActions from "../selectionActions.js";
import type * as sourceActions from "../sourceActions.js";
import type * as sources from "../sources.js";
import type * as users from "../users.js";
import type * as voiceActions from "../voiceActions.js";
import type * as voiceProfiles from "../voiceProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiUsage: typeof aiUsage;
  coach: typeof coach;
  coachActions: typeof coachActions;
  customRubrics: typeof customRubrics;
  documents: typeof documents;
  editorialMemory: typeof editorialMemory;
  ideation: typeof ideation;
  ideationActions: typeof ideationActions;
  "lib/auth": typeof lib_auth;
  "lib/demoPipeline": typeof lib_demoPipeline;
  "lib/models": typeof lib_models;
  "lib/pipelineSchemas": typeof lib_pipelineSchemas;
  "lib/prompts": typeof lib_prompts;
  "lib/validators": typeof lib_validators;
  library: typeof library;
  libraryActions: typeof libraryActions;
  pipelineActions: typeof pipelineActions;
  practice: typeof practice;
  practiceActions: typeof practiceActions;
  preflight: typeof preflight;
  rubricActions: typeof rubricActions;
  selectionActions: typeof selectionActions;
  sourceActions: typeof sourceActions;
  sources: typeof sources;
  users: typeof users;
  voiceActions: typeof voiceActions;
  voiceProfiles: typeof voiceProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
