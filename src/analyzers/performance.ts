import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import type { CrawlResult, NetworkEntry } from "./crawler.js";

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
    id: newFindingId("performance", slug),
    category: "performance",
    severity,
    title,
    description,
    recommendation,
    ...extra,
  });
}

interface PsiAudit {
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

interface PsiResponse {
  lighthouseResult?: {
    categories: { performance?: { score: number } };
    audits: Record<string, PsiAudit>;
  };
  loadingExperience?: {
    metrics?: Record<string, { percentile: number; category: string }>;
  };
}

const OPPORTUNITY_AUDITS = [
  "render-blocking-resources",
  "unused-css-rules",
  "unused-javascript",
  "modern-image-formats",
  "offscreen-images",
  "unminified-javascript",
  "unminified-css",
  "efficient-animated-content",
  "uses-text-compression",
  "server-response-time",
];

async function runGooglePageSpeedInsights(url: string): Promise<CategoryResult | null> {
  if (!config.googlePageSpeedApiKey) return null;

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", config.googlePageSpeedApiKey);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let data: PsiResponse;
  try {
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Google PageSpeed Insights devolvió un error, usando fallback local");
      return null;
    }
    data = (await res.json()) as PsiResponse;
  } catch (err) {
    logger.warn({ err }, "Fallo al consultar Google PageSpeed Insights, usando fallback local");
    return null;
  } finally {
    clearTimeout(timer);
  }

  const lh = data.lighthouseResult;
  if (!lh) return null;

  const findings: Finding[] = [];
  const perfScore = Math.round((lh.categories.performance?.score ?? 0) * 100);

  const cwv = data.loadingExperience?.metrics ?? {};
  const metricLabels: Record<string, string> = {
    LARGEST_CONTENTFUL_PAINT_MS: "Largest Contentful Paint (LCP)",
    CUMULATIVE_LAYOUT_SHIFT_SCORE: "Cumulative Layout Shift (CLS)",
    INTERACTION_TO_NEXT_PAINT: "Interaction to Next Paint (INP)",
    FIRST_CONTENTFUL_PAINT_MS: "First Contentful Paint (FCP)",
  };
  for (const [key, label] of Object.entries(metricLabels)) {
    const metric = cwv[key];
    if (metric && metric.category !== "FAST" && metric.category !== "AVERAGE") {
      pushFinding(
        findings,
        "high",
        `cwv-${key.toLowerCase()}`,
        `${label} en rango "pobre" (datos de campo de Google CrUX)`,
        `El percentil 75 de usuarios reales experimenta un valor de ${metric.percentile} en esta métrica, categorizado como '${metric.category}'.`,
        "Prioriza optimizar esta métrica: revisa las oportunidades de Lighthouse relacionadas (imágenes, render-blocking, layout shifts)."
      );
    } else if (metric && metric.category === "AVERAGE") {
      pushFinding(
        findings,
        "medium",
        `cwv-${key.toLowerCase()}-average`,
        `${label} en rango "necesita mejora"`,
        `El percentil 75 de usuarios reales experimenta un valor de ${metric.percentile}, categorizado como '${metric.category}'.`,
        "Hay margen de mejora en esta métrica antes de alcanzar el umbral 'bueno' de Core Web Vitals."
      );
    }
  }

  for (const auditId of OPPORTUNITY_AUDITS) {
    const audit = lh.audits[auditId];
    if (audit && audit.score !== null && audit.score < 0.9) {
      pushFinding(
        findings,
        audit.score < 0.5 ? "high" : "medium",
        `lh-${auditId}`,
        audit.title,
        audit.description.replace(/\[.*?\]\(.*?\)/g, "").trim(),
        `Revisa la auditoría de Lighthouse "${audit.title}"${audit.displayValue ? ` (impacto estimado: ${audit.displayValue})` : ""}.`
      );
    }
  }

  return {
    category: "performance",
    score: perfScore,
    findings,
    metrics: {
      source: "google-pagespeed-insights",
      lighthousePerformanceScore: perfScore,
      coreWebVitals: cwv,
    },
  };
}

