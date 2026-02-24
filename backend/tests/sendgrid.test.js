import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("RapidAPI - SendGrid Rate Limit Testing", () => {
  // Configuración de RapidAPI
  const RAPIDAPI_HOST = process.env.SENDGRID_RAPIDAPI_HOST || "sendgrid.p.rapidapi.com";
  const RAPIDAPI_KEY = process.env.SENDGRID_RAPIDAPI_KEY; // Idealmente usa process.env.RAPIDAPI_KEY
  const ENDPOINT = `https://${RAPIDAPI_HOST}/mail/send`;

  it("CASE 1: Verify Authentication and Single Request", async () => {
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
          "content-type": "application/json",
        },
        body: {
          personalizations: [
            {
              to: [{ email: "john@example.com" }],
              subject: "Hello, World!",
            },
          ],
          from: { email: "from_address@example.com" },
          content: [
            {
              type: "text/plain",
              value: "Hello, World!",
            },
          ],
        },
      },
      clients: 1,
      totalRequests: 1,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    // Si no tienes una cuenta activa o te pasas de cuota, RapidAPI devolverá 401 o 403
    console.log(`Status de respuesta SendGrid: ${job.results[0].statusCode}`);
    expect(job.status).toBe("completed");
  }, 20000);

  it("CASE 2: RapidAPI Quota Stress (Buscando el límite del Proxy)", async () => {
    /**
     * RapidAPI añade sus propios headers de control.
     * Enviamos múltiples peticiones en paralelo para ver si el proxy nos frena.
     */
    const payload = {
      endpoint: ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        body: {
          /* ... mismo body que arriba ... */
        },
      },
      clients: 2,
      totalRequests: 10,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    // Analizamos si hay headers de RapidAPI en los resultados
    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit detectado por RapidAPI o SendGrid");
    }

    expect(job.summary.total).toBe(10);
  }, 40000);
});
