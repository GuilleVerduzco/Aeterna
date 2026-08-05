import "dotenv/config";

function parseApiKeys(raw: string | undefined): Set<string> {
  if (!raw || raw.trim() === "") return new Set();
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  );
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  apiKeys: parseApiKeys(process.env.API_KEYS),
  googlePageSpeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY?.trim() || undefined,
  maxConcurrentAnalyses: Number(process.env.MAX_CONCURRENT_ANALYSES ?? 2),
  analysisTimeoutMs: Number(process.env.ANALYSIS_TIMEOUT_MS ?? 120_000),
  /** Ruta a un binario de Chromium ya instalado (ej. imagen base de Playwright, o entornos sandbox
   *  con navegador preinstalado). Si no se define, Playwright gestiona su propio Chromium descargado. */
  chromiumExecutablePath: process.env.CHROMIUM_EXECUTABLE_PATH?.trim() || undefined,
} as const;

export const authEnabled = config.apiKeys.size > 0;
