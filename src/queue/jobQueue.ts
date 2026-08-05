import { EventEmitter } from "node:events";
import pLimit from "p-limit";
import { runAnalysis } from "../analyzers/index.js";
import { newJobId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";
import type { AnalysisEvent, AnalysisOptions, Job } from "../types/index.js";

const jobs = new Map<string, Job>();
const jobEmitters = new Map<string, EventEmitter>();
/** Historial de eventos por job, para que un cliente SSE que se suscribe tarde
 *  (después de que ya corrieron algunas categorías) pueda "ponerse al día". */
const jobEventLog = new Map<string, AnalysisEvent[]>();
const limit = pLimit(config.maxConcurrentAnalyses);

/** Job store en memoria: suficiente para un solo proceso/instancia.
 *  Para escalar horizontalmente, sustituir por BullMQ + Redis detrás de esta misma interfaz. */
const JOB_TTL_MS = 60 * 60 * 1000;

function scheduleCleanup(id: string) {
  setTimeout(() => {
    jobs.delete(id);
    jobEmitters.delete(id);
    jobEventLog.delete(id);
  }, JOB_TTL_MS).unref();
}

function emitJobEvent(id: string, event: AnalysisEvent) {
  const log = jobEventLog.get(id);
  if (log) log.push(event);
  jobEmitters.get(id)?.emit("event", event);
}

export function enqueueAnalysis(options: AnalysisOptions): Job {
  const job: Job = {
    id: newJobId(),
    status: "queued",
    options,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  jobEmitters.set(job.id, new EventEmitter().setMaxListeners(50));
  jobEventLog.set(job.id, []);

  limit(async () => {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    try {
      const result = await runAnalysis(options, config.analysisTimeoutMs, (event) => emitJobEvent(job.id, event));
      result.id = job.id;
      job.result = result;
      job.status = "completed";
      emitJobEvent(job.id, { type: "job_completed", result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      job.status = "failed";
      job.error = message;
      logger.error({ err, jobId: job.id }, "El análisis falló");
      emitJobEvent(job.id, { type: "job_failed", error: message });
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

/**
 * Se suscribe a los eventos de progreso de un job: primero reproduce los que
 * ya ocurrieron (para clientes que llegan tarde), luego reenvía los nuevos en
 * vivo. Devuelve una función para cancelar la suscripción.
 */
export function subscribeToJob(id: string, onEvent: (event: AnalysisEvent) => void): (() => void) | null {
  const emitter = jobEmitters.get(id);
  const log = jobEventLog.get(id);
  if (!emitter || !log) return null;

  for (const event of log) onEvent(event);

  const listener = (event: AnalysisEvent) => onEvent(event);
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

export function queueStats() {
  return {
    pending: limit.pendingCount,
    active: limit.activeCount,
    concurrency: config.maxConcurrentAnalyses,
    totalTracked: jobs.size,
  };
}
