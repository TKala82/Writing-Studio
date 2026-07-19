import { expect, test, type Page } from "@playwright/test";

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
  return ((await response.json()) as { token: string }).token;
}

async function signIn(page: Page, ticket: string) {
  await page.goto(`/?__clerk_ticket=${ticket}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(async (ticketValue) => {
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
    if (!clerk) return;
    await clerk.load();
    if (clerk.user) return;
    const attempt = await clerk.client.signIn.create({
      strategy: "ticket",
      ticket: ticketValue,
    });
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await clerk.setActive({ session: attempt.createdSessionId });
    }
  }, ticket);
  await page.goto("/");
  await page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    return (
      !/sign in to rewrite/i.test(text) &&
      /How do you want to begin|Have a draft/i.test(text) &&
      !/Preparing your private workspace/i.test(text)
    );
  }, { timeout: 90_000 });
}

async function completeDemoPipeline(page: Page) {
  await page.getByRole("tab", { name: /Have a draft/i }).first().click();
  const sample = page.getByRole("button", { name: /Use a sample/i });
  if (await sample.count()) await sample.click();
  await page.getByRole("button", { name: /Shape this draft/i }).click();
  await page.getByText(/Before the editor writes/i).waitFor({ timeout: 120_000 });
  for (let i = 0; i < 6; i += 1) {
    const textarea = page.locator("textarea").first();
    if (!(await textarea.isVisible().catch(() => false))) break;
    await textarea.fill(`Concrete answer ${i + 1} backed by prior evaluation work.`);
    const review = page.getByRole("button", { name: /Review answers/i });
    if (await review.count()) {
      await review.click();
      break;
    }
    const next = page.getByRole("button", { name: /Save and continue|Skip/i });
    if (await next.count()) await next.click();
  }
  const direction = page.locator("button[aria-pressed]").first();
  if (await direction.count()) {
    if ((await direction.getAttribute("aria-pressed")) !== "true") await direction.click();
  }
  await page.getByRole("button", { name: /Continue to editorial pass/i }).click();
  await page.getByText(/Tracked changes/i).first().waitFor({ timeout: 180_000 });
}

test.describe("post-review feature probes", () => {
  test("review workspace exposes delivery, practice, save, and scorecard", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const ticket = await createSignInTicket();
    await signIn(page, ticket);
    await completeDemoPipeline(page);

    const body = await page.locator("body").innerText();
    const probes = {
      scorecard: /Rubric scorecard|Editorial record/i.test(body),
      trackedChanges: /Tracked changes/i.test(body),
      readiness: /Readiness|submission/i.test(body),
      delivery: /Delivery|briefing|coach/i.test(body),
      practice: /Practice|interview|arena/i.test(body),
      save: /Save result|Saved|Preview only/i.test(body),
    };
    console.log("POST_REVIEW_PROBES=" + JSON.stringify(probes));

    expect(probes.scorecard).toBeTruthy();
    expect(probes.trackedChanges).toBeTruthy();
    expect(probes.save).toBeTruthy();

    // Soft expectations recorded even if absent — failures captured via audit report.
    if (!probes.delivery) {
      test.info().annotations.push({
        type: "missing-feature",
        description: "Delivery briefing controls not visible after review",
      });
    }
    if (!probes.practice) {
      test.info().annotations.push({
        type: "missing-feature",
        description: "Practice arena controls not visible after review",
      });
    }
    if (!probes.readiness) {
      test.info().annotations.push({
        type: "missing-feature",
        description: "Readiness report not visible after review",
      });
    }
  });

  test("sources mode shows ingest affordances", async ({ page }) => {
    test.setTimeout(120_000);
    const ticket = await createSignInTicket();
    await signIn(page, ticket);
    const sourcesTab = page.getByRole("tab", { name: /sources|From sources/i }).first();
    await sourcesTab.click();
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/paste|url|upload|PDF|source|YouTube/i);
  });

  test("blank mode shows ideation starter", async ({ page }) => {
    test.setTimeout(120_000);
    const ticket = await createSignInTicket();
    await signIn(page, ticket);
    const blankTab = page.getByRole("tab", { name: /Blank|blank page|From scratch/i }).first();
    await blankTab.click();
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/idea|interview|start|blank|compose|purpose/i);
  });

  test("accept-all and reject-all update tracked decisions", async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, await createSignInTicket());
    await completeDemoPipeline(page);

    await page.getByRole("button", { name: "Accept all" }).click();
    await expect(page.getByText(/[1-9]\d* accepted/).first()).toBeVisible();

    await page.getByRole("button", { name: "Reject all" }).click();
    await expect(page.getByText(/[1-9]\d* rejected/).first()).toBeVisible();
  });

  test("source desk adds and removes pasted material", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, await createSignInTicket());
    await page
      .getByRole("tab", { name: /sources|From sources/i })
      .first()
      .click();

    const removeButtons = page.getByRole("button", {
      name: /Remove Pasted source/i,
    });
    const before = await removeButtons.count();
    await page
      .getByPlaceholder(/Paste source text/i)
      .fill(
        "This evidence pack records a reproducible evaluation across three hundred prompts, including the method, observed failures, and limitations.",
      );
    await page.getByRole("button", { name: /Add to source desk/i }).click();
    await expect(removeButtons).toHaveCount(before + 1, { timeout: 120_000 });
    await removeButtons.last().click();
    await expect(removeButtons).toHaveCount(before, { timeout: 30_000 });
  });

  test("delivery room builds a demo briefing", async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, await createSignInTicket());
    await completeDemoPipeline(page);

    await page.getByRole("button", { name: /Prepare to deliver/i }).click();
    await expect(page.getByText("Delivery room")).toBeVisible();
    await page.getByRole("button", { name: /Build my briefing/i }).click();
    await expect(page.getByText("Spoken spine")).toBeVisible();
    await expect(page.getByText("Questions to rehearse")).toBeVisible();
  });
});
