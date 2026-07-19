import { expect, test, type Page } from "@playwright/test";

const SAMPLE_DRAFT = `I want to join this AI safety fellowship because AI is developing very fast and I think it is important that it goes well. During my computer science degree, I became interested in machine learning and later completed an introductory AI safety course. I especially enjoyed the sections on evaluations and mechanistic interpretability.

Last year I built a small evaluation harness for language-model outputs as an independent project. It tested whether models followed conflicting instructions across 300 prompts. The project made me interested in how behavioural evidence can reveal hidden model tendencies, but I am still unsure which research direction would let me contribute most effectively.

The fellowship would give me the opportunity to learn from experienced researchers and improve my research skills. I am a fast learner and work well independently. In the future, I hope to conduct useful technical AI safety research and help reduce risks from advanced AI systems.`;

const PREFLIGHT_ANSWERS = [
  "My evaluation harness across 300 conflicting-instruction prompts is the strongest evidence I have so far.",
  "The fellowship's small-group mentoring and repeated project feedback would help me sharpen one useful evaluation question and design a stronger test.",
  "By the end, I want to publish a short report and a reusable test plan that other researchers can repeat or improve.",
];

async function createSignInTicket() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY missing");
  const userId =
    process.env.CLERK_DEMO_USER_ID || "user_3GeQvDosCEfnuCL23MZbW9bkrqJ";
  const response = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 3600 }),
  });
  if (!response.ok) {
    throw new Error(`Clerk sign_in_token failed: ${await response.text()}`);
  }
  const payload = (await response.json()) as { token: string };
  return payload.token;
}

async function signInWithTicket(page: Page, ticket: string) {
  await page.goto(`/?__clerk_ticket=${ticket}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const status = await page
    .evaluate(async (ticketValue) => {
      const clerk = (
        window as unknown as {
          Clerk?: {
            load: () => Promise<void>;
            user?: unknown;
            client: {
              signIn: {
                create: (args: {
                  strategy: string;
                  ticket: string;
                }) => Promise<{ status: string; createdSessionId?: string }>;
              };
            };
            setActive: (args: { session: string }) => Promise<void>;
          };
        }
      ).Clerk;
      if (!clerk) return "no-clerk";
      await clerk.load();
      if (clerk.user) return "already";
      const attempt = await clerk.client.signIn.create({
        strategy: "ticket",
        ticket: ticketValue,
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await clerk.setActive({ session: attempt.createdSessionId });
        return "signed-in";
      }
      return attempt.status;
    }, ticket)
    .catch((error: Error) => `ticket-eval-error:${error.message}`);

  if (status === "no-clerk" || String(status).startsWith("ticket-eval")) {
    const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
    if (!issuer) throw new Error(`Clerk ticket handoff failed: ${status}`);
    const hosted = `${issuer.replace(/\/$/, "")}/sign-in?__clerk_ticket=${ticket}&redirect_url=${encodeURIComponent("http://localhost:3000/")}`;
    await page.goto(hosted, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/localhost:3000/, { timeout: 60_000 }).catch(() => undefined);
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";
      const signedOut = /sign in to rewrite/i.test(text);
      const workspaceReady =
        /How do you want to begin|Choose your workspace|Preparing your private workspace/i.test(
          text,
        );
      const stillPreparing = /Preparing your private workspace/i.test(text);
      return !signedOut && workspaceReady && !stillPreparing;
    },
    { timeout: 90_000 },
  );
}

async function fillPreflight(page: Page) {
  await page.getByText(/Before the editor writes/i).waitFor({ timeout: 120_000 });
  for (let index = 0; index < 8; index += 1) {
    const textarea = page.locator("textarea").first();
    await textarea.waitFor({ state: "visible", timeout: 30_000 });
    await textarea.fill(
      PREFLIGHT_ANSWERS[index] ??
        `Additional context ${index + 1}: I can support this with concrete prior work.`,
    );
    const review = page.getByRole("button", { name: /Review answers/i });
    if (await review.count()) {
      await review.click();
      await page.waitForTimeout(400);
      break;
    }
    const next = page.getByRole("button", { name: /Save and continue|Skip/i });
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
  const direction = page.locator("button[aria-pressed]").first();
  await direction.waitFor({ state: "visible", timeout: 30_000 });
  if ((await direction.getAttribute("aria-pressed")) !== "true") {
    await direction.click();
  }
  await page.getByRole("button", { name: /Continue to editorial pass/i }).click();
}

test.describe("unsigned smoke", () => {
  test("home page renders brand and sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Lede").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i }).first()).toBeVisible();
  });
});

test.describe("signed-in critical path", () => {
  test("draft → preflight → review scorecard", async ({ page }) => {
    test.setTimeout(240_000);
    const ticket = await createSignInTicket();
    await signInWithTicket(page, ticket);

    await page.getByRole("tab", { name: /Have a draft/i }).first().click();
    await page
      .getByRole("button", { name: /Shape this draft|Use a sample/i })
      .first()
      .waitFor({ timeout: 30_000 });

    const sample = page.getByRole("button", { name: /Use a sample/i });
    if (await sample.count()) {
      await sample.click();
    } else {
      await page.locator("#draft").fill(SAMPLE_DRAFT);
    }

    await page.getByRole("button", { name: /Shape this draft/i }).click();
    await fillPreflight(page);

    await page.getByText(/Tracked changes/i).first().waitFor({ timeout: 180_000 });
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Editorial pass stopped|pipeline needs attention/i);
    expect(body).toMatch(/Rubric scorecard|Editorial record/i);
    const scoreMatch = body.match(/(\d+)%/);
    expect(scoreMatch).toBeTruthy();
  });
});
