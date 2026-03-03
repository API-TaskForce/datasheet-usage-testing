import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function dbFilePath() {
  return process.env.TEST_CONFIGS_DB_FILE || path.join(process.cwd(), 'data', 'test-configs.json');
}

async function readDb() {
  const file = dbFilePath();
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content || '{"configs": {}}');
  } catch (err) {
    if (err.code === 'ENOENT') return { configs: {} };
    throw err;
  }
}

async function writeDb(obj) {
  const file = dbFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
}

export async function createTestConfig(config) {
  const db = await readDb();
  const id = uuidv4();
  const newConfig = { ...config, id, createdAt: new Date().toISOString() };
  db.configs[id] = newConfig;
  await writeDb(db);
  return newConfig;
}

export async function updateTestConfig(id, patch) {
  const db = await readDb();
  if (!db.configs[id]) return null;
  db.configs[id] = { ...db.configs[id], ...patch, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.configs[id];
}

export async function deleteTestConfig(id) {
  const db = await readDb();
  if (!db.configs[id]) return false;
  delete db.configs[id];
  await writeDb(db);
  return true;
}

export async function listTestConfigs(templateId) {
  const db = await readDb();
  const all = Object.values(db.configs);
  if (templateId) {
    return all.filter(c => c.apiTemplateId === templateId);
  }
  return all;
}

export async function getTestConfig(id) {
  const db = await readDb();
  return db.configs[id] || null;
}