function isRenderBlocking(entry: NetworkEntry): boolean {
  return entry.resourceType === "script" || entry.resourceType === "stylesheet";
}

/** Heurística local basada en la propia captura de Playwright, usada cuando no hay API key de Google configurada o PSI falla. */
function runLocalHeuristic(crawl: CrawlResult): CategoryResult {
  const findings: Finding[] = [];
  const { network, timingMs } = crawl;

  const totalBytes = network.reduce((sum, n) => sum + (n.transferSizeBytes ?? 0), 0);
  const totalRequests = network.length;
  const images = network.filter((n) => n.resourceType === "image");
  const legacyFormatImages = images.filter((n) => /\.(jpe?g|png|gif)(\?|$)/i.test(n.url));
  const renderBlocking = network.filter(isRenderBlocking).length;

  if (timingMs.load && timingMs.load > 4000) {
    pushFinding(
      findings,
      timingMs.load > 8000 ? "critical" : "high",
      "slow-load",
      "Tiempo de carga (load event) elevado",
      `El evento 'load' se disparó a los ${Math.round(timingMs.load)} ms.`,
      "Reduce el número y peso de recursos, difiere JS no crítico y optimiza el servidor de origen."
    );
  }

  if (totalBytes > 3_000_000) {
    pushFinding(
      findings,
      "high",
      "heavy-page-weight",
      "Peso total de la página elevado",
      `Se transfirieron aproximadamente ${Math.round(totalBytes / 1024)} KB en ${totalRequests} solicitudes.`,
      "Optimiza imágenes, elimina dependencias no usadas y habilita compresión (gzip/brotli)."
    );
  }

  if (legacyFormatImages.length > 3) {
    pushFinding(
      findings,
      "medium",
      "legacy-image-formats",
      "Uso de formatos de imagen no modernos",
      `${legacyFormatImages.length} imágenes usan JPG/PNG/GIF en lugar de formatos modernos.`,
      "Convierte las imágenes a WebP o AVIF para reducir su peso sin pérdida perceptible de calidad."
    );
  }

  if (renderBlocking > 10) {
    pushFinding(
      findings,
      "medium",
      "many-render-blocking",
      "Muchos recursos potencialmente bloqueantes de renderizado",
      `Se detectaron ${renderBlocking} scripts/hojas de estilo.`,
      "Difiere scripts no críticos (defer/async) e inserta CSS crítico inline."
    );
  }

  const slowRequests = network.filter((n) => (n.timingMs ?? 0) > 2000);
  if (slowRequests.length > 0) {
    pushFinding(
      findings,
      "medium",
      "slow-requests",
      `${slowRequests.length} solicitud(es) con más de 2s de latencia`,
      "Algunas solicitudes de red tardaron significativamente en completarse.",
      "Investiga el origen de estas solicitudes (CDN, API de terceros, servidor) y optimiza o precarga según corresponda.",
      { evidence: { sample: slowRequests.slice(0, 10).map((n) => ({ url: n.url, ms: n.timingMs })) } }
    );
  }

  const weight: Record<Severity, number> = { critical: 30, high: 15, medium: 7, low: 3, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "performance",
    score,
    findings,
    metrics: {
      source: "local-heuristic",
      note: "Configura GOOGLE_PAGESPEED_API_KEY para obtener datos de campo (CrUX) y auditorías Lighthouse completas de Google.",
      totalRequests,
      totalTransferKb: Math.round(totalBytes / 1024),
      loadEventMs: timingMs.load,
      domContentLoadedMs: timingMs.domContentLoaded,
      renderBlockingResources: renderBlocking,
    },
  };
}

export async function analyzePerformance(url: string, crawl: CrawlResult): Promise<CategoryResult> {
  const psiResult = await runGooglePageSpeedInsights(url);
  if (psiResult) return psiResult;
  return runLocalHeuristic(crawl);
}
