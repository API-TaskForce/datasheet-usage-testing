import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Vimeo - Rate Limit Testing", () => {
  // Configuración de Vimeo
  const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
  const VIMEO_HOST = process.env.VIMEO_HOST;

  const VIDEOS_ENDPOINT = `${VIMEO_HOST}/me/videos`;
  const USER_ENDPOINT = `${VIMEO_HOST}/me`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: USER_ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 1,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(`Vimeo - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `Vimeo - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
    expect(job.results[0].statusCode).toBeGreaterThanOrEqual(200);
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    /**
     * Vimeo permite diferentes límites según el plan:
     * - Free: 100 requests por hora
     * - Paid: hasta 1000 requests por hora dependiendo del plan
     * Los headers X-RateLimit-* indican el estado
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: `${VIDEOS_ENDPOINT}?per_page=5`,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 15,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      "Vimeo - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        rateLimitRemaining: r.headers["x-ratelimit-remaining"],
        rateLimitLimit: r.headers["x-ratelimit-limit"],
        rateLimitReset: r.headers["x-ratelimit-reset"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit 429 detectado en Vimeo");
    }

    const retryAfter = job.results.find(
      (r) => r.headers["retry-after"]
    );
    if (retryAfter) {
      console.log(
        `ℹ️ Retry-After header detectado: ${retryAfter.headers["retry-after"]}`
      );
    }

    expect(job.summary.total).toBe(15);
  }, 60000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    /**
     * Enviamos múltiples solicitudes en paralelo para ver
     * cómo Vimeo maneja la limitación de velocidad
     * Todas las peticiones se lanzan simultáneamente
     */
    const payload = {
      endpoint: `${VIDEOS_ENDPOINT}?per_page=10&sort=date&direction=desc`,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      clients: 4,
      totalRequests: 25,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const successCount = job.results.filter((r) => r.statusCode < 400).length;
    const rateLimitedCount = job.results.filter(
      (r) => r.statusCode === 429
    ).length;
    const unauthorizedCount = job.results.filter(
      (r) => r.statusCode === 401
    ).length;

    console.log(
      `Vimeo - Exitosos: ${successCount}, Rate Limited (429): ${rateLimitedCount}, No autorizado (401): ${unauthorizedCount}/${job.summary.total}`
    );

    expect(job.summary.total).toBe(25);
  }, 60000);

  it("CASE 4: Multiple Endpoints Rate Limit", async () => {
    /**
     * Verificamos si diferentes endpoints comparten el mismo límite
     * o tienen límites independientes
     * Todas las peticiones se lanzan en paralelo
     */
    const userPayload = {
      endpoint: USER_ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 8,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(userPayload).expect(202);
    const job = await waitForJob(app, jobId);

    const remainingBefore = parseInt(
      job.results[0].headers["x-ratelimit-remaining"]
    );
    const remainingAfter = parseInt(
      job.results[job.results.length - 1].headers["x-ratelimit-remaining"]
    );
    const consumed = remainingBefore - remainingAfter;

    console.log(
      `Vimeo (User Endpoint) - Límite Restante: ${remainingBefore} -> ${remainingAfter} (consumido: ${consumed})`
    );

    expect(job.summary.total).toBe(8);
  }, 40000);

  it("CASE 5: Rate Limit Reset Window", async () => {
    /**
     * Monitoreamos el window de reset del rate limit
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: USER_ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 3,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    job.results.forEach((result, index) => {
      console.log(`Vimeo - Request ${index + 1}:`, {
        statusCode: result.statusCode,
        remaining: result.headers["x-ratelimit-remaining"],
        reset: result.headers["x-ratelimit-reset"],
        resetTime: new Date(
          parseInt(result.headers["x-ratelimit-reset"]) * 1000
        ).toISOString(),
      });
    });

    expect(job.summary.total).toBe(3);
  }, 40000);
});
