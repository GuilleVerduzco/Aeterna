import type { FastifyInstance } from "fastify";
import { queueStats } from "../queue/jobQueue.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      schema: {
        description: "Verifica que el servicio esté disponible.",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              queue: {
                type: "object",
                properties: {
                  pending: { type: "number" },
                  active: { type: "number" },
                  concurrency: { type: "number" },
                  totalTracked: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async () => ({ status: "ok", queue: queueStats() })
  );
}
