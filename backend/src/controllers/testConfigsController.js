import * as db from '../db.js';

export async function createConfig(req, res, next) {
  try {
    const config = await db.createTestConfig(req.body);
    res.status(201).json(config);
  } catch (err) {
    next(err);
  }
}

export async function listConfigs(req, res, next) {
  try {
    const { templateId } = req.query;
    const configs = await db.listTestConfigs(templateId);
    res.json({ data: configs });
  } catch (err) {
    next(err);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const config = await db.updateTestConfig(req.params.id, req.body);
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (err) {
    next(err);
  }
}

export async function deleteConfig(req, res, next) {
  try {
    const deleted = await db.deleteTestConfig(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Config not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getConfig(req, res, next) {
  try {
    const config = await db.getTestConfig(req.params.id);
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (err) {
    next(err);
  }
}
