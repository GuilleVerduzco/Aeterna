import { describe, expect, it } from "vitest";
import { computeOverallScore } from "../src/scoring/score.js";
import type { CategoryResult } from "../src/types/index.js";

function cat(category: CategoryResult["category"], score: number): CategoryResult {
  return { category, score, findings: [], metrics: {} };
}

describe("computeOverallScore", () => {
  it("devuelve 0 cuando no hay categorías", () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it("devuelve el score directo cuando solo hay una categoría", () => {
    expect(computeOverallScore([cat("seo", 80)])).toBe(80);
  });

  it("pondera performance más que design", () => {
    const allZeroExceptPerformance = computeOverallScore([
      cat("performance", 100),
      cat("seo", 0),
      cat("accessibility", 0),
      cat("design", 0),
      cat("code_security", 0),
    ]);
    const allZeroExceptDesign = computeOverallScore([
      cat("performance", 0),
      cat("seo", 0),
      cat("accessibility", 0),
      cat("design", 100),
      cat("code_security", 0),
    ]);
    expect(allZeroExceptPerformance).toBeGreaterThan(allZeroExceptDesign);
  });

  it("devuelve 100 cuando todas las categorías son perfectas", () => {
    const score = computeOverallScore([
      cat("performance", 100),
      cat("seo", 100),
      cat("accessibility", 100),
      cat("design", 100),
      cat("code_security", 100),
    ]);
    expect(score).toBe(100);
  });
});
