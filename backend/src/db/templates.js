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

// ================== API TEMPLATES ==================

async function createTemplate(template) {
  const db = await readDb();
  db.apiTemplates = db.apiTemplates || {};
  db.apiTemplates[template.id] = template;
  await writeDb(db);
  return template;
}

async function updateTemplate(id, patch) {
  const db = await readDb();
  db.apiTemplates = db.apiTemplates || {};
  const existing = db.apiTemplates[id];
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  db.apiTemplates[id] = updated;
  await writeDb(db);
  return updated;
}

async function getTemplate(id) {
  const db = await readDb();
  return (db.apiTemplates || {})[id] || null;
}

async function listTemplates() {
  const db = await readDb();
  return Object.values(db.apiTemplates || {});
}

async function deleteTemplate(id) {
  const db = await readDb();
  db.apiTemplates = db.apiTemplates || {};
  const existing = db.apiTemplates[id];
  if (!existing) return null;
  delete db.apiTemplates[id];
  await writeDb(db);
  return existing;
}

export { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate };
