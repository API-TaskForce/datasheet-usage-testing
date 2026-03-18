import { v4 as uuidv4 } from 'uuid';
import {
  createCollection,
  updateCollection,
  getCollection,
  listCollections,
  deleteCollection,
} from '../db.js';
import { error as logError } from '../lib/log.js';

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

export async function createNewCollection(payload) {
  try {
    const all = await listCollections();
    const incoming = normalizeName(payload?.name);

    if (!incoming) throw new Error('Collection name is required');
    if (all.some((c) => normalizeName(c.name) === incoming)) {
      throw new Error('A collection with this name already exists');
    }

    const collection = {
      id: uuidv4(),
      name: String(payload.name).trim(),
      description: payload?.description ? String(payload.description).trim() : '',
      color: payload?.color ? String(payload.color).trim() : '#0ea5e9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await createCollection(collection);
  } catch (err) {
    logError(`Error creating collection: ${err.message}`);
    throw err;
  }
}

export async function getCollectionById(id) {
  try {
    const collection = await getCollection(id);
    if (!collection) throw new Error('Collection not found');
    return collection;
  } catch (err) {
    logError(`Error getting collection: ${err.message}`);
    throw err;
  }
}

export async function getAllCollections() {
  try {
    const all = await listCollections();
    return all.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } catch (err) {
    logError(`Error listing collections: ${err.message}`);
    throw err;
  }
}

export async function updateCollectionById(id, payload) {
  try {
    const existing = await getCollection(id);
    if (!existing) throw new Error('Collection not found');

    if (payload?.name) {
      const all = await listCollections();
      const incoming = normalizeName(payload.name);
      const duplicated = all.some((c) => c.id !== id && normalizeName(c.name) === incoming);
      if (duplicated) throw new Error('A collection with this name already exists');
    }

    const patch = {
      ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
      ...(payload.description !== undefined
        ? { description: String(payload.description || '').trim() }
        : {}),
      ...(payload.color !== undefined ? { color: String(payload.color).trim() } : {}),
    };

    const updated = await updateCollection(id, patch);
    if (!updated) throw new Error('Collection not found');
    return updated;
  } catch (err) {
    logError(`Error updating collection: ${err.message}`);
    throw err;
  }
}

export async function deleteCollectionById(id) {
  try {
    const existing = await getCollection(id);
    if (!existing) throw new Error('Collection not found');
    return await deleteCollection(id);
  } catch (err) {
    logError(`Error deleting collection: ${err.message}`);
    throw err;
  }
}
