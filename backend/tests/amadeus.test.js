import request from "supertest";
import app from "../src/server.js";
import { waitForJob } from "./helpers/testHelpers.js";

describe("Amadeus - Rate Limit Testing", () => {
  // Configuración de Amadeus
  const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
  const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
  const AMADEUS_HOST = "https://api.amadeus.com";
  // Primero obtenemos token de autenticación
  const AUTH_ENDPOINT = `${AMADEUS_HOST}/v1/security/oauth2/token`;
  const FLIGHT_ENDPOINT = `${AMADEUS_HOST}/v2/shopping/flight-offers`;

  let accessToken = null;

  beforeAll(async () => {
    /**
     * Amadeus requiere OAuth2 para acceso
     * Obtenemos el token antes de los tests
     */
    const payload = {
      endpoint: AUTH_ENDPOINT,
      request: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: {
          grant_type: "client_credentials",
          client_id: AMADEUS_CLIENT_ID,
          client_secret: AMADEUS_CLIENT_SECRET,
        },
        form: true,
      },
      clients: 1,
      totalRequests: 1,
    };

    try {
      const {
        body: { jobId },
      } = await request(app).post("/tests/run").send(payload).expect(202);
      const job = await waitForJob(app, jobId);

      if (job.results[0].statusCode === 200) {
        const response = JSON.parse(job.results[0].body);
        accessToken = response.access_token;
        console.log("✓ Token de Amadeus obtenido");
      }
    } catch (error) {
      console.warn("Advertencia: No se pudo obtener token de Amadeus:", error.message);
    }
  }, 20000);

  it("CASE 1: Verify Authentication and Single Flight Search Request", async () => {
    if (!accessToken) {
      console.warn("⚠️ Token no disponible, saltando test");
      return;
    }

    const payload = {
      endpoint: `${FLIGHT_ENDPOINT}?origin=MAD&destination=BCN&departureDate=2025-03-15&adults=1`,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    console.log(`Amadeus - Status Code: ${job.results[0].statusCode}`);
    console.log(
      `Amadeus - Headers:`,
      JSON.stringify(job.results[0].headers, null, 2)
    );

    expect(job.status).toBe("completed");
  }, 20000);

  it("CASE 2: Rate Limit - Monitor Response Headers", async () => {
    if (!accessToken) {
      console.warn("⚠️ Token no disponible, saltando test");
      return;
    }

    /**
     * Amadeus permite 10 requests por segundo en la mayoría de endpoints
     * Monitoreamos los headers de rate limit
     * Todas las peticiones se lanzan en paralelo para detectar rate limits
     */
    const payload = {
      endpoint: `${FLIGHT_ENDPOINT}?origin=MAD&destination=BCN&departureDate=2025-03-20&adults=1`,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    console.log(
      "Amadeus - Resultados de Rate Limit:",
      job.results.map((r) => ({
        statusCode: r.statusCode,
        rateLimitRemaining:
          r.headers["x-ratelimit-remaining"] ||
          r.headers["x-rate-limit-remaining"],
        timestamp: new Date().toISOString(),
      }))
    );

    const rateLimited = job.results.find((r) => r.statusCode === 429);
    if (rateLimited) {
      console.log("⚠️ Rate Limit 429 detectado en Amadeus");
    }

    expect(job.summary.total).toBe(5);
  }, 40000);

  it("CASE 3: Burst Request - Check Rate Limiting Behavior", async () => {
    if (!accessToken) {
      console.warn("⚠️ Token no disponible, saltando test");
      return;
    }

    /**
     * Probamos con múltiples clientes simultáneamente
     * para ver cómo Amadeus maneja la limitación bajo carga
     * Todas las peticiones se lanzan en paralelo sin intervalos
     */
    const payload = {
      endpoint: `${FLIGHT_ENDPOINT}?origin=MAD&destination=BCN&departureDate=2025-03-25&adults=1`,
      request: {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
      clients: 5,
      totalRequests: 20,
    };

    const {
      body: { jobId },
    } = await request(app).post("/tests/run").send(payload).expect(202);
    const job = await waitForJob(app, jobId);

    const successCount = job.results.filter((r) => r.statusCode < 400).length;
    const rateLimitedCount = job.results.filter(
      (r) => r.statusCode === 429
    ).length;

    console.log(
      `Amadeus - Exitosos: ${successCount}, Rate Limited: ${rateLimitedCount}/${job.summary.total}`
    );

    expect(job.summary.total).toBe(20);
  }, 60000);
});
