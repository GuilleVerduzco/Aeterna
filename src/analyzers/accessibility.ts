import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";

interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

interface AxeRule {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeRunResult {
  violations: AxeRule[];
  incomplete: AxeRule[];
}

const IMPACT_TO_SEVERITY: Record<string, Severity> = {
  critical: "critical",
  serious: "high",
  moderate: "medium",
  minor: "low",
};

export function analyzeAccessibility(axeResults: unknown): CategoryResult {
  const findings: Finding[] = [];
  const result = axeResults as Partial<AxeRunResult> & { error?: string };

  if (!result || result.error) {
    findings.push({
      id: newFindingId("accessibility", "axe-run-failed"),
      category: "accessibility",
      severity: "info",
      title: "No se pudo ejecutar el análisis automático de accesibilidad",
      description:
        result?.error ?? "axe-core no devolvió resultados para esta página.",
      recommendation:
        "Reintenta el análisis; si persiste, revisa si la página bloquea la inyección de scripts (CSP estricta).",
    });
    return { category: "accessibility", score: 0, findings, metrics: { ran: false } };
  }

  const violations = result.violations ?? [];

  for (const rule of violations) {
    const severity = IMPACT_TO_SEVERITY[rule.impact ?? "minor"] ?? "medium";
    findings.push({
      id: newFindingId("accessibility", rule.id),
      category: "accessibility",
      severity,
      title: rule.help,
      description: rule.description,
      recommendation: `Corrige los ${rule.nodes.length} elemento(s) afectados. Referencia: ${rule.helpUrl}`,
      target: rule.nodes[0]?.target?.join(" ") ?? undefined,
      evidence: {
        affectedElements: rule.nodes.length,
        sample: rule.nodes.slice(0, 3).map((n) => ({ html: n.html, failureSummary: n.failureSummary })),
        helpUrl: rule.helpUrl,
      },
    });
  }

  const weight: Record<Severity, number> = { critical: 30, high: 18, medium: 8, low: 3, info: 0 };
  const penalty = violations.reduce((sum, rule) => {
    const sev = IMPACT_TO_SEVERITY[rule.impact ?? "minor"] ?? "medium";
    return sum + weight[sev] * Math.min(rule.nodes.length, 5);
  }, 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "accessibility",
    score,
    findings,
    metrics: {
      ran: true,
      violationRules: violations.length,
      violationNodes: violations.reduce((s, r) => s + r.nodes.length, 0),
      incompleteRules: result.incomplete?.length ?? 0,
    },
  };
}
