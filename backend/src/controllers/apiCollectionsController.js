import {
  createNewCollection,
  getCollectionById,
  getAllCollections,
  updateCollectionById,
  deleteCollectionById,
} from '../services/apiCollectionsService.js';
import { success, error as logError } from '../lib/log.js';

export async function createCollection(req, res) {
  try {
    const collection = await createNewCollection(req.body);
    success(`Collection created: ${collection.id}`);
    res.status(201).json(collection);
  } catch (err) {
    logError(`Error creating collection: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
}

export async function getCollection(req, res) {
  try {
    const collection = await getCollectionById(req.params.id);
    res.json(collection);
  } catch (err) {
    logError(`Error getting collection: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
}

export async function getAllCollectionsController(req, res) {
  try {
    const collections = await getAllCollections();
    res.json({ data: collections, totalCount: collections.length });
  } catch (err) {
    logError(`Error listing collections: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}

export async function updateCollection(req, res) {
  try {
    const updated = await updateCollectionById(req.params.id, req.body);
    success(`Collection updated: ${req.params.id}`);
    res.json(updated);
  } catch (err) {
    logError(`Error updating collection: ${err.message}`);
    const statusCode = err.message === 'Collection not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
}

export async function deleteCollection(req, res) {
  try {
    await deleteCollectionById(req.params.id);
    success(`Collection deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logError(`Error deleting collection: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
}
