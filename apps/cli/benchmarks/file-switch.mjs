// Run after pnpm build:cli: node apps/cli/benchmarks/file-switch.mjs
// Standalone benchmark, deliberately outside the functional e2e suite.
/* global window, document, localStorage, performance, MutationObserver, requestAnimationFrame, setTimeout, clearTimeout, fetch, URL */
import express from "express";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const variant = process.env.BENCH_VARIANT ?? "baseline";
const output = path.join(
  root,
  "review-artifacts/file-switch",
  variant === "baseline" ? "" : variant,
);
const extension = variant === "plain" ? "txt" : "ts";
await mkdir(output, { recursive: true });
const app = express();
app.use(express.static(path.join(root, "apps/cli/dist/ui")));
const server = await new Promise((resolve) => {
  const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
});
const browser = await chromium.launch({ headless: true });
const results = [];
const repeats = Number(process.env.BENCH_REPEATS ?? 12);
const scenarios = [
  { name: "small", lines: 100, files: 40 },
  { name: "medium", lines: 1000, files: 40 },
  { name: "large", lines: 5000, files: 40 },
  { name: "wide-tree", lines: 100, files: 400 },
];
const liveURL = process.env.BENCH_URL;
if (liveURL) {
  const session = await (await fetch(new URL("/api/session", liveURL))).json();
  const targets = session.diff.files
    .filter((f) => !f.isBinaryOrElided && f.hunks.length)
    .map((f) => ({
      path: f.path,
      lines: f.hunks.reduce((n, h) => n + h.lines.length, 0),
      lastRow: f.hunks.at(-1).lines.at(-1).content,
    }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 2);
  if (targets.length < 2) throw new Error("Live benchmark needs two text files");
  scenarios.splice(0, scenarios.length, {
    name: "live",
    files: session.diff.files.length,
    targets,
  });
}

function fixture({ lines, files }, extension = "ts") {
  return {
    context: {
      source: "local",
      title: "File switch benchmark",
      description: "",
      baseRef: "main",
      headRef: "bench",
    },
    sessionKey: "benchmark",
    diffHash: "benchmark",
    settings: { provider: "anthropic", model: "unused", hasKey: false },
    commits: [],
    totalCommits: 0,
    scopes: [],
    selectedScope: "branch",
    diff: {
      files: Array.from({ length: files }, (_, f) => {
        const filePath = `file-${String(f).padStart(3, "0")}.${extension}`;
        return {
          path: filePath,
          status: "modified",
          isBinaryOrElided: false,
          hunks: [
            {
              id: `${filePath}#0`,
              header: `@@ -1,${lines} +1,${lines} @@`,
              oldStart: 1,
              oldLines: lines,
              newStart: 1,
              newLines: lines,
              lines: Array.from({ length: lines }, (_, i) => ({
                type: i % 5 === 0 ? "del" : i % 5 === 1 ? "add" : "context",
                content: `export const item${i} = { name: "file${f}", enabled: true, count: ${i} }; // row${i}`,
                ...(i % 5 !== 1 ? { oldLine: i + 1 } : {}),
                ...(i % 5 !== 0 ? { newLine: i + 1 } : {}),
              })),
            },
          ],
        };
      }),
    },
  };
}

async function switchFile(page, filePath, lastRow) {
  // Capture an actual trusted click in the browser. Playwright's actionability
  // checks and protocol round trips are outside the measured interval.
  await page.evaluate(
    ({ filePath, lastRow }) => {
      window.benchDone = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Diff did not render")), 30000);
        const click = (event) => {
          if (event.target.closest(`[data-testid="review-file-${filePath}"]`) == null) return;
          document.removeEventListener("click", click, true);
          const start = performance.now();
          const code = document.querySelector('[data-testid="code-col"]');
          const observer = new MutationObserver(() => {
            const title = code.querySelector('[data-testid="diff-unit-title"]');
            if (title?.textContent !== filePath || !code.textContent.includes(lastRow)) return;
            observer.disconnect();
            const commit = performance.now() - start;
            requestAnimationFrame(() =>
              requestAnimationFrame(async () => {
                const paint = performance.now() - start;
                // Deferred tokenization is distinct from the first readable paint.
                const highlighted = () =>
                  [
                    ...code.querySelectorAll(
                      '[data-testid="diff-view-unified"], [data-testid="diff-view-split"]',
                    ),
                  ].every((hunk) => hunk.dataset.highlightState !== "pending");
                if (!highlighted())
                  await new Promise((ready) => {
                    const highlighting = new MutationObserver(() => {
                      if (!highlighted()) return;
                      highlighting.disconnect();
                      ready();
                    });
                    highlighting.observe(code, { subtree: true, attributes: true });
                  });
                await new Promise((ready) =>
                  requestAnimationFrame(() => requestAnimationFrame(ready)),
                );
                const highlightPaint = performance.now() - start;
                await Promise.all(
                  code.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})),
                );
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    clearTimeout(timer);
                    resolve({ commit, paint, highlightPaint, settled: performance.now() - start });
                  }),
                );
              }),
            );
          });
          observer.observe(code, { childList: true, subtree: true, characterData: true });
        };
        document.addEventListener("click", click, true);
      });
    },
    { filePath, lastRow },
  );
  await page.getByTestId(`review-file-${filePath}`).click();
  return page.evaluate(() => window.benchDone);
}

