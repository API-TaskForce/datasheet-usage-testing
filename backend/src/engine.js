import { request as httpRequest } from "./lib/httpClient.js";
import { createJob, updateJob, getJob } from "./db.js";
import { makeId, sleep } from "./lib/utils.js";
import { error as logError, success as logSuccess } from "./lib/log.js";

export async function startTest(config) {
  const id = makeId();
  const job = {
    id,
    config,
    status: "queued",
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    results: [],
  };

  await createJob(job);

  // run asynchronously
  setImmediate(() =>
    runJob(id).catch((err) =>
      logError(`Engine error: ${err && err.stack ? err.stack : err}`),
    ),
  );

  return job;
}

function updateMetrics(metrics, elapsed, status) {
  const s = Number(status);

  metrics.total += 1;

  metrics.avgMs = Math.round(
    (metrics.avgMs * (metrics.total - 1) + elapsed) / metrics.total,
  );

  if (s === 429) metrics.rateLimit += 1;
  else if (s >= 200 && s < 300) metrics.ok += 1;
  else metrics.error += 1;
}

// Ejecuta la lógica de un worker individual (un "cliente")
async function executeWorker({ id, quota, config, state }) {
  const { endpoint, request, timeoutMs, intervalMs, burstSize = 1 } = config;
  let sentInWorker = 0;

  while (sentInWorker < quota) {
    const remaining = quota - sentInWorker;
    const currentBurst = Math.min(burstSize, remaining);

    const burstPromises = Array.from({ length: currentBurst }).map(async () => {
      console.log(`Worker lanzando peticion ${state.globalSent + 1}`);
      const start = Date.now();
      const attempt = ++state.globalSent; // Contador global compartido
      let response;

      try {
        response = await httpRequest({
          url: endpoint,
          method: request.method || "GET",
          headers: request.headers || {},
          data: request.body,
          timeout: timeoutMs,
          validateStatus: () => true,
        });
      } catch (err) {
        response = err.response; // Axios guarda la respuesta fallida aquí
      }

      const elapsed = Date.now() - start;
      const statusCode = response ? parseInt(response.status, 10) : 0;

      // Extracción ultra-segura
      let retryAfter = null;
      if (response && response.headers) {
        if (typeof response.headers.get === "function") {
          // Caso AxiosHeaders
          retryAfter = response.headers.get("retry-after");
        } else {
          // Caso objeto plano (fallback)
          retryAfter =
            response.headers["retry-after"] || response.headers["Retry-After"];
        }
      }

      // 1. Guardamos en el array compartido
      state.results.push({
        seq: attempt,
        status:
          statusCode === 429
            ? "rate_limited"
            : statusCode >= 200 && statusCode < 300
              ? "ok"
              : "error",
        statusCode,
        durationMs: elapsed,
        timestamp: new Date().toISOString(),
        retryAfter: retryAfter ? String(retryAfter) : null,
      });

      updateMetrics(state.metrics, elapsed, statusCode);
    });

    // 3. Ejecutar ráfaga en paralelo
    await Promise.allSettled(burstPromises);
    sentInWorker += currentBurst;

    // 5. Delay entre ráfagas
    if (intervalMs > 0 && sentInWorker < quota) {
      await sleep(intervalMs);
    }
  }
}

export async function runJob(id) {
  const job = await getJob(id);
  if (!job) throw new Error("Job not found");

  const { config } = job;
  // Forzamos conversión a número para evitar bucles infinitos o nulos
  const clients = Number(config.clients) || 1;
  const totalRequests = Number(config.totalRequests) || 1;

  await updateJob(id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const state = {
    results: [],
    globalSent: 0,
    metrics: { total: 0, ok: 0, error: 0, rateLimit: 0, avgMs: 0 },
  };

  const perClient = Math.floor(totalRequests / clients);
  const remainder = totalRequests % clients;
  const workerPromises = [];

  for (let i = 0; i < clients; i++) {
    const quota = perClient + (i < remainder ? 1 : 0);
    if (quota > 0) {
      // IMPORTANTE: Guardamos la promesa del worker
      workerPromises.push(executeWorker({ id, quota, config, state }));
    }
  }

  // Esperamos a que todos los workers terminen realmente
  await Promise.all(workerPromises);

  console.log(`DEBUG FINAL: Resultados en memoria: ${state.results.length}`);

  // ESCRITURA FINAL: Una sola vez al terminar todo
  return await updateJob(id, {
    status: "completed",
    finishedAt: new Date().toISOString(),
    results: [...state.results].sort((a, b) => a.seq - b.seq),
    summary: { ...state.metrics },
  });
}

export { getJob };
