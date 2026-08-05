import { HtmlValidate } from "html-validate";
import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";
import type { ConsoleEntry, NetworkEntry } from "./crawler.js";

interface CodeQualityOptions {
  html: string;
  finalUrl: string;
  responseHeaders: Record<string, string>;
  network: NetworkEntry[];
  consoleEntries: ConsoleEntry[];
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
    id: newFindingId("code_security", slug),
    category: "code_security",
    severity,
    title,
    description,
    recommendation,
    ...extra,
  });
}

const SECURITY_HEADERS: { header: string; severity: Severity; recommendation: string }[] = [
  {
    header: "content-security-policy",
    severity: "high",
    recommendation: "Define una Content-Security-Policy que restrinja los orígenes de scripts, estilos y frames.",
  },
  {
    header: "strict-transport-security",
    severity: "high",
    recommendation: "Agrega Strict-Transport-Security (HSTS) para forzar conexiones HTTPS en visitas futuras.",
  },
  {
    header: "x-content-type-options",
    severity: "medium",
    recommendation: "Agrega 'X-Content-Type-Options: nosniff' para evitar MIME sniffing.",
  },
  {
    header: "referrer-policy",
    severity: "low",
    recommendation: "Define una Referrer-Policy (ej. 'strict-origin-when-cross-origin') para controlar la fuga de datos de referer.",
  },
  {
    header: "permissions-policy",
    severity: "low",
    recommendation: "Define una Permissions-Policy para limitar el acceso a APIs sensibles del navegador (cámara, geolocalización, etc.).",
  },
];

// Firmas de versión heurísticas para librerías JS front-end conocidas por tener CVEs relevantes en versiones antiguas.
// No sustituye un escáner de vulnerabilidades completo (ej. retire.js), pero detecta los casos más comunes.
const LIBRARY_SIGNATURES: { name: string; pattern: RegExp; minSafeMajor: number; minSafeMinor: number }[] = [
  { name: "jQuery", pattern: /jquery[.-](\d+)\.(\d+)\.(\d+)/i, minSafeMajor: 3, minSafeMinor: 5 },
  { name: "Bootstrap", pattern: /bootstrap[.-](\d+)\.(\d+)\.(\d+)/i, minSafeMajor: 4, minSafeMinor: 3 },
  { name: "AngularJS", pattern: /angular(?:js)?[.-](\d+)\.(\d+)\.(\d+)/i, minSafeMajor: 1, minSafeMinor: 8 },
];

function checkVulnerableLibraries(network: NetworkEntry[], html: string, findings: Finding[]) {
  const sources = [...network.map((n) => n.url), html];
  const found = new Map<string, { major: number; minor: number }>();

  for (const src of sources) {
    for (const lib of LIBRARY_SIGNATURES) {
      const m = lib.pattern.exec(src);
      if (m) {
        const major = Number(m[1]);
        const minor = Number(m[2]);
        const existing = found.get(lib.name);
        if (!existing || major > existing.major || (major === existing.major && minor > existing.minor)) {
          found.set(lib.name, { major, minor });
        }
      }
    }
  }

  for (const lib of LIBRARY_SIGNATURES) {
    const detected = found.get(lib.name);
    if (!detected) continue;
    const isOld =
      detected.major < lib.minSafeMajor ||
      (detected.major === lib.minSafeMajor && detected.minor < lib.minSafeMinor);
    if (isOld) {
      pushFinding(
        findings,
        "high",
        `outdated-lib-${lib.name.toLowerCase()}`,
        `Versión desactualizada de ${lib.name} detectada`,
        `Se detectó ${lib.name} ${detected.major}.${detected.minor}.x, anterior a la versión mínima recomendada ${lib.minSafeMajor}.${lib.minSafeMinor}.x por temas de seguridad conocidos.`,
        `Actualiza ${lib.name} a la última versión estable disponible.`
      );
    }
  }
}

function checkMixedContent(finalUrl: string, network: NetworkEntry[], findings: Finding[]) {
  if (!finalUrl.startsWith("https://")) return;
  const insecure = network.filter((n) => n.url.startsWith("http://"));
  if (insecure.length > 0) {
    pushFinding(
      findings,
      "high",
      "mixed-content",
      "Contenido mixto (HTTP dentro de página HTTPS)",
      `Se cargaron ${insecure.length} recurso(s) por HTTP en una página servida por HTTPS.`,
      "Sirve todos los recursos (imágenes, scripts, estilos, fuentes) por HTTPS.",
      { evidence: { sample: insecure.slice(0, 10).map((n) => n.url) } }
    );
  }
}

