import { auth } from "@clerk/nextjs/server";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_MARKDOWN_CHARS = 30_000;
const CONVERSION_TIMEOUT_MS = 120_000;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".csv",
  ".html",
  ".htm",
  ".epub",
  ".msg",
  ".txt",
  ".md",
  ".markdown",
]);

// The pip "user" install often leaves the markitdown exe off PATH on
// Windows, so `python -m markitdown` is tried first.
const CLI_CANDIDATES: Array<{ command: string; args: string[] }> = [
  { command: "python", args: ["-m", "markitdown"] },
  { command: "python3", args: ["-m", "markitdown"] },
  { command: "markitdown", args: [] },
];

interface ConversionResult {
  ok: boolean;
  markdown?: string;
  detail?: string;
  cliMissing?: boolean;
}

function runCli(
  command: string,
  args: string[],
): Promise<ConversionResult & { spawnFailed?: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      timeout: CONVERSION_TIMEOUT_MS,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < 4_000) stderr += chunk;
    });
    child.on("error", () => {
      resolve({ ok: false, spawnFailed: true });
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, markdown: stdout });
        return;
      }
      // "No module named markitdown" means the interpreter exists but the
      // package is not installed; report it as a missing-CLI condition.
      const moduleMissing = stderr.includes("No module named");
      resolve({
        ok: false,
        spawnFailed: moduleMissing,
        detail: stderr.trim().split(/\r?\n/).slice(-3).join(" "),
      });
    });
  });
}

async function convertFile(filePath: string): Promise<ConversionResult> {
  let lastDetail: string | undefined;
  for (const candidate of CLI_CANDIDATES) {
    const result = await runCli(candidate.command, [
      ...candidate.args,
      filePath,
    ]);
    if (result.ok) return result;
    if (!result.spawnFailed) {
      return { ok: false, detail: result.detail };
    }
    lastDetail = result.detail;
  }
  return { ok: false, cliMissing: true, detail: lastDetail };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to convert resources" },
      { status: 401 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach a file to convert" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Files must be between 1 byte and 15 MB" },
      { status: 400 },
    );
  }
  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      {
        error: `Unsupported file type "${extension || "unknown"}". Supported: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      },
      { status: 400 },
    );
  }

  let tempDir: string | null = null;
  try {
    tempDir = await mkdtemp(path.join(tmpdir(), "lede-teach-"));
    // Only the extension from the upload is reused; the basename is fixed so
    // untrusted filenames never reach the shell or filesystem semantics.
    const tempFile = path.join(tempDir, `resource${extension}`);
    await writeFile(tempFile, Buffer.from(await file.arrayBuffer()));

    const result = await convertFile(tempFile);
    if (!result.ok) {
      if (result.cliMissing) {
        return NextResponse.json(
          {
            error:
              'MarkItDown is not installed on this machine. Run: pip install "markitdown[all]" (requires Python 3.10+), then retry.',
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error: `Could not convert this file to Markdown${result.detail ? ` (${result.detail})` : ""}`,
        },
        { status: 422 },
      );
    }

    const markdown = (result.markdown ?? "").trim();
    if (markdown.length === 0) {
      return NextResponse.json(
        { error: "The file converted to empty text — try another resource" },
        { status: 422 },
      );
    }
    const truncated = markdown.length > MAX_MARKDOWN_CHARS;
    return NextResponse.json({
      markdown: truncated ? markdown.slice(0, MAX_MARKDOWN_CHARS) : markdown,
      truncated,
    });
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => null);
    }
  }
}
