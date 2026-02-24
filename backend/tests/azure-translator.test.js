import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Azure Translator - Rate Limit Testing", () => {
  // Configuración de Azure Translator
  const AZURE_TRANSLATOR_API_KEY = process.env.AZURE_TRANSLATOR_API_KEY;
  const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION;
  const AZURE_TRANSLATOR_HOST = "https://api.cognitive.microsofttranslator.com";

  const TRANSLATE_ENDPOINT = `${AZURE_TRANSLATOR_HOST}/translate?api-version=3.0&from=en&to=es`;
  const DETECT_ENDPOINT = `${AZURE_TRANSLATOR_HOST}/detect?api-version=3.0`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: TRANSLATE_ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_API_KEY,
          "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
          "Content-Type": "application/xml",
        },
        body: "<string>Hello, World!</string>",
      },
      clients: 1,
      totalRequests: 1,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(`Azure Translator - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `Azure Translator - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
    expect(job.results[0].statusCode).toBeGreaterThanOrEqual(200);
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    /**
     * Azure Translator permite 100 peticiones por segundo en el plan S1
     * Los headers X-RateLimit-* indican el estado del límite
     * Todas las peticiones se lanzan en paralelo para detectar rate limits
     */
    const payload = {
      endpoint: TRANSLATE_ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_API_KEY,
          "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
          "Content-Type": "application/xml",
        },
        body: "<string>This is a translation test.</string>",
      },
      clients: 1,
      totalRequests: 10,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      "Azure Translator - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        rateLimitRemaining: r.headers["x-ratelimit-remaining-requests"],
        rateLimitTotal: r.headers["x-ratelimit-limit-requests"],
        rateLimitReset:
          r.headers["x-ratelimit-reset-requests"] ||
          r.headers["retry-after"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit 429 detectado en Azure Translator");
    }

    expect(job.summary.total).toBe(10);
  }, 40000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    /**
     * Enviamos múltiples solicitudes simultáneamente
     * para ver cómo Azure Translator maneja la limitación de velocidad
     * Todas las peticiones se lanzan en paralelo sin intervalos
     */
    const payload = {
      endpoint: TRANSLATE_ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_API_KEY,
          "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
          "Content-Type": "application/xml",
        },
        body: "<string>Rapid fire translation request.</string>",
      },
      clients: 5,
      totalRequests: 30,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const successCount = job.results.filter((r) => r.statusCode < 400).length;
    const rateLimitedCount = job.results.filter(
      (r) => r.statusCode === 429
    ).length;
    const forbiddenCount = job.results.filter(
      (r) => r.statusCode === 403
    ).length;

    console.log(
      `Azure Translator - Exitosos: ${successCount}, Rate Limited (429): ${rateLimitedCount}, Rechazados (403): ${forbiddenCount}/${job.summary.total}`
    );

    expect(job.summary.total).toBe(30);
  }, 60000);

  it("CASE 4: Different Endpoints Rate Limit", async () => {
    /**
     * Probamos si diferentes endpoints tienen límites independientes
     * Todas las peticiones se lanzan en paralelo
     */
    const detectPayload = {
      endpoint: DETECT_ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_API_KEY,
          "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION,
          "Content-Type": "application/xml",
        },
        body: "<string>Hello, World!</string>",
      },
      clients: 1,
      totalRequests: 5,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(detectPayload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      `Azure Translator (Detect) - Resultados:`,
      job.results.map((r) => ({
        statusCode: r.statusCode,
        endpoint: "detect",
      }))
    );

    expect(job.summary.total).toBe(5);
  }, 40000);
});
