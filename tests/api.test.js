import request from 'supertest';
import app from '../src/server.js';
import http from 'http';
import path from 'path';
import { promises as fs } from 'fs';

const TEST_DB = path.join(process.cwd(), 'data', 'test-db.json');

describe('API Limiter - Endpoints', () => {
  let targetServer;
  let targetUrl;

  beforeAll(async () => {
    process.env.DB_FILE = TEST_DB;
    // ensure test db is clean
    await fs.rm(TEST_DB, { force: true }).catch(() => {});

    // start a tiny target server that always returns 200
    targetServer = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });

    await new Promise((resolve) => targetServer.listen(0, resolve));
    const port = targetServer.address().port;
    targetUrl = `http://127.0.0.1:${port}/`;
  });

  afterAll(async () => {
    if (targetServer) targetServer.close();
    await fs.rm(TEST_DB, { force: true }).catch(() => {});
  });

  it('GET / health', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: 'api-limiter-service', status: 'ok' });
  });

  it('validation fails when payload is invalid', async () => {
    await request(app).post('/tests/run').send({}).expect(400);
  });

  it('run test and retrieve results', async () => {
    const payload = {
      endpoint: targetUrl,
      request: { method: 'GET' },
      clients: 1,
      totalRequests: 3,
      intervalMs: 5,
      timeoutMs: 1000
    };

    const runRes = await request(app).post('/tests/run').send(payload).expect(202);
    expect(runRes.body).toHaveProperty('jobId');
    const jobId = runRes.body.jobId;

    // wait for job to finish (use helper)
    const { waitForJob } = await import('./helpers/testHelpers.js');
    const job = await waitForJob(app, jobId, { timeout: 5000, interval: 100 });

    expect(job).toBeDefined();
    expect(job.status).toBe('completed');
    expect(Array.isArray(job.results)).toBe(true);
    expect(job.results).toHaveLength(3);
    expect(job.results.every(x => x.status === 'ok')).toBe(true);
  }, 10000);

  it('GET unknown job -> 404', async () => {
    await request(app).get('/tests/does-not-exist').expect(404);
  });
});
