import pLimit from "p-limit";
import { runAnalysis } from "../analyzers/index.js";
import { newJobId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import type { AnalysisOptions, Job } from "../types/index.js";

const jobs = new Map<string, Job>();
const limit = pLimit(config.maxConcurrentAnalyses);

/** Job store en memoria: suficiente para un solo proceso/instancia.
 *  Para escalar horizontalmente, sustituir por BullMQ + Redis detrás de esta misma interfaz. */
const JOB_TTL_MS = 60 * 60 * 1000;

function scheduleCleanup(id: string) {
  setTimeout(() => jobs.delete(id), JOB_TTL_MS).unref();
}

export function enqueueAnalysis(options: AnalysisOptions): Job {
  const job: Job = {
    id: newJobId(),
    status: "queued",
    options,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  limit(async () => {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    try {
      const result = await runAnalysis(options, config.analysisTimeoutMs);
      result.id = job.id;
      job.result = result;
      job.status = "completed";
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      logger.error({ err, jobId: job.id }, "El análisis falló");
    } finally {
      job.finishedAt = new Date().toISOString();
      scheduleCleanup(job.id);
    }
  }).catch((err) => {
    logger.error({ err, jobId: job.id }, "Error inesperado en la cola de trabajos");
  });

  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function queueStats() {
  return {
    pending: limit.pendingCount,
    active: limit.activeCount,
    concurrency: config.maxConcurrentAnalyses,
    totalTracked: jobs.size,
  };
}
