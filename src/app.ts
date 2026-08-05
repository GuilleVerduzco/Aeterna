import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import { healthRoutes } from "./routes/health.js";
import { analysesRoutes } from "./routes/analyses.js";
import { config, authEnabled } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_ASSETS_DIR = join(__dirname, "..", "public");

const PUBLIC_EXACT_PATHS = new Set(["/health", "/docs", "/docs/json", "/docs/uiConfig", "/docs/static/index.html"]);
// El producto de auditoría (crear análisis, seguir su progreso por SSE, leer el reporte) es de cara al
// público: se pensó para incrustarse en un sitio web y ser llamado desde JS en el navegador del visitante,
// donde una API key no puede mantenerse en secreto. Se protege en su lugar con SSRF guard + rate limiting
// (ver routes/analyses.ts). Si necesitas una API privada además de esta, despliega una segunda instancia
// con API_KEYS definido y sin esta excepción.
const PUBLIC_PATH_PREFIXES = ["/docs", "/public", "/api/v1/analyses"];

function isPublicPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  if (PUBLIC_EXACT_PATHS.has(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    },
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Æterna Site Auditor API",
        description:
          "API de auditoría profunda de sitios web: rendimiento (Google PageSpeed Insights), SEO técnico, accesibilidad (axe-core/WCAG), diseño/UX y código/seguridad.",
        version: "1.0.0",
      },
      components: authEnabled
        ? {
            securitySchemes: {
              apiKey: { type: "apiKey", name: "x-api-key", in: "header" },
            },
          }
        : undefined,
      security: authEnabled ? [{ apiKey: [] }] : undefined,
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(fastifyStatic, { root: PUBLIC_ASSETS_DIR, prefix: "/public/" });

  app.addHook("onRequest", async (req, reply) => {
    if (!authEnabled) return;
    if (isPublicPath(req.url)) return;

    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string" || !config.apiKeys.has(apiKey)) {
      reply.code(401).send({ error: "unauthorized", message: "Falta o es inválido el header 'x-api-key'." });
    }
  });

  await app.register(healthRoutes);
  await app.register(analysesRoutes);

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    app.log.error({ err }, "Error no controlado");
    const statusCode = err.statusCode ?? 500;
    reply.code(statusCode).send({ error: "internal_error", message: err.message });
  });

  return app;
}
