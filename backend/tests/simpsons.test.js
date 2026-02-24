import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Simpsons API - Stress & Rate Limit Test", () => {
  const SIMPSONS_API = "https://thesimpsonsapi.com/api";
";"

  it("CASE 1: Baseline Performance (Simultaneidad media)", async () => {
    const payload = {
      endpoint: SIMPSONS_API,
      request: { method: "GET" },
      clients: 5, // 5 clientes paralelos
      totalRequests: 10, // 10 peticiones en total
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    expect(job.status).toBe("completed");
    console.log(`Promedio de respuesta Simpsons API: ${job.summary.avgMs}ms`);
  }, 30000);

  it("CASE 2: Aggressive Stress (Buscando el 429)", async () => {
    /**
     * Glitch (donde se aloja esta API) suele tener límites por IP.
     * Lanzamos múltiples peticiones en paralelo sin intervalos.
     */
    const payload = {
      endpoint: SIMPSONS_API,
      request: { method: "GET" },
      clients: 1,
      totalRequests: 25,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const hasRateLimit = job.summary.rateLimit > 0;

    if (hasRateLimit) {
      console.log(`⚠️ Límite alcanzado! Bloqueos: ${job.summary.rateLimit}`);
      const limited = job.results.find((r) => r.statusCode === 429);
      if (limited?.retryAfter) {
        console.log(`Sugerencia de espera: ${limited.retryAfter}s`);
      }
    } else {
      console.log("✅ La API aguantó la ráfaga de 25 sin bloquear.");
    }

    expect(job.summary.total).toBe(25);
  }, 40000);
});
