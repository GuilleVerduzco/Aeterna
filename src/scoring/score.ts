import type { Category, CategoryResult } from "../types/index.js";

const CATEGORY_WEIGHTS: Record<Category, number> = {
  performance: 0.25,
  seo: 0.2,
  accessibility: 0.2,
  design: 0.15,
  code_security: 0.2,
};

export function computeOverallScore(categories: CategoryResult[]): number {
  if (categories.length === 0) return 0;

  const totalWeight = categories.reduce((sum, c) => sum + CATEGORY_WEIGHTS[c.category], 0);
  if (totalWeight === 0) return 0;

  const weightedSum = categories.reduce((sum, c) => sum + c.score * CATEGORY_WEIGHTS[c.category], 0);
  return Math.round(weightedSum / totalWeight);
}
