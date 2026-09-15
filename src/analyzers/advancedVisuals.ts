import type { Page } from "playwright";
import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";
import type { ThemeEmulationResult } from "./themeEmulation.js";
import type { WebVitalsMetrics, ImageAnalysisResult } from "./webVitalsAnalyzer.js";
import { captureThemeVariants, detectThemePreferences } from "./themeEmulation.js";
import { captureWebVitals, analyzeImages, analyzeAnimationPerformance } from "./webVitalsAnalyzer.js";

interface AdvancedVisualsOptions {
  page: Page;
  captureThemeVariants: boolean;
  captureWebVitals: boolean;
  analyzeImages: boolean;
}

export interface AdvancedVisualsData {
  themeEmulation?: ThemeEmulationResult & { preferences: Awaited<ReturnType<typeof detectThemePreferences>> };
  webVitals?: WebVitalsMetrics;
  imageAnalysis?: ImageAnalysisResult;
  animationAnalysis?: Awaited<ReturnType<typeof analyzeAnimationPerformance>>;
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

export async function captureAdvancedVisuals(opts: AdvancedVisualsOptions): Promise<AdvancedVisualsData> {
  const data: AdvancedVisualsData = {};

  if (opts.captureThemeVariants) {
    try {
      const themeResult = await captureThemeVariants(opts.page);
      const preferences = await detectThemePreferences(opts.page);
      data.themeEmulation = { ...themeResult, preferences };
    } catch (err) {
      console.error("Error capturing theme variants:", err);
    }
  }

  if (opts.captureWebVitals) {
    try {
      const vitals = await captureWebVitals(opts.page);
      data.webVitals = vitals;
    } catch (err) {
      console.error("Error capturing web vitals:", err);
    }
  }

  if (opts.analyzeImages) {
    try {
      const imageAnalysis = await analyzeImages(opts.page);
      data.imageAnalysis = imageAnalysis;
      const animationAnalysis = await analyzeAnimationPerformance(opts.page);
      data.animationAnalysis = animationAnalysis;
    } catch (err) {
      console.error("Error analyzing images:", err);
    }
  }

  return data;
}

export function analyzeAdvancedVisuals(data: AdvancedVisualsData): CategoryResult {
  const findings: Finding[] = [];

  // Análisis de tema
  if (data.themeEmulation?.preferences) {
    const prefs = data.themeEmulation.preferences;
    if (!prefs.usesMediaQueryDarkMode && !prefs.usesColorSchemeCSS) {
      pushFinding(
        findings,
        "medium",
        "no-theme-support",
        "Sitio no tiene soporte para modo oscuro",
        "El sitio no implementa media queries o CSS variables para soportar el modo oscuro preferido por usuarios.",
        "Implementa soporte para `prefers-color-scheme: dark` usando media queries o CSS variables para mejorar la experiencia del usuario."
      );
    }
  }

  // Análisis de imágenes
  if (data.imageAnalysis) {
    const { totalImages, imagesWithoutAlt, imagesWithoutSrcSet, legacyFormatImages } = data.imageAnalysis;

    if (imagesWithoutAlt > 0) {
      const ratio = totalImages > 0 ? (imagesWithoutAlt / totalImages) * 100 : 0;
      pushFinding(
        findings,
        ratio > 20 ? "high" : "medium",
        "images-missing-alt",
        `${imagesWithoutAlt} imagen(es) sin atributo alt`,
        `De ${totalImages} imágenes analizadas, ${imagesWithoutAlt} carecen de texto alternativo.`,
        "Añade atributos alt descriptivos a todas las imágenes para mejorar accesibilidad y SEO.",
        { evidence: { imagesWithoutAlt, total: totalImages } }
      );
    }

    if (legacyFormatImages > 0) {
      pushFinding(
        findings,
        "medium",
        "legacy-image-formats",
        `${legacyFormatImages} imagen(es) usan formatos obsoletos`,
        `Se detectaron ${legacyFormatImages} imágenes en JPG/PNG/GIF en lugar de WebP o AVIF.`,
        "Convierte imágenes a WebP o AVIF para reducir tamaño sin perder calidad."
      );
    }

    if (imagesWithoutSrcSet > 0 && totalImages > 10) {
      pushFinding(
        findings,
        "low",
        "images-no-srcset",
        `${imagesWithoutSrcSet} imagen(es) sin srcset para responsive`,
        "Varias imágenes no tienen srcset para optimizar la carga en diferentes dispositivos.",
        "Implementa srcset para servir diferentes resoluciones según el dispositivo del usuario."
      );
    }
  }

  // Análisis de Web Vitals
  if (data.webVitals) {
    const vitals = data.webVitals;

    if (vitals.lcp !== null && vitals.lcp > 2500) {
      pushFinding(
        findings,
        vitals.lcp > 4000 ? "high" : "medium",
        "lcp-slow",
        `Largest Contentful Paint lento (${vitals.lcp}ms)`,
        `El LCP está en ${vitals.lcp}ms, exceeding the "good" threshold of 2500ms.`,
        "Optimiza imágenes, difiere JavaScript no crítico, y mejora el servidor de origen."
      );
    }

    if (vitals.cls !== null && vitals.cls > 0.1) {
      pushFinding(
        findings,
        "high",
        "cls-high",
        `Cumulative Layout Shift elevado (${vitals.cls})`,
        `El CLS está en ${vitals.cls}, exceeding the "good" threshold of 0.1.`,
        "Especifica dimensiones de imágenes/vídeos, evita insertar contenido dinámico, usa transform para animaciones."
      );
    }

    if (vitals.fcp !== null && vitals.fcp > 1800) {
      pushFinding(
        findings,
        "medium",
        "fcp-slow",
        `First Contentful Paint lento (${vitals.fcp}ms)`,
        `El FCP está en ${vitals.fcp}ms, exceeding the "good" threshold of 1800ms.`,
        "Reduce bloqueantes de renderizado, minifica CSS/JS, precarga recursos críticos."
      );
    }

    if (vitals.ttfb !== null && vitals.ttfb > 600) {
      pushFinding(
        findings,
        "medium",
        "ttfb-slow",
        `Time to First Byte lento (${vitals.ttfb}ms)`,
        `El TTFB está en ${vitals.ttfb}ms, exceeding the "good" threshold of 600ms.`,
        "Mejora la velocidad del servidor, usa CDN, optimiza la base de datos, atiende a más regiones."
      );
    }
  }

  // Análisis de animaciones
  if (data.animationAnalysis?.hasAnimations && data.animationAnalysis.reducedMotionPreference) {
    pushFinding(
      findings,
      "info",
      "animations-with-reduced-motion",
      "Sitio tiene animaciones pero no respeta prefers-reduced-motion",
      "El navegador indica preferencia por movimiento reducido, pero el sitio continúa animando.",
      "Implementa `prefers-reduced-motion: reduce` media query para deshabilitar animaciones cuando sea preferido."
    );
  }

  const weight: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "design",
    score,
    findings,
    metrics: {
      source: "advanced-visuals-analyzer",
      themeSupport: data.themeEmulation?.preferences ? "detected" : "not-analyzed",
      webVitalsDetected: !!data.webVitals,
      totalImages: data.imageAnalysis?.totalImages ?? 0,
      animationsCount: data.animationAnalysis?.animationCount ?? 0,
    },
  };
}
