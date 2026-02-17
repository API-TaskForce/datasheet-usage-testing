import request from 'supertest';
import app from '../src/server.js';
import path from 'path';
import { promises as fs } from 'fs';
import { waitForJob } from './helpers/testHelpers.js';

const TEST_DB = path.join(process.cwd(), 'data', 'test-db.json');

describe('External API: The Simpsons (integration)', () => {
  beforeAll(async () => {
    process.env.DB_FILE = TEST_DB;
    await fs.rm(TEST_DB, { force: true }).catch(() => {});
  });

  afterAll(async () => {
    await fs.rm(TEST_DB, { force: true }).catch(() => {});
  });

  it('engine can call The Simpsons API and record results', async () => {
    const payload = {
      endpoint: 'https://thesimpsonsapi.com/api/characters',
      request: { method: 'GET' },
      clients: 1,
      totalRequests: 2,
      intervalMs: 50,
      timeoutMs: 5000
    };

    const runRes = await request(app).post('/tests/run').send(payload).expect(202);
    const jobId = runRes.body.jobId;

    // use helper
    const job = await waitForJob(app, jobId, { timeout: 15000, interval: 100 });

    expect(job).toBeDefined();
    expect(job.status).toBe('completed');
    expect(Array.isArray(job.results)).toBe(true);
    // at least one successful 200 response recorded
    expect(job.results.some(r => r.status === 'ok' && r.statusCode === 200)).toBe(true);
  }, 15000);
});
