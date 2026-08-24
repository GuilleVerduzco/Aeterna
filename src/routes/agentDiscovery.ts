import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";

/**
 * Endpoints de descubrimiento para agentes de IA (RFC 8288 Link headers, RFC 9727 API catalog,
 * Agent Skills Discovery, ARD, Content Signals y Markdown for Agents). Todo aquí describe
 * capacidades reales de esta API (auditoría de sitios web) — nada se anuncia sin implementarlo.
 */

function originOf(req: FastifyRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol;
  return `${proto}://${req.headers.host}`;
}

function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

const AUDIT_SKILL_MD = `# audit-website

Ejecuta una auditoría real de un sitio web público (rendimiento, SEO técnico, accesibilidad WCAG,
diseño/UX y código/seguridad) usando la API de Æterna, y devuelve un score 0-100 por categoría más
hallazgos accionables.

## Cómo usarlo

1. \`POST /api/v1/analyses\` con \`{"url": "https://ejemplo.com"}\` → \`202\` con \`{id, statusUrl, eventsUrl}\`.
2. Sigue el progreso con Server-Sent Events en \`GET /api/v1/analyses/{id}/events\`, o haz polling de
   \`GET /api/v1/analyses/{id}\` hasta que \`status\` sea \`completed\` o \`failed\`.
3. El resultado final trae \`overallScore\`, \`categories[]\` (cada una con \`score\`, \`findings[]\`,
   \`metrics\`) y, si se pidieron, \`screenshots[]\` responsive.
4. Reportes visuales listos para compartir: \`GET /api/v1/analyses/{id}/report.html\` y \`/report.pdf\`.

No requiere autenticación (rutas públicas por diseño, protegidas con rate limiting y un guard anti-SSRF).
Especificación OpenAPI completa en \`/docs/json\`.
`;

const AUDIT_SKILL_SHA256 = sha256Hex(AUDIT_SKILL_MD);

function homeMarkdown(origin: string): string {
  return `# Æterna — Auditoría de sitios web con IA

Æterna ofrece microservicios de IA para PyMEs. Esta API ejecuta auditorías reales de sitios web:
rendimiento, SEO técnico, accesibilidad (WCAG), diseño/UX y código/seguridad, con score 0-100 y
hallazgos accionables.

## Recursos para agentes

- Catálogo de API (RFC 9727): ${origin}/.well-known/api-catalog
- Documentación OpenAPI: ${origin}/docs
- Índice de skills: ${origin}/.well-known/agent-skills/index.json
- Skill "audit-website": ${origin}/.well-known/agent-skills/audit-website/SKILL.md
- Manifiesto ARD: ${origin}/.well-known/ai-catalog.json
- Estado del servicio: ${origin}/health

## Sitio principal

Más sobre Æterna: https://www.c4b.mx · info@c4b.mx
`;
}

