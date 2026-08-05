import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./routes/health.js";
import { analysesRoutes } from "./routes/analyses.js";
import { config, authEnabled } from "./config.js";

const PUBLIC_PATHS = new Set(["/health", "/docs", "/docs/json", "/docs/uiConfig", "/docs/static/index.html"]);

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

  app.addHook("onRequest", async (req, reply) => {
    if (!authEnabled) return;
    if (PUBLIC_PATHS.has(req.url.split("?")[0] ?? req.url)) return;
    if (req.url.startsWith("/docs")) return;

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
