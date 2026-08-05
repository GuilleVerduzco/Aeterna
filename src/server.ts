import { buildApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { closeBrowser } from "./analyzers/crawler.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    logger.info(`Æterna Site Auditor escuchando en el puerto ${config.port} — docs en /docs`);
  } catch (err) {
    logger.error({ err }, "No se pudo iniciar el servidor");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`Recibido ${signal}, cerrando...`);
    await app.close();
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main();
