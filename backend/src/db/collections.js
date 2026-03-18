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

async function createCollection(collection) {
  const db = await readDb();
  db.apiCollections = db.apiCollections || {};
  db.apiCollections[collection.id] = collection;
  await writeDb(db);
  return collection;
}

async function updateCollection(id, patch) {
  const db = await readDb();
  db.apiCollections = db.apiCollections || {};
  const existing = db.apiCollections[id];
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  db.apiCollections[id] = updated;
  await writeDb(db);
  return updated;
}

async function getCollection(id) {
  const db = await readDb();
  return (db.apiCollections || {})[id] || null;
}

async function listCollections() {
  const db = await readDb();
  return Object.values(db.apiCollections || {});
}

async function deleteCollection(id) {
  const db = await readDb();
  db.apiCollections = db.apiCollections || {};
  const existing = db.apiCollections[id];
  if (!existing) return null;
  delete db.apiCollections[id];

  // Unlink templates that were assigned to this collection
  db.apiTemplates = db.apiTemplates || {};
  Object.keys(db.apiTemplates).forEach((templateId) => {
    if (db.apiTemplates[templateId]?.collectionId === id) {
      db.apiTemplates[templateId] = {
        ...db.apiTemplates[templateId],
        collectionId: null,
        updatedAt: new Date().toISOString(),
      };
    }
  });

  await writeDb(db);
  return existing;
}

export {
  createCollection,
  updateCollection,
  getCollection,
  listCollections,
  deleteCollection,
};