try {
  for (const scenario of scenarios.filter(
    (s) => !process.env.BENCH_SCENARIO || s.name === process.env.BENCH_SCENARIO,
  ))
    for (const mode of process.env.BENCH_MODE ? [process.env.BENCH_MODE] : ["unified", "split"])
      for (const cpu of process.env.BENCH_CPU ? [Number(process.env.BENCH_CPU)] : [1, 4]) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: variant === "reduced-motion" ? "reduce" : "no-preference",
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
        await cdp.send("Performance.enable");
        await page.addInitScript(
          (mode) => localStorage.setItem("guidedReview.diffViewMode", mode),
          mode,
        );
        if (!liveURL)
          await page.route("**/api/session", (route) =>
            route.fulfill({ json: fixture(scenario, extension) }),
          );
        await page.route("**/api/diff-status", (route) =>
          route.fulfill({ json: { changed: false } }),
        );
        await page.goto(liveURL ?? `http://127.0.0.1:${server.address().port}`);
        await page.getByTestId("diff-file-header").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const metrics = async () =>
          Object.fromEntries(
            (await cdp.send("Performance.getMetrics")).metrics.map(({ name, value }) => [
              name,
              value,
            ]),
          );
        const samples = [];
        for (let i = 0; i < repeats + 2; i++) {
          const target = scenario.targets?.[i % 2];
          const filePath =
            target?.path ?? `file-${String(1 + (i % 2)).padStart(3, "0")}.${extension}`;
          const before = await metrics();
          const timing = await switchFile(
            page,
            filePath,
            target?.lastRow ?? `row${scenario.lines - 1}`,
          );
          const after = await metrics();
          samples.push({
            filePath,
            ...timing,
            task: (after.TaskDuration - before.TaskDuration) * 1000,
            layout: (after.LayoutDuration - before.LayoutDuration) * 1000,
            style: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
          });
        }
        // Separate profile: profiler overhead does not affect timing samples.
        if (scenario.name === "large" && mode === "unified" && cpu === 1) {
          await cdp.send("Profiler.enable");
          await cdp.send("Profiler.start");
          await switchFile(page, `file-003.${extension}`, `row${scenario.lines - 1}`);
          const { profile } = await cdp.send("Profiler.stop");
          await writeFile(path.join(output, "large-unified.cpuprofile"), JSON.stringify(profile));
        }
        const summary = {};
        for (const key of [
          "commit",
          "paint",
          "highlightPaint",
          "settled",
          "task",
          "layout",
          "style",
        ]) {
          const sorted = samples
            .slice(2)
            .map((s) => s[key])
            .sort((a, b) => a - b);
          summary[key] = {
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
          };
        }
        const result = { ...scenario, mode, cpu, first: samples[0], summary, samples };
        results.push(result);
        console.log(JSON.stringify({ scenario: scenario.name, mode, cpu, summary }));
        await context.close();
      }
} finally {
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        variant,
        browser: browser.version(),
        platform: `${os.platform()} ${os.arch()}`,
        cpu: os.cpus()[0]?.model,
        repeats,
        results,
      },
      null,
      2,
    ),
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
