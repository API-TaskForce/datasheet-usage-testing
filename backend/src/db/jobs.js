import { promises as fs } from 'fs';
import path from 'path';

function dbFilePath() {
  return process.env.DB_FILE || path.join(process.cwd(), 'data', 'db.json');
}

async function readDb() {
  const file = dbFilePath();
  try {
    const content = await fs.readFile(file, 'utf8');
    try {
      return JSON.parse(content || '{}');
    } catch (parseErr) {
      // backup corrupted file and return empty DB
      const backup = `${file}.corrupt-${Date.now()}`;
      await fs.writeFile(backup, content, 'utf8').catch(() => {});
      console.error(`db.json parse error - backed up to ${backup}`);
      return {};
    }
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeDb(obj) {
  const file = dbFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
}

// ================== JOBS ==================

async function createJob(job) {
  const db = await readDb();
  db.jobs = db.jobs || {};
  db.jobs[job.id] = job;
  await writeDb(db);
  return job;
}

async function updateJob(id, patch) {
  const db = await readDb();
  db.jobs = db.jobs || {};
  const existing = db.jobs[id];
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  db.jobs[id] = updated;
  await writeDb(db);
  return updated;
}

async function getJob(id) {
  const db = await readDb();
  return (db.jobs || {})[id] || null;
}

async function listJobs() {
  const db = await readDb();
  return Object.values(db.jobs || {});
}

export { createJob, updateJob, getJob, listJobs };
