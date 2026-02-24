import { promises as fs } from 'fs';
import path from 'path';

function dbFilePath() {
  // Use a dedicated file for test jobs/logs to keep templates DB separate.
  // Allow overriding via JOBS_DB_FILE env var for flexibility in tests/environments.
  return process.env.JOBS_DB_FILE || path.join(process.cwd(), 'data', 'test-logs.json');
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
    if (err.code === 'ENOENT') {
      // If the per-jobs file doesn't exist, attempt to migrate `jobs` from the main db.json
      // to keep existing data intact when separating storage.
      try {
        const mainFile = path.join(process.cwd(), 'data', 'db.json');
        const mainContent = await fs.readFile(mainFile, 'utf8').catch(() => null);
        if (mainContent) {
          const mainDb = JSON.parse(mainContent || '{}');
          if (mainDb.jobs && Object.keys(mainDb.jobs).length > 0) {
            // Write jobs to new file (wrap under `jobs`) and remove from main db
            const jobsDb = { jobs: { ...mainDb.jobs } };
            await writeDbToPath(file, jobsDb);

            // Remove jobs from main DB and persist
            delete mainDb.jobs;
            await fs.writeFile(mainFile, JSON.stringify(mainDb, null, 2), 'utf8').catch(() => {});

            return jobsDb;
          }
        }
      } catch (migrateErr) {
        // ignore migration errors and return empty
      }
      return {};
    }
    throw err;
  }
}

// helper to write to arbitrary path (used by migration)
async function writeDbToPath(targetPath, obj) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(obj, null, 2), 'utf8');
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
