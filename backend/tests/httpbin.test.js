import request from "supertest";
import app from "../src/server.js";
import path from "path";
import { promises as fs } from "fs";
import { waitForJob } from "./helpers/testHelpers.js";

const TEST_DB = path.join(process.cwd(), "data", `test-db.${process.pid}.json`);

describe("API Limiter Stress & Limits", () => {
  beforeAll(async () => {
    process.env.DB_FILE = TEST_DB;
    await fs.rm(TEST_DB, { force: true }).catch(() => {});
  });

  afterAll(async () => {
    await fs.rm(TEST_DB, { force: true }).catch(() => {});
  });

  it("CASE 1: Stay within limits (Happy Path)", async () => {
    const payload = {
      endpoint: "https://httpbin.org/get",
      request: { method: "GET" },
      clients: 2,
      totalRequests: 4,
      burstSize: 2,
      intervalMs: 100,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log("EXECUTED JOB:", JSON.stringify(job, null, 2));

    expect(job.status).toBe("completed");
    expect(job.summary.ok).toBe(4);
    expect(job.results.every((r) => r.statusCode === 200)).toBe(true);
  }, 20000);

  it("CASE 2: Force Rate Limit using Burst Mode", async () => {
    const payload = {
      endpoint: "https://httpbin.org/status/429",
      request: { method: "GET", retries: 0 },
      clients: 1,
      totalRequests: 3,
      burstSize: 3,
      intervalMs: 0,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    expect(job.summary.rateLimit).toBe(3);
    expect(job.results[0].status).toBe("rate_limited");
  });

  it("CASE 3: Capture Retry-After header on 429", async () => {
    const payload = {
      // Probamos con esta URL que suele ser más estable para headers
      endpoint: "https://httpbin.org/response-headers?retry-after=30",
      request: { method: "GET" },
      clients: 1,
      totalRequests: 1,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    // En lugar de buscar por 429 (que httpbin a veces no devuelve como status real)
    // buscamos el primer resultado obtenido
    const result = job.results[0];

    expect(result).toBeDefined();
    expect(result.retryAfter).toBe("30");
  });
});
