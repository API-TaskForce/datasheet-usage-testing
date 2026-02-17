import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');

async function readDb() {
  try {
    const content = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeDb(obj) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

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
