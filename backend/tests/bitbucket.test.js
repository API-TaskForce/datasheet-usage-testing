import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("BitBucket - Rate Limit Testing", () => {
  // Configuración de BitBucket
  const BITBUCKET_API_KEY = process.env.BITBUCKET_API_KEY;
  const BITBUCKET_HOST = process.env.BITBUCKET_HOST || "https://api.bitbucket.org";

  const ENDPOINT = `${BITBUCKET_HOST}/2.0/user`;
  const REPOS_ENDPOINT = `${BITBUCKET_HOST}/2.0/repositories`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BITBUCKET_API_KEY}`,
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

    console.log(`BitBucket - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `BitBucket - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
    expect(job.results[0].statusCode).toBeGreaterThanOrEqual(200);
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    /**
     * BitBucket permite 60 peticiones por minuto para usuarios autenticados
     * Los headers X-RateLimit-* indican el estado del límite
     */
    const payload = {
      endpoint: REPOS_ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BITBUCKET_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 10,
      intervalMs: 600, // ~60 segundos para 10 requests
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      "BitBucket - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        rateLimitRemaining: r.headers["x-ratelimit-remaining"],
        rateLimitLimit: r.headers["x-ratelimit-limit"],
        rateLimitReset:
          r.headers["x-ratelimit-reset"] || r.headers["x-ratelimit-window"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit 429 detectado en BitBucket");
    }

    expect(job.summary.total).toBe(10);
  }, 80000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    /**
     * Enviamos múltiples solicitudes sin intervalos para
     * ver cómo BitBucket maneja la limitación de velocidad
     */
    const payload = {
      endpoint: REPOS_ENDPOINT,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BITBUCKET_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
      clients: 4,
      totalRequests: 30,
      burstSize: 10,
      intervalMs: 0,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const successCount = job.results.filter((r) => r.statusCode < 400).length;
    const rateLimitedCount = job.results.filter(
      (r) => r.statusCode === 429
    ).length;
    const throttledCount = job.results.filter(
      (r) => r.statusCode === 403
    ).length;

    console.log(
      `BitBucket - Exitosos: ${successCount}, Rate Limited (429): ${rateLimitedCount}, Throttled (403): ${throttledCount}/${job.summary.total}`
    );

    expect(job.summary.total).toBe(30);
  }, 60000);
});
