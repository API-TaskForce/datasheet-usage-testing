import {
  createNewTemplate,
  getTemplateById,
  getAllTemplates,
  updateTemplateById,
  deleteTemplateById,
  parseDatasheet,
  getTemplateWithParsedDatasheet,
} from '../services/apiTemplatesService.js';
import { success, error as logError } from '../lib/log.js';

/**
 * POST /templates
 * Create a new API template
 */
export async function createTemplate(req, res) {
  try {
    const template = await createNewTemplate(req.body);
    success(`Template created: ${template.id}`);
    res.status(201).json(template);
  } catch (err) {
    logError(`Error creating template: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
}

/**
 * GET /templates/:id
 * Get a template by ID
 */
export async function getTemplate(req, res) {
  try {
    const template = await getTemplateById(req.params.id);
    res.json(template);
  } catch (err) {
    logError(`Error getting template: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
}

/**
 * GET /templates
 * Get all templates
 */
export async function getAllTemplate(req, res) {
  try {
    const templates = await getAllTemplates();
    res.json({
      data: templates,
      totalCount: templates.length,
    });
  } catch (err) {
    logError(`Error listing templates: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /templates/:id
 * Update a template
 */
export async function updateTemplate(req, res) {
  try {
    const updated = await updateTemplateById(req.params.id, req.body);
    success(`Template updated: ${req.params.id}`);
    res.json(updated);
  } catch (err) {
    logError(`Error updating template: ${err.message}`);
    const statusCode = err.message === 'Template not found' ? 404 : 400;
    res.status(statusCode).json({ error: err.message });
  }
}

/**
 * DELETE /templates/:id
 * Delete a template
 */
export async function deleteTemplate(req, res) {
  try {
    const deleted = await deleteTemplateById(req.params.id);
    success(`Template deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logError(`Error deleting template: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
}

/**
 * GET /templates/:id/datasheet
 * Get template with parsed datasheet
 */
export async function getTemplateDatasheet(req, res) {
  try {
    const template = await getTemplateWithParsedDatasheet(req.params.id);
    res.json(template);
  } catch (err) {
    logError(`Error getting template datasheet: ${err.message}`);
    const statusCode = err.message.includes('YAML') ? 422 : 404;
    res.status(statusCode).json({ error: err.message });
  }
}
