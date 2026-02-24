import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Mailersend - Rate Limit Testing", () => {
  // Configuración de Mailersend
  const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
  const MAILERSEND_HOST = process.env.MAILERSEND_HOST || "https://api.mailersend.com";
  const ENDPOINT = `${MAILERSEND_HOST}/v1/email`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: {
          from: {
            email: "test@example.com",
            name: "Test",
          },
          to: [
            {
              email: "recipient@example.com",
              name: "Recipient",
            },
          ],
          subject: "Test Email",
          text: "This is a test email",
          html: "<p>This is a test email</p>",
        },
      },
      clients: 1,
      totalRequests: 1,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(`Mailersend - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `Mailersend - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
    expect(job.results[0].statusCode).toBeGreaterThanOrEqual(200);
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    /**
     * Mailersend típicamente permite 1000 requests por día
     * Monitoreamos los headers X-RateLimit-* para ver el límite
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: {
          from: { email: "test@example.com", name: "Test" },
          to: [{ email: "recipient@example.com", name: "Recipient" }],
          subject: "Rate Limit Test",
          text: "Test",
          html: "<p>Test</p>",
        },
      },
      clients: 1,
      totalRequests: 5,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      "Mailersend - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        rateLimitRemaining:
          r.headers["x-ratelimit-remaining"] ||
          r.headers["x-rate-limit-remaining"],
        rateLimitLimit:
          r.headers["x-ratelimit-limit"] || r.headers["x-rate-limit-limit"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit 429 detectado en Mailersend");
    }

    expect(job.summary.total).toBe(5);
  }, 40000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    /**
     * Enviamos múltiples solicitudes sin intervalos para
     * ver cómo Mailersend maneja la limitación de velocidad
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: {
          from: { email: "test@example.com", name: "Test" },
          to: [{ email: "recipient@example.com", name: "Recipient" }],
          subject: "Burst Test",
          text: "Test",
          html: "<p>Test</p>",
        },
      },
      clients: 3,
      totalRequests: 15,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const rateLimitedCount = job.results.filter(
      (r) => r.statusCode === 429
    ).length;

    console.log(
      `Mailersend - Requests Completados: ${job.summary.success}, Rate Limited: ${rateLimitedCount}`
    );

    expect(job.summary.total).toBe(15);
  }, 60000);
});
