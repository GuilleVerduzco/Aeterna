import * as cheerio from "cheerio";
import type { CategoryResult, Finding, Severity } from "../types/index.js";
import { newFindingId } from "../lib/ids.js";
import { fetchText, resolveUrl } from "../lib/http.js";

interface SeoOptions {
  html: string;
  finalUrl: string;
  maxLinksChecked: number;
}

function pushFinding(
  findings: Finding[],
  category: "seo",
  severity: Severity,
  slug: string,
  title: string,
  description: string,
  recommendation: string,
  extra?: Partial<Finding>
) {
  findings.push({
    id: newFindingId(category, slug),
    category,
    severity,
    title,
    description,
    recommendation,
    ...extra,
  });
}

async function checkRobotsAndSitemap(baseUrl: string, findings: Finding[]) {
  const origin = new URL(baseUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;
  let sitemapDeclared: string | null = null;

  try {
    const res = await fetchText(robotsUrl, { timeoutMs: 8000 });
    if (res.statusCode >= 400) {
      pushFinding(
        findings,
        "seo",
        "low",
        "robots-missing",
        "No se encontró robots.txt",
        `La solicitud a ${robotsUrl} devolvió ${res.statusCode}.`,
        "Publica un robots.txt válido, aunque sea permisivo, para guiar a los crawlers y declarar el sitemap."
      );
    } else {
      const sitemapLine = res.body.split("\n").find((l) => l.toLowerCase().startsWith("sitemap:"));
      if (sitemapLine) {
        sitemapDeclared = sitemapLine.split(":").slice(1).join(":").trim();
      } else {
        pushFinding(
          findings,
          "seo",
          "low",
          "robots-no-sitemap",
          "robots.txt no declara un sitemap",
          "robots.txt existe pero no incluye una directiva Sitemap:.",
          "Agrega 'Sitemap: https://tu-dominio/sitemap.xml' en robots.txt para facilitar el rastreo."
        );
      }
    }
  } catch {
    pushFinding(
      findings,
      "seo",
      "info",
      "robots-unreachable",
      "No se pudo verificar robots.txt",
      `Fallo de red al solicitar ${robotsUrl}.`,
      "Verifica manualmente que robots.txt esté accesible públicamente."
    );
  }

  const sitemapUrl = sitemapDeclared ?? `${origin}/sitemap.xml`;
  try {
    const res = await fetchText(sitemapUrl, { timeoutMs: 8000 });
    if (res.statusCode >= 400) {
      pushFinding(
        findings,
        "seo",
        "medium",
        "sitemap-missing",
        "No se encontró sitemap.xml",
        `La solicitud a ${sitemapUrl} devolvió ${res.statusCode}.`,
        "Genera y publica un sitemap.xml para mejorar la indexación, especialmente en sitios con muchas páginas."
      );
    }
  } catch {
    pushFinding(
      findings,
      "seo",
      "low",
      "sitemap-unreachable",
      "No se pudo verificar sitemap.xml",
      `Fallo de red al solicitar ${sitemapUrl}.`,
      "Verifica manualmente que el sitemap esté accesible."
    );
  }
}

async function checkBrokenLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  maxLinksChecked: number,
  findings: Finding[]
): Promise<{ checked: number; broken: number }> {
  const hrefs = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return;
    }
    const resolved = resolveUrl(href, baseUrl);
    if (resolved) hrefs.add(resolved);
  });

  const toCheck = Array.from(hrefs).slice(0, maxLinksChecked);
  const broken: string[] = [];

  await Promise.all(
    toCheck.map(async (link) => {
      try {
        const res = await fetchText(link, { timeoutMs: 6000, method: "HEAD" });
        if (res.statusCode >= 400) broken.push(`${link} (${res.statusCode})`);
      } catch {
        broken.push(`${link} (sin respuesta)`);
      }
    })
  );

  if (broken.length > 0) {
    pushFinding(
      findings,
      "seo",
      broken.length > toCheck.length * 0.2 ? "high" : "medium",
      "broken-links",
      `${broken.length} enlace(s) rotos o inaccesibles`,
      `De ${toCheck.length} enlaces verificados, ${broken.length} devolvieron error o no respondieron.`,
      "Corrige o elimina los enlaces rotos; afectan la experiencia de usuario y el rastreo SEO.",
      { evidence: { broken: broken.slice(0, 20) } }
    );
  }

  return { checked: toCheck.length, broken: broken.length };
}

