import { request as httpRequest } from './lib/httpClient.js';
import { createJob, updateJob, getJob, listJobs } from './db.js';
import { makeId, detectRateLimitInfo } from './lib/utils.js';
import { error as logError, success as logSuccess } from './lib/log.js';
import { engineRequestsCounter, engineRequestDurationHistogram } from './lib/metrics.js';
// Limite para el tamaño del body capturado (100 KB)
const MAX_BODY_SIZE = 100 * 1024;

export const activeJobs = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

// Box-Muller transform for gaussian samples
function sampleNormal(mean, stdDev) {
  const u1 = Math.max(Number.MIN_VALUE, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

function getUserLikeDelayMs(config) {
  const pacing = config?.pacing || {};
  const baseMean = Number.isFinite(pacing?.meanMs)
    ? Math.max(20, pacing.meanMs)
    : Math.max(20, Number(config?.intervalMs) || 220);
  const stdDev = Number.isFinite(pacing?.stdDevMs)
    ? Math.max(5, pacing.stdDevMs)
    : Math.max(10, baseMean * 0.35);
  const minDelay = Number.isFinite(pacing?.minMs) ? Math.max(0, pacing.minMs) : 15;
  const maxDelay = Number.isFinite(pacing?.maxMs)
    ? Math.max(minDelay, pacing.maxMs)
    : Math.max(120, baseMean * 5);

  // Mostly normal user rhythm + occasional very-fast burst + occasional thinking pause.
  const r = Math.random();
  let delay;
  if (r < 0.12) {
    delay = sampleNormal(Math.max(8, baseMean * 0.35), Math.max(3, stdDev * 0.3));
  } else if (r < 0.92) {
    delay = sampleNormal(baseMean, stdDev);
  } else {
    delay = sampleNormal(baseMean * 2.1, stdDev * 1.2);
  }

  return Math.max(minDelay, Math.min(maxDelay, Math.round(delay)));
}

function parseRetryAfterSeconds(value) {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.max(1, Math.ceil(asNumber));
  }

  const asDateMs = Date.parse(raw);
  if (Number.isFinite(asDateMs)) {
    const seconds = Math.ceil((asDateMs - Date.now()) / 1000);
    return seconds > 0 ? seconds : null;
  }

  return null;
}

function buildRateLimiter(config) {
  const limits = config?.rateControl || {};
  const limit = Number(limits?.rateMax);
  const windowSeconds = Number(limits?.windowSeconds);
  const windowModel =
    limits?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW';

  if (!Number.isFinite(limit) || !Number.isFinite(windowSeconds) || limit <= 0 || windowSeconds <= 0) {
    return null;
  }

  return {
    limit: Math.max(1, Math.floor(limit)),
    windowMs: Math.max(1000, Math.floor(windowSeconds * 1000)),
    windowModel,
    fixedWindowStartMs: Date.now(),
    fixedWindowCount: 0,
    slidingAcceptedMs: [],
  };
}

function tryAcquireRateToken(state, tsMs) {
  const limiter = state.rateLimiter;
  if (!limiter) return 0;

  if (limiter.windowModel === 'SLIDING_WINDOW') {
    const cutoff = tsMs - limiter.windowMs;
    while (limiter.slidingAcceptedMs.length > 0 && limiter.slidingAcceptedMs[0] < cutoff) {
      limiter.slidingAcceptedMs.shift();
    }

    if (limiter.slidingAcceptedMs.length < limiter.limit) {
      limiter.slidingAcceptedMs.push(tsMs);
      return 0;
    }

    const oldest = limiter.slidingAcceptedMs[0];
    return Math.max(1, oldest + limiter.windowMs - tsMs);
  }

  if (tsMs - limiter.fixedWindowStartMs >= limiter.windowMs) {
    limiter.fixedWindowStartMs = tsMs;
    limiter.fixedWindowCount = 0;
  }

  if (limiter.fixedWindowCount < limiter.limit) {
    limiter.fixedWindowCount += 1;
    return 0;
  }

  return Math.max(1, limiter.fixedWindowStartMs + limiter.windowMs - tsMs);
}

function getFallbackCooldownSeconds(config) {
  const rateControlCooldown = Number(config?.rateControl?.cooldownSeconds);
  const dummyCooldown = Number(config?.dummyConfig?.cooldownSeconds);

  if (Number.isFinite(rateControlCooldown) && rateControlCooldown > 0) {
    return Math.max(1, Math.ceil(rateControlCooldown));
  }

  if (Number.isFinite(dummyCooldown) && dummyCooldown > 0) {
    return Math.max(1, Math.ceil(dummyCooldown));
  }

  return 15;
}

async function waitForSendWindow(config, state) {
  for (;;) {
    const nowMs = Date.now();
    const activeCooldownMs = Math.max(0, (state.cooldownUntilMs || 0) - nowMs);
    if (activeCooldownMs > 0) {
      await sleep(activeCooldownMs);
      continue;
    }

    const limiterDelayMs = tryAcquireRateToken(state, nowMs);
    if (limiterDelayMs > 0) {
      const limiterCooldownMs = Math.max(
        limiterDelayMs,
        getFallbackCooldownSeconds(config) * 1000
      );
      state.cooldownUntilMs = Math.max(state.cooldownUntilMs || 0, nowMs + limiterCooldownMs);
      await sleep(limiterDelayMs);
      continue;
    }

    return;
  }
}

function applyClientErrorCooldown(config, state, retryAfterRaw) {
  const retryAfterSeconds = parseRetryAfterSeconds(retryAfterRaw);
  const cooldownSeconds = retryAfterSeconds || getFallbackCooldownSeconds(config);
  const cooldownUntilMs = Date.now() + cooldownSeconds * 1000;
  state.cooldownUntilMs = Math.max(state.cooldownUntilMs || 0, cooldownUntilMs);
}

// Serializar body de forma segura
function serializeBody(body) {
  if (!body) return null;

  try {
    // Si es string, devolver tal cual (truncado si es muy grande)
    if (typeof body === 'string') {
      return body.length > MAX_BODY_SIZE
        ? body.substring(0, MAX_BODY_SIZE) + '\n... (truncated)'
        : body;
    }

    // Si es objeto, convertir a JSON
    if (typeof body === 'object') {
      const serialized = JSON.stringify(body);
      return serialized.length > MAX_BODY_SIZE
        ? serialized.substring(0, MAX_BODY_SIZE) + '\n... (truncated)'
        : serialized;
    }

    // Para otros tipos, intentar string
    const str = String(body);
    return str.length > MAX_BODY_SIZE ? str.substring(0, MAX_BODY_SIZE) + '\n... (truncated)' : str;
  } catch (err) {
    return `[Error serializing body: ${err.message}]`;
  }
}

// Extraer headers de forma segura
function extractHeaders(headers) {
  if (!headers) return {};

  try {
    // Si es un método (AxiosHeaders)
    if (typeof headers.toJSON === 'function') {
      return headers.toJSON();
    }

    // Si es un objeto plano
    if (headers && typeof headers === 'object') {
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
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    results: [],
  };

  await createJob(job);

  // run asynchronously
  setImmediate(() =>
    runJob(id).catch((err) => logError(`Engine error: ${err && err.stack ? err.stack : err}`))
  );

  return job;
}

function updateMetrics(metrics, elapsed, status) {
  const s = Number(status);

  metrics.total += 1;

  metrics.avgMs = Math.round((metrics.avgMs * (metrics.total - 1) + elapsed) / metrics.total);

  if (s === 429) metrics.rateLimit += 1;
  else if (s >= 200 && s < 300) metrics.ok += 1;
  else metrics.error += 1;
}

function buildDummyMockResult({ attempt, config, dummyCfg }) {
  const nowIso = new Date().toISOString();
  const baseUrl = 'https://dummy.mock.local';
  const routes = [
    '/weather/current',
    '/weather/forecast',
    '/status/health',
    '/alerts/active',
    '/air-quality/index',
    '/stations/nearby',
  ];
  const methods = ['GET', 'POST', 'PUT'];
  const rateMax = Math.max(1, Number(dummyCfg?.rateMax || 60));
  const cooldownSeconds = Math.max(1, Number(dummyCfg?.cooldownSeconds || 30));
  const windowSeconds = Math.max(1, Number(dummyCfg?.windowSeconds || 60));
  const windowModel = dummyCfg?.windowModel === 'SLIDING_WINDOW' ? 'SLIDING_WINDOW' : 'FIXED_WINDOW';

  const rateLimitProbability = Math.min(0.35, Math.max(0.06, 1 / Math.max(1, rateMax / 20)));
  const shouldRateLimit = Math.random() < rateLimitProbability;
  const statusCode = shouldRateLimit ? 429 : 200;
  const durationMs = shouldRateLimit ? 1 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 5);
  const method = methods[Math.floor(Math.random() * methods.length)];
  const route = routes[Math.floor(Math.random() * routes.length)];
  const rid = Math.floor(Math.random() * 100000) + 1;
  const city = ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Bilbao'][Math.floor(Math.random() * 5)];

  const responseBody = shouldRateLimit
    ? {
        error: 'Rate limit exceeded',
        message: `Too many requests. Retry after ${cooldownSeconds}s.`,
        retryAfter: cooldownSeconds,
        limit: rateMax,
        window: `${windowSeconds}s`,
        _source: 'dummy-mock-backend',
      }
    : {
        ok: true,
        requestId: `dummy-${attempt}-${Math.random().toString(36).slice(2, 8)}`,
        payload: {
          location: city,
          temperature: 15 + Math.floor(Math.random() * 18),
          condition: ['sunny', 'cloudy', 'windy', 'clear', 'rainy'][Math.floor(Math.random() * 5)],
        },
        _source: 'dummy-mock-backend',
      };

  return {
    seq: attempt,
    timestamp: nowIso,
    status: statusCode === 429 ? 'rate_limited' : 'ok',
    statusCode,
    durationMs,
    retryAfter: statusCode === 429 ? String(cooldownSeconds) : null,
    request: {
      url: `${baseUrl}${route}?rid=${rid}`,
      method,
      headers: {
        ...(config?.request?.headers || {}),
        'x-dummy-mock': 'true',
        'x-request-id': `rid-${rid}`,
      },
      body:
        method === 'GET'
          ? null
          : serializeBody({ mock: true, rid, city, attempt }),
    },
    response: {
      status: statusCode,
      statusText: statusCode === 429 ? 'Too Many Requests' : 'OK',
      headers:
        statusCode === 429
          ? {
              'retry-after': String(cooldownSeconds),
              'x-ratelimit-limit': String(rateMax),
              'x-ratelimit-window': `${windowSeconds}s`,
              'x-window-model': windowModel,
              'content-type': 'application/json',
            }
          : {
              'x-ratelimit-limit': String(rateMax),
              'x-ratelimit-window': `${windowSeconds}s`,
              'x-window-model': windowModel,
              'content-type': 'application/json',
            },
      body: serializeBody(responseBody),
    },
    error: null,
    rateLimit:
      statusCode === 429
        ? {
            detected: true,
            retryAfter: cooldownSeconds,
            window: windowSeconds,
            limit: rateMax,
          }
        : null,
  };
}

// Ejecuta la lógica de un worker individual (un "cliente")
// Cada cliente envía peticiones con ritmo humano (distribución normal + jitter).
async function executeWorker({ id, quota, config, state }) {
  const { endpoint, request, timeoutMs } = config;
  const requestMethod = request.method || 'GET';
  const requestHeaders = request.headers || {};
  const requestBody = request.body;
  const isDummyMode = Boolean(config?.dummyMode);
  const dummyCfg = config?.dummyConfig || {};

  for (let i = 0; i < quota; i++) {
    await waitForSendWindow(config, state);
    console.log(`Worker lanzando peticion ${state.globalSent + 1}`);
    const start = Date.now();
    const attempt = ++state.globalSent; // Contador global compartido

    if (isDummyMode) {
      const result = buildDummyMockResult({ attempt, config, dummyCfg });
      state.results.push(result);
      updateMetrics(state.metrics, result.durationMs, result.statusCode);

      const statusType = result.statusCode === 429 ? 'rateLimit' : 'ok';
      engineRequestsCounter.inc({ jobId: id, status_type: statusType });
      engineRequestDurationHistogram.observe(
        { jobId: id, status_type: statusType },
        result.durationMs / 1000
      );
      if (result.statusCode >= 400 && result.statusCode < 500) {
        applyClientErrorCooldown(config, state, result.retryAfter);
      }
      if (i < quota - 1) {
        const delayMs = getUserLikeDelayMs(config);
        await sleep(delayMs);
      }
      continue;
    }

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
    const statusCode = response?.status || 0;
    const isOkStatus = statusCode >= 200 && statusCode < 300;
    const statusType = isOkStatus ? 'ok' : statusCode === 429 ? 'rateLimit' : 'error';
    
    engineRequestsCounter.inc({ jobId: id, status_type: statusType });
    engineRequestDurationHistogram.observe({ jobId: id, status_type: statusType }, elapsed / 1000);

    // Detectar información de rate limiting de los headers
    const rateLimitInfo = detectRateLimitInfo(response?.headers, statusCode);

    // Extracción de retry-after (mantenido por compatibilidad)
    let retryAfter = rateLimitInfo.retryAfter || null;
    if (!retryAfter && response && response.headers) {
      if (typeof response.headers.get === 'function') {
        retryAfter = response.headers.get('retry-after');
      } else {
        retryAfter = response.headers['retry-after'] || response.headers['Retry-After'];
      }
      if (retryAfter) retryAfter = String(retryAfter);
    }

    // Construir resultado con trazas completas
    const result = {
      seq: attempt,
      timestamp: new Date().toISOString(),
      status:
        statusCode === 429
          ? 'rate_limited'
          : statusCode >= 200 && statusCode < 300
            ? 'ok'
            : 'error',
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
      response: response
        ? {
            status: response.status,
            statusText: response.statusText || '',
            headers: extractHeaders(response.headers),
            body: serializeBody(response.data),
          }
        : null,

      // Información de error si aplica
      error: error
        ? {
            message: error.message,
            code: error.code,
            errorType: error.name,
          }
        : null,

      // Información de rate limiting detectada
      rateLimit: rateLimitInfo.detected ? rateLimitInfo : null,
    };

    // Guardamos en el array compartido
    state.results.push(result);

    updateMetrics(state.metrics, elapsed, statusCode);

    if (statusCode >= 400 && statusCode < 500) {
      applyClientErrorCooldown(config, state, retryAfter || rateLimitInfo?.retryAfter);
    }

    if (i < quota - 1) {
      const delayMs = getUserLikeDelayMs(config);
      await sleep(delayMs);
    }
  }
}

export async function runJob(id) {
  const job = await getJob(id);
  if (!job) throw new Error('Job not found');

  const { config } = job;
  // Forzamos conversión a número para evitar bucles infinitos o nulos
  const clients = Number(config.clients) || 1;
  const totalRequests = Number(config.totalRequests) || 1;

  await updateJob(id, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  const state = {
    results: [],
    globalSent: 0,
    metrics: { total: 0, ok: 0, error: 0, rateLimit: 0, avgMs: 0 },
    cooldownUntilMs: 0,
    rateLimiter: buildRateLimiter(config),
  };

  activeJobs.set(id, state);

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

  activeJobs.delete(id);

  console.log(`DEBUG FINAL: Resultados en memoria: ${state.results.length}`);

  // ESCRITURA FINAL: Una sola vez al terminar todo
  return await updateJob(id, {
    status: 'completed',
    finishedAt: new Date().toISOString(),
    results: [...state.results].sort((a, b) => a.seq - b.seq),
    summary: { ...state.metrics },
  });
}

export { getJob, listJobs };
