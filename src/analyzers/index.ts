import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { crawl } from "./crawler.js";
import { analyzePerformance } from "./performance.js";
import { analyzeSeo } from "./seo.js";
import { analyzeDesign } from "./design.js";
import { analyzeAccessibility } from "./accessibility.js";
import { analyzeCodeQuality } from "./codeQuality.js";
import { computeOverallScore } from "../scoring/score.js";
import { newJobId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import type { AnalysisOptions, AnalysisResult, Category, CategoryResult } from "../types/index.js";

const require = createRequire(import.meta.url);
let axeSourceCache: string | null = null;

function loadAxeSource(): string {
  if (axeSourceCache) return axeSourceCache;
  const axePath = require.resolve("axe-core/axe.min.js");
  axeSourceCache = readFileSync(axePath, "utf-8");
  return axeSourceCache;
}

export async function runAnalysis(options: AnalysisOptions, timeoutMs: number): Promise<AnalysisResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const categoriesRequested = new Set(options.categories);

  const crawlResult = await crawl(options.url, {
    captureScreenshots: options.screenshots,
    timeoutMs,
    axeSource: loadAxeSource(),
  });

  const tasks: Promise<CategoryResult | null>[] = [];
  const taskLabels: Category[] = [];

  const runSafely = async (label: Category, fn: () => Promise<CategoryResult>): Promise<CategoryResult | null> => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, category: label }, "Falló el analizador");
      errors.push(`${label}: ${message}`);
      return null;
    }
  };

  if (categoriesRequested.has("performance")) {
    taskLabels.push("performance");
    tasks.push(runSafely("performance", () => analyzePerformance(crawlResult.finalUrl, crawlResult)));
  }
  if (categoriesRequested.has("seo")) {
    taskLabels.push("seo");
    tasks.push(
      runSafely("seo", () =>
        analyzeSeo({ html: crawlResult.html, finalUrl: crawlResult.finalUrl, maxLinksChecked: options.maxLinksChecked })
      )
    );
  }
  if (categoriesRequested.has("accessibility")) {
    taskLabels.push("accessibility");
    tasks.push(runSafely("accessibility", () => Promise.resolve(analyzeAccessibility(crawlResult.axeResults))));
  }
  if (categoriesRequested.has("design")) {
    taskLabels.push("design");
    tasks.push(
      runSafely("design", () =>
        Promise.resolve(
          analyzeDesign({
            computedStyles: crawlResult.computedStyles,
            viewportOverflow: crawlResult.viewportOverflow,
          })
        )
      )
    );
  }
  if (categoriesRequested.has("code_security")) {
    taskLabels.push("code_security");
    tasks.push(
      runSafely("code_security", () =>
        analyzeCodeQuality({
          html: crawlResult.html,
          finalUrl: crawlResult.finalUrl,
          responseHeaders: crawlResult.responseHeaders,
          network: crawlResult.network,
          consoleEntries: crawlResult.console,
        })
      )
    );
  }

  const settled = await Promise.all(tasks);
  const categories = settled.filter((c): c is CategoryResult => c !== null);

  const finishedAt = new Date();

  return {
    id: newJobId(),
    url: options.url,
    finalUrl: crawlResult.finalUrl,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    overallScore: computeOverallScore(categories),
    categories,
    screenshots: crawlResult.screenshots,
    errors,
  };
}
