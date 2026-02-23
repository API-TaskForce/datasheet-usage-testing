import request from 'supertest';

export async function waitForJob(app, jobId, { timeout = 10000, interval = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await request(app).get(`/tests/${jobId}`);
    if (res.status >= 500) throw new Error(`Server error ${res.status}: ${JSON.stringify(res.body)}`);
    if (res.status === 200 && res.body && (res.body.status === 'completed' || res.body.status === 'failed')) {
      // Normalize results to always include headers object to avoid tests
      // throwing when accessing result.headers[...] if headers are missing
      if (Array.isArray(res.body.results)) {
        res.body.results = res.body.results.map(r => ({
          ...r,
          headers: r.headers || {},
        }));
      }
      return res.body;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`timeout waiting for job ${jobId} after ${timeout}ms`);
}