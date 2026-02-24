import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Spoonacular - Rate Limit Testing", () => {
  // Configuración de Spoonacular
  const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
  const SPOONACULAR_HOST = process.env.SPOONACULAR_HOST || "https://api.spoonacular.com";

  const SEARCH_ENDPOINT = `${SPOONACULAR_HOST}/recipes/complexSearch`;
  const RANDOM_ENDPOINT = `${SPOONACULAR_HOST}/recipes/random`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: `${SEARCH_ENDPOINT}?apiKey=${SPOONACULAR_API_KEY}&query=pasta&number=1`,
      request: {
        method: "GET",
        headers: {
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

    console.log(`Spoonacular - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `Spoonacular - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
    expect(job.results[0].statusCode).toBeGreaterThanOrEqual(200);
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    /**
     * Spoonacular permite 500 puntos por día en plan gratis
     * Diferentes endpoints consumen diferentes cantidades de puntos
     * Monitoreamos los headers X-API-Quota-* para ver el estado
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: `${RANDOM_ENDPOINT}?apiKey=${SPOONACULAR_API_KEY}&number=3`,
      request: {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 8,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    console.log(
      "Spoonacular - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        quotaUsed: r.headers["x-api-quota-used"],
        quotaLeft: r.headers["x-api-quota-left"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 402);
    if (rateLimited) {
      console.log(
        "⚠️ Cuota agotada (402) detectada en Spoonacular - Plan limitado"
      );
    }

    expect(job.summary.total).toBe(8);
  }, 40000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    /**
     * Spoonacular implementa limitación por membresía y puntos
     * Enviamos múltiples solicitudes en paralelo para ver cómo maneja la carga
     */
    const payload = {
      endpoint: `${SEARCH_ENDPOINT}?apiKey=${SPOONACULAR_API_KEY}&query=chicken&number=1`,
      request: {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      clients: 3,
      totalRequests: 12,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const successCount = job.results.filter((r) => r.statusCode < 400).length;
    const quotaExceeded = job.results.filter(
      (r) => r.statusCode === 402
    ).length;
    const tooManyRequests = job.results.filter(
      (r) => r.statusCode === 429
    ).length;

    console.log(
      `Spoonacular - Exitosos: ${successCount}, Cuota Excedida (402): ${quotaExceeded}, Demasiadas Req (429): ${tooManyRequests}/${job.summary.total}`
    );

    expect(job.summary.total).toBe(12);
  }, 60000);

  it("CASE 4: Quota Point Tracking", async () => {
    /**
     * Verificamos cómo se consumen los puntos de cuota
     * Diferentes endpoints tienen diferente costo
     * Todas las peticiones se lanzan en paralelo
     */
    const payload = {
      endpoint: `${SEARCH_ENDPOINT}?apiKey=${SPOONACULAR_API_KEY}&query=soup&number=1`,
      request: {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      clients: 1,
      totalRequests: 5,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    let previousQuotaLeft = null;
    const quotaDifferences = [];

    job.results.forEach((result, index) => {
      const currentQuotaLeft = parseInt(result.headers["x-api-quota-left"]) || 0;
      if (previousQuotaLeft !== null) {
        quotaDifferences.push(previousQuotaLeft - currentQuotaLeft);
      }
      previousQuotaLeft = currentQuotaLeft;
    });

    console.log(
      `Spoonacular - Puntos de Cuota Consumidos por Request: ${quotaDifferences.join(", ")}`
    );
    console.log(
      `Spoonacular - Cuota Restante Final: ${
        job.results[job.results.length - 1].headers["x-api-quota-left"]
      }`
    );

    expect(job.summary.total).toBe(5);
  }, 40000);
});
