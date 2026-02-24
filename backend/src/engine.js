import { request as httpRequest } from "./lib/httpClient.js";
import { createJob, updateJob, getJob } from "./db.js";
import { makeId } from "./lib/utils.js";
import { error as logError, success as logSuccess } from "./lib/log.js";

// Limite para el tamaño del body capturado (100 KB)
const MAX_BODY_SIZE = 100 * 1024;

// Serializar body de forma segura
function serializeBody(body) {
  if (!body) return null;

  try {
    // Si es string, devolver tal cual (truncado si es muy grande)
    if (typeof body === "string") {
      return body.length > MAX_BODY_SIZE
        ? body.substring(0, MAX_BODY_SIZE) + "\n... (truncated)"
        : body;
    }

    // Si es objeto, convertir a JSON
    if (typeof body === "object") {
      const serialized = JSON.stringify(body);
      return serialized.length > MAX_BODY_SIZE
        ? serialized.substring(0, MAX_BODY_SIZE) + "\n... (truncated)"
        : serialized;
    }

    // Para otros tipos, intentar string
    const str = String(body);
    return str.length > MAX_BODY_SIZE
      ? str.substring(0, MAX_BODY_SIZE) + "\n... (truncated)"
      : str;
  } catch (err) {
    return `[Error serializing body: ${err.message}]`;
  }
}

// Extraer headers de forma segura
function extractHeaders(headers) {
  if (!headers) return {};

  try {
    // Si es un método (AxiosHeaders)
    if (typeof headers.toJSON === "function") {
      return headers.toJSON();
    }

    // Si es un objeto plano
    if (headers && typeof headers === "object") {
      return { ...headers };
    }

    return {};
  } catch (err) {
    return { error: `Failed to extract headers: ${err.message}` };
  }
}

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
// Todas las peticiones se lanzan en paralelo sin intervalos
async function executeWorker({ id, quota, config, state }) {
  const { endpoint, request, timeoutMs } = config;
  const requestMethod = request.method || "GET";
  const requestHeaders = request.headers || {};
  const requestBody = request.body;

  const requestPromises = Array.from({ length: quota }).map(async () => {
    console.log(`Worker lanzando peticion ${state.globalSent + 1}`);
    const start = Date.now();
    const attempt = ++state.globalSent; // Contador global compartido
    let response;
    let error = null;

    try {
      response = await httpRequest({
        url: endpoint,
        method: requestMethod,
        headers: requestHeaders,
        data: requestBody,
        timeout: timeoutMs,
        validateStatus: () => true,
      });
    } catch (err) {
      error = err;
      response = err.response; // Axios guarda la respuesta fallida aquí
    }

    const elapsed = Date.now() - start;
    const statusCode = response ? parseInt(response.status, 10) : 0;

    // Extracción de retry-after
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

    // Construir resultado con trazas completas
    const result = {
      seq: attempt,
      timestamp: new Date().toISOString(),
      status:
        statusCode === 429
          ? "rate_limited"
          : statusCode >= 200 && statusCode < 300
            ? "ok"
            : "error",
      statusCode,
      durationMs: elapsed,
      retryAfter: retryAfter ? String(retryAfter) : null,
      
      // Trazas de la solicitud
      request: {
        url: endpoint,
        method: requestMethod,
        headers: requestHeaders ? { ...requestHeaders } : {},
        body: serializeBody(requestBody),
      },
      
      // Trazas de la respuesta
      response: response ? {
        status: response.status,
        statusText: response.statusText || "",
        headers: extractHeaders(response.headers),
        body: serializeBody(response.data),
      } : null,
      
      // Información de error si aplica
      error: error ? {
        message: error.message,
        code: error.code,
        errorType: error.name,
      } : null,
    };

    // Guardamos en el array compartido
    state.results.push(result);

    updateMetrics(state.metrics, elapsed, statusCode);
  });

  // Lanzar todas las peticiones en paralelo sin esperas
  await Promise.allSettled(requestPromises);
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