export async function analyzeSeo(opts: SeoOptions): Promise<CategoryResult> {
  const { html, finalUrl, maxLinksChecked } = opts;
  const $ = cheerio.load(html);
  const findings: Finding[] = [];

  const title = $("title").first().text().trim();
  if (!title) {
    pushFinding(findings, "seo", "high", "title-missing", "Falta la etiqueta <title>", "La página no tiene título.", "Define un <title> único y descriptivo (50-60 caracteres).");
  } else if (title.length < 10 || title.length > 65) {
    pushFinding(
      findings,
      "seo",
      "low",
      "title-length",
      "Longitud de <title> subóptima",
      `El título tiene ${title.length} caracteres: "${title}".`,
      "Ajusta el título a un rango de ~50-60 caracteres para evitar truncamiento en resultados de búsqueda."
    );
  }

  const metaDescription = $('meta[name="description"]').attr("content")?.trim();
  if (!metaDescription) {
    pushFinding(
      findings,
      "seo",
      "medium",
      "meta-description-missing",
      "Falta meta description",
      "No se encontró <meta name=\"description\">.",
      "Agrega una meta description de 120-160 caracteres que resuma la página."
    );
  } else if (metaDescription.length > 165) {
    pushFinding(
      findings,
      "seo",
      "low",
      "meta-description-length",
      "Meta description demasiado larga",
      `Tiene ${metaDescription.length} caracteres.`,
      "Recorta la meta description a ~155-160 caracteres para evitar truncamiento."
    );
  }

  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    pushFinding(
      findings,
      "seo",
      "medium",
      "canonical-missing",
      "Falta la etiqueta canonical",
      "No se encontró <link rel=\"canonical\">.",
      "Declara una URL canónica para evitar contenido duplicado."
    );
  }

  const viewportMeta = $('meta[name="viewport"]').attr("content");
  if (!viewportMeta) {
    pushFinding(
      findings,
      "seo",
      "high",
      "viewport-missing",
      "Falta meta viewport",
      "No se encontró <meta name=\"viewport\">, crítico para mobile-first indexing.",
      "Agrega <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
    );
  }

  const h1s = $("h1");
  if (h1s.length === 0) {
    pushFinding(findings, "seo", "high", "h1-missing", "Falta encabezado H1", "La página no tiene ningún <h1>.", "Agrega un único H1 que describa el propósito principal de la página.");
  } else if (h1s.length > 1) {
    pushFinding(
      findings,
      "seo",
      "low",
      "h1-multiple",
      "Múltiples encabezados H1",
      `Se encontraron ${h1s.length} etiquetas <h1>.`,
      "Usa un solo H1 por página y estructura el resto con H2-H6."
    );
  }

  const headingLevels: number[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headingLevels.push(Number(el.tagName.slice(1)));
  });
  let skippedLevels = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1];
    const curr = headingLevels[i];
    if (prev !== undefined && curr !== undefined && curr - prev > 1) skippedLevels++;
  }
  if (skippedLevels > 0) {
    pushFinding(
      findings,
      "seo",
      "low",
      "heading-hierarchy",
      "Jerarquía de encabezados con saltos",
      `Se detectaron ${skippedLevels} salto(s) de nivel (ej. H2 a H4 directo).`,
      "Mantén una jerarquía de encabezados secuencial para SEO y accesibilidad."
    );
  }

  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => $(el).attr("alt") === undefined).length;
  if (imagesWithoutAlt > 0) {
    pushFinding(
      findings,
      "seo",
      imagesWithoutAlt > images.length * 0.3 ? "high" : "medium",
      "img-alt-missing",
      `${imagesWithoutAlt} imagen(es) sin atributo alt`,
      `De ${images.length} imágenes, ${imagesWithoutAlt} no tienen texto alternativo.`,
      "Agrega atributos alt descriptivos a todas las imágenes con contenido informativo (usa alt=\"\" solo en decorativas)."
    );
  }

  const ogTags = $('meta[property^="og:"]').length;
  if (ogTags === 0) {
    pushFinding(
      findings,
      "seo",
      "low",
      "og-tags-missing",
      "Sin metadatos Open Graph",
      "No se encontraron etiquetas og:* para compartir en redes sociales.",
      "Agrega og:title, og:description, og:image y og:url para mejorar las vistas previas al compartir."
    );
  }

  const jsonLdBlocks = $('script[type="application/ld+json"]');
  let structuredDataValid = 0;
  let structuredDataInvalid = 0;
  jsonLdBlocks.each((_, el) => {
    const content = $(el).contents().text();
    try {
      JSON.parse(content);
      structuredDataValid++;
    } catch {
      structuredDataInvalid++;
    }
  });
  if (jsonLdBlocks.length === 0) {
    pushFinding(
      findings,
      "seo",
      "low",
      "structured-data-missing",
      "Sin datos estructurados (JSON-LD)",
      "No se encontró ningún bloque <script type=\"application/ld+json\">.",
      "Implementa Schema.org (Organization, WebSite, BreadcrumbList, etc.) para mejorar los resultados enriquecidos."
    );
  } else if (structuredDataInvalid > 0) {
    pushFinding(
      findings,
      "seo",
      "medium",
      "structured-data-invalid",
      "JSON-LD con sintaxis inválida",
      `${structuredDataInvalid} de ${jsonLdBlocks.length} bloque(s) JSON-LD no son JSON válido.`,
      "Corrige la sintaxis de los bloques de datos estructurados; valida con el Rich Results Test de Google."
    );
  }

  if (!/^https:/i.test(finalUrl)) {
    pushFinding(
      findings,
      "seo",
      "critical",
      "no-https",
      "El sitio no usa HTTPS",
      `La URL final (${finalUrl}) no está servida sobre HTTPS.`,
      "Migra a HTTPS con un certificado TLS válido; es un factor de ranking y de confianza del usuario."
    );
  }

  await checkRobotsAndSitemap(finalUrl, findings);
  const linkStats = await checkBrokenLinks($, finalUrl, maxLinksChecked, findings);

  const weight: Record<Severity, number> = { critical: 35, high: 16, medium: 8, low: 3, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    category: "seo",
    score,
    findings,
    metrics: {
      title,
      titleLength: title.length,
      metaDescriptionLength: metaDescription?.length ?? 0,
      hasCanonical: Boolean(canonical),
      h1Count: h1s.length,
      imageCount: images.length,
      imagesWithoutAlt,
      structuredDataBlocks: jsonLdBlocks.length,
      linksChecked: linkStats.checked,
      brokenLinks: linkStats.broken,
    },
  };
}
