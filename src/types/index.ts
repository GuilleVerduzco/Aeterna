export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Category =
  | "performance"
  | "seo"
  | "accessibility"
  | "design"
  | "code_security";

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  /** Elemento, URL o selector afectado, si aplica */
  target?: string;
  /** Evidencia cruda (valor medido, snippet, etc.) */
  evidence?: Record<string, unknown>;
}

export interface CategoryResult {
  category: Category;
  score: number; // 0-100
  findings: Finding[];
  metrics: Record<string, unknown>;
}

export interface ViewportScreenshot {
  viewport: "mobile" | "tablet" | "desktop";
  width: number;
  height: number;
  base64Png: string;
}

export interface AnalysisOptions {
  url: string;
  categories: Category[];
  screenshots: boolean;
  maxLinksChecked: number;
}

export interface AnalysisResult {
  id: string;
  url: string;
  finalUrl: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  overallScore: number;
  categories: CategoryResult[];
  screenshots: ViewportScreenshot[];
  errors: string[];
}

export type AnalysisEvent =
  | { type: "crawl_started" }
  | { type: "crawl_completed"; finalUrl: string; screenshots: ViewportScreenshot[] }
  | { type: "category_completed"; result: CategoryResult }
  | { type: "category_failed"; category: Category; error: string }
  | { type: "job_completed"; result: AnalysisResult }
  | { type: "job_failed"; error: string };

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  options: AnalysisOptions;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: AnalysisResult;
  error?: string;
}

export const ALL_CATEGORIES: Category[] = [
  "performance",
  "seo",
  "accessibility",
  "design",
  "code_security",
];
