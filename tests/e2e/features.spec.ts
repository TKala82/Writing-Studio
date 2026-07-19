import { expect, test } from "@playwright/test";

test.describe("feature surface inventory", () => {
  test("mode switcher and major studio affordances are present or gated", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();

    // Core product identity
    expect(text).toMatch(/Lede/i);

    // Either signed-in workspace or explicit auth gate
    expect(text).toMatch(/Sign in|How do you want|workspace|rewrite/i);

    // Capture which major surfaces are currently visible for the audit report.
    const probes = [
      "Blank",
      "sources",
      "draft",
      "Library",
      "Practice",
      "Delivery",
      "Rubric",
      "Voice",
      "Sign in",
    ];
    const found = probes.filter((probe) => new RegExp(probe, "i").test(text));
    expect(found.length).toBeGreaterThan(1);
    console.log("FEATURE_SURFACE_FOUND=" + JSON.stringify(found));
  });

  test("mobile viewport still shows brand and primary CTA", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByText("Lede").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i }).first()).toBeVisible();
  });
});