function homeHtml(origin: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Æterna Site Auditor API</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #f7f5f0; color: #1a1a1a; padding: 40px 16px; font-family: "Manrope", sans-serif; }
  main { max-width: 640px; }
  h1 { font-family: "Instrument Serif", serif; font-size: 2.25rem; margin: 0 0 8px; }
  p { line-height: 1.6; }
  ul { line-height: 1.9; padding-left: 20px; }
  a { color: #8fc9a0; }
  code { background: #eee; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <h1>Æterna Site Auditor API<span style="color:#c9a96e">.</span></h1>
  <p>Auditorías reales de sitios web (rendimiento, SEO, accesibilidad, diseño/UX y código/seguridad) para agentes y humanos.</p>
  <p>Recursos para agentes:</p>
  <ul>
    <li><a href="/.well-known/api-catalog">Catálogo de API (RFC 9727)</a></li>
    <li><a href="/docs">Documentación OpenAPI</a></li>
    <li><a href="/.well-known/agent-skills/index.json">Índice de skills</a></li>
    <li><a href="/.well-known/ai-catalog.json">Manifiesto ARD</a></li>
    <li><a href="/health">Estado del servicio</a></li>
  </ul>
  <p>Prueba el widget en <a href="/public/audit.html">/public/audit.html</a> · Más en <a href="https://www.c4b.mx">c4b.mx</a></p>
</main>
</body>
</html>`;
}

export async function agentDiscoveryRoutes(app: FastifyInstance) {
  app.get("/", { schema: { hide: true } }, async (req, reply) => {
    const origin = originOf(req);
    reply.header(
      "Link",
      [
        `<${origin}/.well-known/api-catalog>; rel="api-catalog"`,
        `<${origin}/docs>; rel="service-doc"`,
        `<${origin}/docs/json>; rel="service-desc"`,
        `<${origin}/.well-known/agent-skills/index.json>; rel="agent-skills"`,
        `<${origin}/.well-known/ai-catalog.json>; rel="ai-catalog"`,
      ].join(", ")
    );

    const accept = req.headers.accept ?? "";
    const wantsMarkdown = accept.includes("text/markdown") && !accept.includes("text/html");
    if (wantsMarkdown) {
      const md = homeMarkdown(origin);
      reply.header("x-markdown-tokens", String(Math.ceil(md.length / 4)));
      return reply.type("text/markdown; charset=utf-8").send(md);
    }
    return reply.type("text/html; charset=utf-8").send(homeHtml(origin));
  });

  app.get("/robots.txt", { schema: { hide: true } }, async (_req, reply) => {
    reply.type("text/plain; charset=utf-8");
    return [
      "User-agent: *",
      "Allow: /",
      "",
      "# Content Signals (https://contentsignals.org/)",
      "Content-Signal: ai-train=no, search=yes, ai-input=yes",
      "",
    ].join("\n");
  });

  app.get("/.well-known/api-catalog", { schema: { hide: true } }, async (req, reply) => {
    const origin = originOf(req);
    reply.type("application/linkset+json");
    return {
      linkset: [
        {
          anchor: `${origin}/`,
          "service-desc": [{ href: `${origin}/docs/json`, type: "application/json" }],
          "service-doc": [{ href: `${origin}/docs`, type: "text/html" }],
          status: [{ href: `${origin}/health`, type: "application/json" }],
        },
      ],
    };
  });

  app.get("/.well-known/agent-skills/index.json", { schema: { hide: true } }, async (req, reply) => {
    const origin = originOf(req);
    reply.type("application/json");
    return {
      $schema: "https://agentskills.io/schema/v0.2.0/index.json",
      skills: [
        {
          name: "audit-website",
          type: "http-api",
          description:
            "Ejecuta una auditoría real (rendimiento, SEO, accesibilidad, diseño/UX, código y seguridad) de cualquier sitio web público y devuelve hallazgos accionables con score 0-100.",
          url: `${origin}/.well-known/agent-skills/audit-website/SKILL.md`,
          sha256: AUDIT_SKILL_SHA256,
        },
      ],
    };
  });

  app.get("/.well-known/agent-skills/audit-website/SKILL.md", { schema: { hide: true } }, async (_req, reply) => {
    return reply.type("text/markdown; charset=utf-8").send(AUDIT_SKILL_MD);
  });

  app.get("/.well-known/ai-catalog.json", { schema: { hide: true } }, async (req, reply) => {
    const origin = originOf(req);
    reply.header("Access-Control-Allow-Origin", "*");
    reply.type("application/json");
    return {
      specVersion: "0.1.0",
      host: { name: "Æterna", url: "https://www.c4b.mx" },
      entries: [
        {
          id: "urn:air:c4b.mx:api:site-audit",
          displayName: "Auditoría de sitios web Æterna",
          type: "application/json",
          url: `${origin}/docs/json`,
          representativeQueries: [
            "Audita el rendimiento y SEO de mi sitio web",
            "¿Qué problemas de accesibilidad tiene https://ejemplo.com?",
            "Dame un score de código y seguridad para mi landing page",
            "Revisa la consistencia de diseño y contraste de mi sitio",
            "Genera un reporte PDF de auditoría para un cliente",
          ],
        },
      ],
    };
  });
}