function checkExposedSourceMaps(network: NetworkEntry[], findings: Finding[]) {
  const exposedMaps = network.filter((n) => n.url.endsWith(".map") && (n.status ?? 0) < 400);
  if (exposedMaps.length > 0) {
    pushFinding(
      findings,
      "low",
      "exposed-source-maps",
      "Source maps de producción accesibles públicamente",
      `Se detectaron ${exposedMaps.length} archivo(s) .map accesibles.`,
      "Evita publicar source maps en producción o restringe su acceso; pueden exponer código fuente y lógica interna.",
      { evidence: { sample: exposedMaps.slice(0, 10).map((n) => n.url) } }
    );
  }
}

async function validateHtml(html: string): Promise<{ errors: number; warnings: number; messages: string[] }> {
  const validator = new HtmlValidate({
    extends: ["html-validate:recommended"],
  });
  const report = await validator.validateString(html);
  let errors = 0;
  let warnings = 0;
  const messages: string[] = [];
  for (const result of report.results) {
    for (const msg of result.messages) {
      if (msg.severity === 2) errors++;
      else warnings++;
      if (messages.length < 30) {
        messages.push(`[${msg.ruleId}] línea ${msg.line}: ${msg.message}`);
      }
    }
  }
  return { errors, warnings, messages };
}

export async function analyzeCodeQuality(opts: CodeQualityOptions): Promise<CategoryResult> {
  const { html, finalUrl, responseHeaders, network, consoleEntries } = opts;
  const findings: Finding[] = [];
  const lowerHeaders = new Map(Object.entries(responseHeaders).map(([k, v]) => [k.toLowerCase(), v]));

  for (const check of SECURITY_HEADERS) {
    if (!lowerHeaders.has(check.header)) {
      pushFinding(
        findings,
        check.severity,
        `missing-header-${check.header}`,
        `Falta el header de seguridad ${check.header}`,
        `La respuesta principal no incluye el header HTTP '${check.header}'.`,
        check.recommendation
      );
    }
  }

  checkMixedContent(finalUrl, network, findings);
  checkExposedSourceMaps(network, findings);
  checkVulnerableLibraries(network, html, findings);

  const jsErrors = consoleEntries.filter((c) => c.type === "error");
  if (jsErrors.length > 0) {
    pushFinding(
      findings,
      jsErrors.length > 5 ? "high" : "medium",
      "console-errors",
      `${jsErrors.length} error(es) de JavaScript en consola`,
      "Se detectaron errores en la consola del navegador durante la carga de la página.",
      "Revisa y corrige los errores de JavaScript; pueden indicar funcionalidad rota para el usuario.",
      { evidence: { sample: jsErrors.slice(0, 10).map((c) => c.text) } }
    );
  }

  const htmlValidation = await validateHtml(html);
  if (htmlValidation.errors > 0) {
    pushFinding(
      findings,
      htmlValidation.errors > 15 ? "high" : "medium",
      "html-invalid",
      `${htmlValidation.errors} error(es) de validación HTML`,
      "El marcado HTML no cumple con las reglas recomendadas de validación.",
      "Corrige los errores de HTML para asegurar compatibilidad entre navegadores y accesibilidad.",
      { evidence: { sample: htmlValidation.messages.slice(0, 15) } }
    );
  }

  const totalTransferBytes = network.reduce((sum, n) => sum + (n.transferSizeBytes ?? 0), 0);
  const jsRequests = network.filter((n) => n.resourceType === "script");
  const totalJsBytes = jsRequests.reduce((sum, n) => sum + (n.transferSizeBytes ?? 0), 0);
  if (totalJsBytes > 1_500_000) {
    pushFinding(
      findings,
      "medium",
      "js-payload-heavy",
      "Peso de JavaScript elevado",
      `Se transfirieron ~${Math.round(totalJsBytes / 1024)} KB en ${jsRequests.length} archivo(s) JS.`,
      "Aplica code-splitting, tree-shaking y carga diferida para reducir el peso de JavaScript enviado al cliente."
    );
  }

  const weight: Record<Severity, number> = { critical: 30, high: 14, medium: 7, low: 3, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "code_security",
    score,
    findings,
    metrics: {
      missingSecurityHeaders: SECURITY_HEADERS.filter((c) => !lowerHeaders.has(c.header)).map((c) => c.header),
      jsConsoleErrors: jsErrors.length,
      htmlValidationErrors: htmlValidation.errors,
      htmlValidationWarnings: htmlValidation.warnings,
      totalTransferKb: Math.round(totalTransferBytes / 1024),
      totalRequests: network.length,
    },
  };
}
