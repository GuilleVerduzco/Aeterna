import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";
import { parseCssColor, flattenOnBackground, contrastRatio, evaluateWcagContrast } from "../lib/contrast.js";
import type { CrawlResult } from "./crawler.js";

interface DesignOptions {
  computedStyles: CrawlResult["computedStyles"];
  viewportOverflow: CrawlResult["viewportOverflow"];
}

function pushFinding(
  findings: Finding[],
  severity: Severity,
  slug: string,
  title: string,
  description: string,
  recommendation: string,
  extra?: Partial<Finding>
) {
  findings.push({
    id: newFindingId("design", slug),
    category: "design",
    severity,
    title,
    description,
    recommendation,
    ...extra,
  });
}

const FALLBACK_PAGE_BACKGROUND = { r: 255, g: 255, b: 255, a: 1 };

function isLargeText(fontSizePx: number, fontWeight: string): boolean {
  const weightNum = Number(fontWeight) || (fontWeight === "bold" ? 700 : 400);
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && weightNum >= 700);
}

function normalizeFontFamily(raw: string): string {
  return raw.split(",")[0]?.replace(/["']/g, "").trim() ?? raw;
}

export function analyzeDesign(opts: DesignOptions): CategoryResult {
  const { computedStyles, viewportOverflow } = opts;
  const findings: Finding[] = [];

  const distinctFonts = new Set(computedStyles.fontsUsed.map(normalizeFontFamily));
  if (distinctFonts.size > 4) {
    pushFinding(
      findings,
      "medium",
      "font-family-sprawl",
      "Demasiadas familias tipográficas distintas",
      `Se detectaron ${distinctFonts.size} familias tipográficas diferentes: ${Array.from(distinctFonts).slice(0, 6).join(", ")}...`,
      "Limita el sistema tipográfico a 2-3 familias (ej. una para títulos, una para cuerpo) para reforzar coherencia visual."
    );
  }

  const distinctColors = new Set(
    computedStyles.colorsUsed.filter((c) => {
      const parsed = parseCssColor(c);
      return parsed && parsed.a > 0;
    })
  );
  if (distinctColors.size > 20) {
    pushFinding(
      findings,
      "low",
      "color-palette-sprawl",
      "Paleta de color muy amplia",
      `Se detectaron ${distinctColors.size} colores distintos en texto/fondos de los elementos muestreados.`,
      "Consolida la paleta en un set de tokens de color definidos (primarios, secundarios, neutros, acento) para mayor consistencia de marca."
    );
  }

  let contrastFailures = 0;
  let contrastChecked = 0;
  const failureSamples: { text: string; ratio: number; color: string; backgroundColor: string }[] = [];

  for (const sample of computedStyles.textSamples) {
    const fg = parseCssColor(sample.color);
    let bg = parseCssColor(sample.backgroundColor);
    if (!fg) continue;
    if (!bg || bg.a === 0) bg = FALLBACK_PAGE_BACKGROUND;
    const flattenedFg = flattenOnBackground(fg, bg);
    const ratio = contrastRatio(flattenedFg, bg);
    const fontSizePx = parseFloat(sample.fontSize) || 16;
    const large = isLargeText(fontSizePx, sample.fontWeight);
    const verdict = evaluateWcagContrast(ratio, large);
    contrastChecked++;
    if (!verdict.passesAA) {
      contrastFailures++;
      if (failureSamples.length < 10) {
        failureSamples.push({
          text: sample.text,
          ratio: Math.round(ratio * 100) / 100,
          color: sample.color,
          backgroundColor: sample.backgroundColor,
        });
      }
    }
  }

  if (contrastFailures > 0) {
    const ratio = contrastChecked > 0 ? contrastFailures / contrastChecked : 0;
    pushFinding(
      findings,
      ratio > 0.25 ? "high" : "medium",
      "contrast-aa-fail",
      `${contrastFailures} elemento(s) de texto no cumplen contraste WCAG AA`,
      `De ${contrastChecked} muestras de texto analizadas, ${contrastFailures} tienen contraste insuficiente contra su fondo (nota: el fondo se asume blanco cuando es transparente, verificar manualmente en esos casos).`,
      "Ajusta los colores de texto/fondo para cumplir un contraste mínimo de 4.5:1 (texto normal) o 3:1 (texto grande), según WCAG 2.1 AA.",
      { evidence: { samples: failureSamples } }
    );
  }

  const overflowNames = ["mobile", "tablet", "desktop"] as const;
  viewportOverflow.forEach((vp, idx) => {
    if (vp.hasHorizontalOverflow) {
      pushFinding(
        findings,
        "high",
        `overflow-${overflowNames[idx] ?? idx}`,
        `Desbordamiento horizontal en viewport ${overflowNames[idx] ?? idx}`,
        `El ancho de scroll (${vp.scrollWidth}px) excede el ancho visible (${vp.clientWidth}px).`,
        "Revisa elementos con ancho fijo, imágenes sin max-width:100% o contenedores que no respetan el viewport."
      );
    }
  });

  const weight: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "design",
    score,
    findings,
    metrics: {
      distinctFontFamilies: distinctFonts.size,
      distinctColors: distinctColors.size,
      contrastSamplesChecked: contrastChecked,
      contrastFailures,
      viewportsWithOverflow: viewportOverflow.filter((v) => v.hasHorizontalOverflow).length,
    },
  };
}
