import { startTest, getJob, getAllTests, getActiveJob, deleteTest, deleteAllTests } from '../services/testsService.js';

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

export function getActiveJobController(req, res) {
  const job = getActiveJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Active job not found' });
  res.json(job);
}

export async function deleteTestController(req, res, next) {
  try {
    const deleted = await deleteTest(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Test log not found' });
    res.json({ message: 'Test log deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAllTestsController(req, res, next) {
  try {
    const count = await deleteAllTests();
    res.json({ message: `${count} test logs deleted successfully`, count });
  } catch (err) {
    next(err);
  }
}
