import type { AnalysisResult, Category, CategoryResult, Finding, Severity } from "../types/index.js";

const CATEGORY_LABELS: Record<Category, string> = {
  performance: "Rendimiento",
  seo: "SEO técnico",
  accessibility: "Accesibilidad",
  design: "Diseño / UX",
  code_security: "Código y seguridad",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
  info: "Info",
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreColor(score: number): string {
  if (score >= 85) return "#3F6B4F";
  if (score >= 60) return "#B08F52";
  return "#9A3B3B";
}

function renderScoreBadge(score: number, label: string, big = false): string {
  return `
    <div class="score-badge ${big ? "score-badge--big" : ""}">
      <div class="score-badge__value" style="color:${scoreColor(score)}">${score}</div>
      <div class="score-badge__label">${escapeHtml(label)}</div>
    </div>`;
}

function renderFinding(f: Finding): string {
  return `
    <li class="finding finding--${f.severity}">
      <div class="finding__head">
        <span class="finding__severity">${SEVERITY_LABELS[f.severity]}</span>
        <span class="finding__title">${escapeHtml(f.title)}</span>
      </div>
      <p class="finding__desc">${escapeHtml(f.description)}</p>
      <p class="finding__rec"><strong>Recomendación:</strong> ${escapeHtml(f.recommendation)}</p>
      ${f.target ? `<p class="finding__target">Elemento: <code>${escapeHtml(f.target)}</code></p>` : ""}
    </li>`;
}

function renderCategory(cat: CategoryResult): string {
  const sorted = [...cat.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  return `
    <section class="category">
      <div class="category__header">
        <h2>${CATEGORY_LABELS[cat.category]}</h2>
        ${renderScoreBadge(cat.score, "Score")}
      </div>
      ${
        sorted.length === 0
          ? `<p class="no-findings">Sin hallazgos relevantes en esta categoría.</p>`
          : `<ul class="findings">${sorted.map(renderFinding).join("")}</ul>`
      }
    </section>`;
}

export function generateHtmlReport(result: AnalysisResult): string {
  const generatedAt = new Date(result.finishedAt).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const totalFindings = result.categories.reduce((sum, c) => sum + c.findings.length, 0);
  const criticalCount = result.categories.reduce(
    (sum, c) => sum + c.findings.filter((f) => f.severity === "critical").length,
    0
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Auditoría de sitio — ${escapeHtml(result.finalUrl)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --ae-tinta: #0D1117;
    --ae-oro: #C9A96E;
    --ae-oro-profundo: #B08F52;
    --ae-piedra: #8B8577;
    --ae-grafito: #3A4048;
    --ae-marfil: #F4F1EA;
    --ae-crema: #F7F5F0;
    --ae-hairline-claro: #D8D2C4;
    --ae-font-display: 'Instrument Serif', Georgia, serif;
    --ae-font-body: 'Manrope', -apple-system, sans-serif;
    --ae-font-mono: 'JetBrains Mono', 'Courier New', monospace;
  }
  * { box-sizing: border-box; }
  body { font-family: var(--ae-font-body); color: var(--ae-tinta); background: var(--ae-crema); margin: 0; }
  .cover {
    background: var(--ae-tinta); color: var(--ae-marfil);
    padding: 64px 48px; text-align: center;
  }
  .cover .wordmark { font-family: var(--ae-font-display); font-size: 44px; letter-spacing: 0.02em; }
  .cover .wordmark .dot { color: var(--ae-oro); }
  .cover .tagline {
    font-family: var(--ae-font-mono); letter-spacing: 0.35em; text-transform: uppercase;
    color: var(--ae-piedra); font-size: 11px; margin-top: 8px;
  }
  .cover .report-title { margin-top: 40px; font-size: 15px; color: var(--ae-piedra); }
  .cover .report-url { font-size: 20px; margin-top: 6px; word-break: break-all; }
  .container { max-width: 880px; margin: 0 auto; padding: 40px 24px 80px; }
  .summary { display: flex; align-items: center; justify-content: center; gap: 48px; padding: 32px 0 40px; border-bottom: 1px solid var(--ae-hairline-claro); flex-wrap: wrap; }
  .score-badge { text-align: center; }
  .score-badge__value { font-family: var(--ae-font-display); font-size: 40px; line-height: 1; }
  .score-badge--big .score-badge__value { font-size: 72px; }
  .score-badge__label { font-family: var(--ae-font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ae-piedra); margin-top: 4px; }
  .meta-line { font-family: var(--ae-font-mono); font-size: 12px; color: var(--ae-piedra); text-align: center; margin-top: 8px; }
  .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; padding: 32px 0; border-bottom: 1px solid var(--ae-hairline-claro); }
  .category { padding: 40px 0; border-bottom: 1px solid var(--ae-hairline-claro); }
  .category__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .category__header h2 { font-family: var(--ae-font-display); font-weight: 400; font-size: 26px; margin: 0; }
  .no-findings { color: var(--ae-piedra); font-style: italic; }
  .findings { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
  .finding { background: #fff; border-left: 4px solid var(--ae-grafito); border-radius: 4px; padding: 16px 20px; }
  .finding--critical { border-left-color: #9A3B3B; }
  .finding--high { border-left-color: #B0523B; }
  .finding--medium { border-left-color: var(--ae-oro-profundo); }
  .finding--low { border-left-color: #8B8577; }
  .finding--info { border-left-color: #A8B0B8; }
  .finding__head { display: flex; align-items: baseline; gap: 10px; }
  .finding__severity { font-family: var(--ae-font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ae-piedra); }
  .finding__title { font-weight: 700; font-size: 15px; }
  .finding__desc { margin: 8px 0 4px; font-size: 13.5px; color: #333; }
  .finding__rec { margin: 4px 0 0; font-size: 13.5px; color: var(--ae-grafito); }
  .finding__target { margin: 6px 0 0; font-size: 12px; color: var(--ae-piedra); }
  .finding__target code { background: var(--ae-crema); padding: 2px 6px; border-radius: 3px; }
  .screenshots { display: flex; gap: 16px; flex-wrap: wrap; padding: 24px 0; }
  .screenshots img { max-width: 260px; border: 1px solid var(--ae-hairline-claro); border-radius: 4px; }
  footer { background: var(--ae-tinta); color: var(--ae-piedra); text-align: center; padding: 40px 24px; font-size: 13px; }
  footer .cta { display: inline-block; margin-top: 16px; background: var(--ae-oro); color: var(--ae-tinta); font-weight: 700; padding: 12px 28px; border-radius: 4px; text-decoration: none; }
  footer a { color: var(--ae-oro-profundo); }
</style>
</head>
<body>
  <div class="cover">
    <div class="wordmark">Ætern<span class="dot">a</span></div>
    <div class="tagline">MICROSERVICIOS IA</div>
    <div class="report-title">Auditoría profunda de sitio web</div>
    <div class="report-url">${escapeHtml(result.finalUrl)}</div>
  </div>
  <div class="container">
    <div class="summary">
      ${renderScoreBadge(result.overallScore, "Score general", true)}
      <div>
        <div class="meta-line">Generado el ${escapeHtml(generatedAt)}</div>
        <div class="meta-line">${totalFindings} hallazgo(s) totales · ${criticalCount} crítico(s)</div>
        <div class="meta-line">Duración del análisis: ${Math.round(result.durationMs / 1000)}s</div>
      </div>
    </div>
    <div class="scores-grid">
      ${result.categories.map((c) => renderScoreBadge(c.score, CATEGORY_LABELS[c.category])).join("")}
    </div>
    ${result.categories.map(renderCategory).join("")}
    ${
      result.screenshots.length > 0
        ? `<section class="category">
            <div class="category__header"><h2>Capturas responsive</h2></div>
            <div class="screenshots">
              ${result.screenshots
                .map(
                  (s) =>
                    `<div><img src="data:image/png;base64,${s.base64Png}" alt="Captura ${s.viewport}" /><div class="meta-line">${s.viewport} (${s.width}×${s.height})</div></div>`
                )
                .join("")}
            </div>
          </section>`
        : ""
    }
  </div>
  <footer>
    <div>Reporte generado por el motor de auditoría de Æterna</div>
    <div style="margin-top:8px;">Guillermo Verduzco · CEO · <a href="mailto:info@c4b.mx">info@c4b.mx</a> · <a href="https://wa.me/528114750015">WhatsApp 81 1475 0015</a></div>
    <a class="cta" href="https://wa.me/528114750015">Hablar con Æterna sobre estos resultados</a>
  </footer>
</body>
</html>`;
}
