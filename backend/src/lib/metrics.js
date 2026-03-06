import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Métrica para los tests del Engine
export const engineRequestsCounter = client.register.getSingleMetric('engine_requests_total') || new client.Counter({
  name: 'engine_requests_total',
  help: 'Total de peticiones ejecutadas por el motor de tests',
  labelNames: ['jobId', 'status_type'],
});

export const engineRequestDurationHistogram = client.register.getSingleMetric('engine_request_duration_seconds') || new client.Histogram({
  name: 'engine_request_duration_seconds',
  help: 'Duración de las peticiones ejecutadas por el motor',
  labelNames: ['jobId', 'status_type'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export { register };
