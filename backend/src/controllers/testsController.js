import { startTest, getJob, getAllTests } from '../services/testsService.js';

export async function runTest(req, res, next) {
  try {
    const config = req.body;
    const job = await startTest(config);
    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (err) {
    next(err);
  }
}

export async function getAllTestsController(req, res, next) {
  try {
    const jobs = await getAllTests();
    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function getTest(req, res, next) {
  try {
    const job = await getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
} 
