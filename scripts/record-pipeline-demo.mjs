import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const ARTIFACTS = "/opt/cursor/artifacts";
const STAGING = "/opt/cursor/recording-staging";
const SAMPLE_DRAFT = `I want to join this AI safety fellowship because AI is developing very fast and I think it is important that it goes well. During my computer science degree, I became interested in machine learning and later completed an introductory AI safety course. I especially enjoyed the sections on evaluations and mechanistic interpretability.

Last year I built a small evaluation harness for language-model outputs as an independent project. It tested whether models followed conflicting instructions across 300 prompts. The project made me interested in how behavioural evidence can reveal hidden model tendencies, but I am still unsure which research direction would let me contribute most effectively.

The fellowship would give me the opportunity to learn from experienced researchers and improve my research skills. I am a fast learner and work well independently. In the future, I hope to conduct useful technical AI safety research and help reduce risks from advanced AI systems.`;

const PREFLIGHT_ANSWERS = [
  "My evaluation harness across 300 conflicting-instruction prompts is the strongest evidence I have so far.",
  "The fellowship's small-group mentoring and repeated project feedback would help me sharpen one useful evaluation question and design a stronger test.",
  "By the end, I want to publish a short report and a reusable test plan that other researchers can repeat or improve.",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function createSignInTicket() {
  const secret = requireEnv("CLERK_SECRET_KEY");
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
  const payload = await response.json();
  return payload.token;
}

function startScreenRecording(outputPath) {
  const args = [
    "-y",
    "-video_size",
    "1920x1200",
    "-framerate",
    "15",
    "-f",
    "x11grab",
    "-i",
    `${process.env.DISPLAY || ":1"}.0`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ];
  const proc = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  let stderr = "";
  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  return {
    stop: async () => {
      if (proc.killed || proc.exitCode !== null) return stderr;
      await new Promise((resolve) => {
        proc.once("exit", resolve);
        proc.kill("SIGINT");
        setTimeout(() => {
          if (proc.exitCode === null) proc.kill("SIGKILL");
        }, 4000);
      });
      return stderr;
    },
  };
}

async function waitForSignedIn(page) {
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

async function ensureDraftMode(page) {
  const draftMode = page.getByRole("tab", { name: /Have a draft/i });
  await draftMode.first().click();
  await page.getByRole("button", { name: /Shape this draft|Use a sample/i }).first().waitFor({
    timeout: 30_000,
  });
}

async function fillPreflight(page) {
  await page.getByText(/Before the editor writes/i).waitFor({ timeout: 120_000 });

  for (let index = 0; index < 8; index += 1) {
    const textarea = page.locator("textarea").first();
    await textarea.waitFor({ state: "visible", timeout: 30_000 });
    const answer =
      PREFLIGHT_ANSWERS[index] ??
      `Additional context ${index + 1}: I can support this with concrete prior work and will not invent missing details.`;
    await textarea.fill(answer);

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

  // Select the first editorial direction.
  const direction = page.locator("button[aria-pressed]").first();
  await direction.waitFor({ state: "visible", timeout: 30_000 });
  if ((await direction.getAttribute("aria-pressed")) !== "true") {
    await direction.click();
  }

  await page
    .getByRole("button", { name: /Continue to editorial pass/i })
    .click();
}

async function waitForPipelineComplete(page) {
  // Progress UI first.
  await page
    .getByText(/Understanding your draft|Preparing your draft|Rewriting with your rubric/i)
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => {});

  // Completion: review workspace with tracked changes / scorecard.
  await page.getByText(/Tracked changes/i).first().waitFor({ timeout: 180_000 });
  const body = await page.locator("body").innerText();
  if (/Editorial pass stopped|pipeline needs attention/i.test(body)) {
    throw new Error(`Pipeline failed:\n${body.slice(0, 1500)}`);
  }
  const scoreMatch = body.match(/Rubric scorecard[\s\S]{0,120}?(\d+)%/i);
  const score = scoreMatch ? Number(scoreMatch[1]) : Number.NaN;
  if (!Number.isFinite(score) || score < 80) {
    throw new Error(
      `Completed pipeline score ${Number.isFinite(score) ? `${score}%` : "was not found"}; expected at least 80%.`,
    );
  }
  return score;
}

async function main() {
  mkdirSync(ARTIFACTS, { recursive: true });
  mkdirSync(STAGING, { recursive: true });
  mkdirSync(join(ARTIFACTS, "screenshots"), { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const videoPath = join(STAGING, `pipeline-demo-${stamp}.mp4`);
  const finalVideoPath = join(ARTIFACTS, `pipeline-demo-80plus.mp4`);
  const logPath = join(ARTIFACTS, `pipeline-demo-${stamp}.log`);

  const ticket = await createSignInTicket();
  const recorder = startScreenRecording(videoPath);
  // Give ffmpeg a moment to attach to the display.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: [
      "--window-size=1600,1000",
      "--window-position=160,80",
      "--disable-dev-shm-usage",
      "--no-default-browser-check",
      "--disable-features=TranslateUI",
    ],
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ":1",
    },
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  const log = [];
  const note = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    log.push(line);
  };

  try {
    note("Opening Lede with Clerk sign-in ticket");
    await page.goto(`http://localhost:3000/?__clerk_ticket=${ticket}`, {
      waitUntil: "domcontentloaded",
    });

    // If ticket query param alone is not enough, accept via Clerk JS.
    await page.waitForTimeout(2000);
    const needsManualTicket = await page.evaluate(async (ticketValue) => {
      const clerk = window.Clerk;
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
    }, ticket).catch((error) => `ticket-eval-error:${error.message}`);
    note(`Clerk ticket status: ${needsManualTicket}`);

    if (needsManualTicket === "no-clerk" || String(needsManualTicket).startsWith("ticket-eval")) {
      // Fallback: hosted accounts URL then return home.
      const hosted = `${requireEnv("CLERK_JWT_ISSUER_DOMAIN")}/sign-in?__clerk_ticket=${ticket}&redirect_url=${encodeURIComponent("http://localhost:3000/")}`;
      await page.goto(hosted, { waitUntil: "domcontentloaded" });
      await page.waitForURL(/localhost:3000/, { timeout: 60_000 }).catch(() => {});
      await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    }

    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" }).catch(() => {});
    await waitForSignedIn(page);
    note("Signed in");
    await page.screenshot({
      path: join(ARTIFACTS, "screenshots", "01-signed-in.png"),
      fullPage: true,
    });

    await ensureDraftMode(page);
    note("Draft mode ready");

    // Prefer sample button, otherwise fill directly.
    const sample = page.getByRole("button", { name: /Use a sample/i });
    if (await sample.count()) {
      await sample.click();
    } else {
      await page.locator("#draft").fill(SAMPLE_DRAFT);
    }
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(ARTIFACTS, "screenshots", "02-draft-filled.png"),
      fullPage: true,
    });

    note("Submitting draft");
    await page.getByRole("button", { name: /Shape this draft/i }).click();

    note("Completing preflight interview");
    await fillPreflight(page);
    await page.screenshot({
      path: join(ARTIFACTS, "screenshots", "03-preflight-submitted.png"),
      fullPage: true,
    });

    note("Waiting for pipeline completion");
    // Capture a mid-run screenshot after progress appears.
    await page.waitForTimeout(8000);
    await page.screenshot({
      path: join(ARTIFACTS, "screenshots", "04-pipeline-running.png"),
      fullPage: true,
    });

    const score = await waitForPipelineComplete(page);
    note(`Pipeline complete with ${score}% rubric score`);
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: join(ARTIFACTS, "screenshots", "05-pipeline-complete.png"),
      fullPage: true,
    });

    // Hold on the completed review for the recording.
    await page.waitForTimeout(6000);
  } catch (error) {
    note(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    await page
      .screenshot({
        path: join(ARTIFACTS, "screenshots", "error.png"),
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  } finally {
    writeFileSync(logPath, `${log.join("\n")}\n`);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    const ffmpegLog = await recorder.stop();
    writeFileSync(join(ARTIFACTS, `pipeline-demo-${stamp}.ffmpeg.log`), ffmpegLog);
    if (existsSync(videoPath)) {
      renameSync(videoPath, finalVideoPath);
      note(`Video written to ${finalVideoPath}`);
    } else {
      note(`Video missing at ${videoPath}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
