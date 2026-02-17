import { request as httpRequest } from './lib/httpClient.js';
import { createJob, updateJob, getJob } from './db.js';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

async function startTest(config) {
  const id = makeId();
  const job = {
    id,
    config,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    results: []
  };

  await createJob(job);

  // run asynchronously
  setImmediate(() => runJob(id).catch(err => console.error('Engine error:', err)));

  return job;
}

async function runJob(id) {
  const job = await getJob(id);
  if (!job) throw new Error('Job not found');
  const { config } = job;
  const { endpoint, request, clients = 1, totalRequests = 1, intervalMs = 0, timeoutMs = 5000 } = config;

  await updateJob(id, { status: 'running', startedAt: new Date().toISOString() });

  const results = [];
  let sent = 0;

  // simple worker that sends requests sequentially per client
  async function worker(workerIndex, quota) {
    for (let i = 0; i < quota; i++) {
      const attempt = ++sent;
      const start = Date.now();
      try {
        const res = await httpRequest({
          url: endpoint,
          method: request.method || 'GET',
          headers: request.headers || {},
          data: request.body,
          timeout: timeoutMs,
          validateStatus: () => true, // capture all status codes
          retries: 1,
          retryDelay: 150
        });
        const elapsed = Date.now() - start;
        const item = { seq: attempt, status: 'ok', statusCode: res.status, durationMs: elapsed, timestamp: new Date().toISOString() };
        results.push(item);
      } catch (err) {
        const elapsed = Date.now() - start;
        results.push({ seq: attempt, status: 'error', message: err.message, durationMs: elapsed, timestamp: new Date().toISOString() });
      }

      // persist partial results every N requests
      if (results.length % 5 === 0) {
        await updateJob(id, { results: [...results] });
      }

      if (intervalMs) await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  // split workload across clients
  const perClient = Math.floor(totalRequests / clients);
  const remainder = totalRequests % clients;
  const workers = [];
  for (let i = 0; i < clients; i++) {
    const quota = perClient + (i < remainder ? 1 : 0);
    if (quota > 0) workers.push(worker(i, quota));
  }

  await Promise.all(workers);

  await updateJob(id, { status: 'completed', finishedAt: new Date().toISOString(), results: [...results] });
  return getJob(id);
}

export { startTest, getJob }; 
