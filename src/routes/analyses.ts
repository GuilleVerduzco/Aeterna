import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enqueueAnalysis, getJob } from "../queue/jobQueue.js";
import { generateHtmlReport } from "../report/htmlTemplate.js";
import { renderHtmlToPdf } from "../report/pdfRenderer.js";
import { ALL_CATEGORIES, type Category } from "../types/index.js";

const CreateAnalysisSchema = z.object({
  url: z.string().url({ message: "url debe ser una URL absoluta válida, ej. https://ejemplo.com" }),
  categories: z.array(z.enum(ALL_CATEGORIES as [Category, ...Category[]])).min(1).optional(),
  screenshots: z.boolean().optional(),
  maxLinksChecked: z.number().int().min(0).max(200).optional(),
});

export async function analysesRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/analyses",
    {
      schema: {
        description:
          "Encola una auditoría profunda de un sitio web (rendimiento, SEO, accesibilidad, diseño/UX y código/seguridad).",
        tags: ["analyses"],
        body: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string", format: "uri", description: "URL absoluta del sitio a auditar" },
            categories: {
              type: "array",
              items: { type: "string", enum: ALL_CATEGORIES },
              description: "Subconjunto de categorías a analizar. Por defecto, todas.",
            },
            screenshots: { type: "boolean", description: "Capturar screenshots responsive (mobile/tablet/desktop). Por defecto true." },
            maxLinksChecked: { type: "number", description: "Máximo de enlaces internos/externos a verificar por caídos. Por defecto 25." },
          },
        },
      },
    },
    async (req, reply) => {
      const parsed = CreateAnalysisSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
      }
      const { url, categories, screenshots, maxLinksChecked } = parsed.data;

      const job = enqueueAnalysis({
        url,
        categories: categories ?? ALL_CATEGORIES,
        screenshots: screenshots ?? true,
        maxLinksChecked: maxLinksChecked ?? 25,
      });

      return reply.code(202).send({
        id: job.id,
        status: job.status,
        statusUrl: `/api/v1/analyses/${job.id}`,
      });
    }
  );

  app.get(
    "/api/v1/analyses/:id",
    {
      schema: {
        description: "Consulta el estado y, si terminó, el resultado JSON completo de una auditoría.",
        tags: ["analyses"],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const job = getJob(id);
      if (!job) return reply.code(404).send({ error: "not_found", message: `No existe una auditoría con id ${id}` });
      return reply.send(job);
    }
  );

  app.get(
    "/api/v1/analyses/:id/report.html",
    {
      schema: {
        description: "Devuelve el reporte visual en HTML (marca Æterna) de una auditoría completada.",
        tags: ["analyses"],
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const job = getJob(id);
      if (!job) return reply.code(404).send({ error: "not_found" });
      if (job.status !== "completed" || !job.result) {
        return reply.code(409).send({ error: "not_ready", status: job.status });
      }
      reply.type("text/html").send(generateHtmlReport(job.result));
    }
  );

  app.get(
    "/api/v1/analyses/:id/report.pdf",
    {
      schema: {
        description: "Devuelve el reporte visual en PDF (marca Æterna) de una auditoría completada.",
        tags: ["analyses"],
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const job = getJob(id);
      if (!job) return reply.code(404).send({ error: "not_found" });
      if (job.status !== "completed" || !job.result) {
        return reply.code(409).send({ error: "not_ready", status: job.status });
      }
      const html = generateHtmlReport(job.result);
      const pdf = await renderHtmlToPdf(html);
      reply.type("application/pdf").send(pdf);
    }
  );
}
