/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

function identity(subject: string) {
  return {
    subject,
    issuer: "https://identity.test",
    tokenIdentifier: `https://identity.test|${subject}`,
    name: subject,
    email: `${subject}@example.test`,
  };
}

describe("runtime user-data isolation", () => {
  test("keeps documents, sources, and profiles private to their owner", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(identity("alice"));
    const bob = t.withIdentity(identity("bob"));
    const aliceId = await alice.mutation(api.users.ensure, {});
    await bob.mutation(api.users.ensure, {});

    const { documentId, runId } = await alice.mutation(api.documents.create, {
      draft:
        "Alice built an evaluation harness with three hundred prompts and documented the resulting evidence carefully.",
      genre: "motivation-statement",
    });
    const sourceId = await alice.mutation(api.sources.createText, {
      title: "Alice evidence",
      text:
        "This source belongs to Alice and contains enough concrete material to satisfy the minimum source length.",
    });
    await alice.mutation(api.writerProfile.save, {
      aboutMe: "Alice is an evaluation researcher.",
      objectives: "Build reproducible safety evaluations.",
      audience: "Technical fellowship reviewers.",
    });

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("voiceProfiles", {
        userId: aliceId,
        spec: {
          tone: "direct",
          formality: "professional",
          perspective: "first person",
          sentenceStyle: "concise",
          distinctiveTraits: ["specific"],
          preserve: ["measured claims"],
        },
        sampleCount: 1,
        updatedAt: now,
        createdAt: now,
      });
      await ctx.db.insert("customRubrics", {
        userId: aliceId,
        name: "Alice rubric",
        description: "Private evaluation rubric",
        baseGenre: "motivation-statement",
        accent: "evidence first",
        systemPrompt: "Use only the supplied evidence.",
        length: {
          minWords: 300,
          maxWords: 600,
          targetGradeMin: 9,
          targetGradeMax: 12,
        },
        criteria: [],
        preferredPatterns: ["specific evidence"],
        discouragedPatterns: ["generic claims"],
        referenceCount: 1,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      bob.query(api.documents.getEditableText, { documentId }),
    ).rejects.toThrow(/another user|unauthorized/i);
    await expect(bob.query(api.documents.getRun, { runId })).rejects.toThrow(
      /another user|unauthorized/i,
    );
    await expect(
      bob.mutation(api.documents.rename, { documentId, title: "Stolen" }),
    ).rejects.toThrow(/access denied|unauthorized/i);
    await expect(
      bob.mutation(api.sources.remove, { sourceId }),
    ).rejects.toThrow(/another user|unauthorized/i);

    expect(await bob.query(api.documents.listRecent, {})).toEqual([]);
    expect(await bob.query(api.sources.list, {})).toEqual([]);
    expect(await bob.query(api.writerProfile.getMine, {})).toBeNull();
    expect(await bob.query(api.voiceProfiles.getMine, {})).toBeNull();
    expect(await bob.query(api.customRubrics.listMine, {})).toEqual([]);

    expect(await alice.query(api.documents.listRecent, {})).toHaveLength(1);
    expect(await alice.query(api.sources.list, {})).toHaveLength(1);
    expect(await alice.query(api.writerProfile.getMine, {})).toMatchObject({
      aboutMe: "Alice is an evaluation researcher.",
    });
    expect(await alice.query(api.voiceProfiles.getMine, {})).toMatchObject({
      sampleCount: 1,
    });
    expect(await alice.query(api.customRubrics.listMine, {})).toHaveLength(1);

    await expect(t.query(api.writerProfile.getMine, {})).rejects.toThrow(
      /not authenticated/i,
    );
  });

  test("clears typed provider failures when a run is retried", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(identity("retry-user"));
    await alice.mutation(api.users.ensure, {});
    const { runId } = await alice.mutation(api.documents.create, {
      draft:
        "This sufficiently detailed draft exists to verify that a failed provider run can be claimed safely for a retry.",
      genre: "motivation-statement",
    });
    expect(
      await t.mutation(internal.documents.claimRun, {
        runId,
        claimToken: "first-claim",
        executionMode: "live",
      }),
    ).toBe(true);
    const steps = await t.run(async (ctx) => {
      const run = await ctx.db.get("runs", runId);
      if (!run) throw new Error("Run missing");
      return run.steps;
    });
    await t.mutation(internal.documents.failRun, {
      runId,
      claimToken: "first-claim",
      steps,
      errorCode: "provider-quota",
      error: "Quota reached",
    });
    expect(
      await t.mutation(internal.documents.claimRun, {
        runId,
        claimToken: "second-claim",
        executionMode: "demo",
      }),
    ).toBe(true);
    const retried = await t.run(async (ctx) => await ctx.db.get("runs", runId));
    expect(retried?.errorCode).toBeUndefined();
    expect(retried?.error).toBeUndefined();
    expect(retried?.executionMode).toBe("demo");
  });
});
