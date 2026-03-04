import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';
import { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate } from '../db.js';
import { error as logError } from '../lib/log.js';

/**
 * Create a new API Template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createNewTemplate(templateData) {
  try {
    // Validate YAML
    validateYAML(templateData.datasheet);

    const template = {
      id: uuidv4(),
      name: templateData.name,
      authMethod: templateData.authMethod,
      authCredential: templateData.authCredential,
      apiUri: templateData.apiUri,
      datasheet: templateData.datasheet,
      status: templateData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await createTemplate(template);
  } catch (err) {
    logError(`Error creating template: ${err.message}`);
    throw err;
  }
}

/**
 * Get template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object|null>} Template or null
 */
export async function getTemplateById(id) {
  try {
    const template = await getTemplate(id);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  } catch (err) {
    logError(`Error getting template: ${err.message}`);
    throw err;
  }
}

/**
 * Get all templates
 * @returns {Promise<Array>} List of templates
 */
export async function getAllTemplates() {
  try {
    return await listTemplates();
  } catch (err) {
    logError(`Error listing templates: ${err.message}`);
    throw err;
  }
}

/**
 * Update template
 * @param {string} id - Template ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplateById(id, updateData) {
  try {
    // Validate YAML if provided
    if (updateData.datasheet) {
      validateYAML(updateData.datasheet);
    }

    const existing = await getTemplate(id);
    if (!existing) {
      throw new Error('Template not found');
    }

    const updated = await updateTemplate(id, updateData);
    return updated;
  } catch (err) {
    logError(`Error updating template: ${err.message}`);
    throw err;
  }
}

/**
 * Delete template
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Deleted template
 */
export async function deleteTemplateById(id) {
  try {
    const existing = await getTemplate(id);
    if (!existing) {
      throw new Error('Template not found');
    }

    return await deleteTemplate(id);
  } catch (err) {
    logError(`Error deleting template: ${err.message}`);
    throw err;
  }
}

/**
 * Parse YAML datasheet
 * @param {string} yamlContent - YAML content
 * @returns {Object} Parsed YAML
 */
export function parseDatasheet(yamlContent) {
  try {
    if (!yamlContent || typeof yamlContent !== 'string') {
      console.warn('[parseDatasheet] Invalid datasheet content:', { type: typeof yamlContent, isNull: yamlContent === null, isEmpty: yamlContent === '' });
      return null;
    }
    
    if (yamlContent.trim() === '') {
      console.warn('[parseDatasheet] Datasheet is empty string');
      return null;
    }
    
    validateYAML(yamlContent);
    const parsed = YAML.parse(yamlContent);
    console.log('[parseDatasheet] Successfully parsed datasheet with keys:', Object.keys(parsed).slice(0, 5));
    return parsed;
  } catch (err) {
    logError(`Error parsing YAML: ${err.message}`);
    console.error('[parseDatasheet] YAML Content:', yamlContent?.substring(0, 200));
    throw new Error(`Invalid YAML format: ${err.message}`);
  }
}

/**
 * Validate YAML format
 * @param {string} yamlContent - YAML content to validate
 * @throws {Error} If YAML is invalid
 */
function validateYAML(yamlContent) {
  try {
    YAML.parse(yamlContent);
  } catch (err) {
    throw new Error(`Invalid YAML format: ${err.message}`);
  }
}

/**
 * Get template with parsed datasheet
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Template with parsed datasheet
 */
export async function getTemplateWithParsedDatasheet(id) {
  try {
    const template = await getTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }
    
    console.log('[getTemplateWithParsedDatasheet] Template found:', { id: template.id, hasDatasheet: !!template.datasheet });
    
    return {
      ...template,
      datasheet: template.datasheet ? parseDatasheet(template.datasheet) : null,
    };
  } catch (err) {
    logError(`Error getting template with parsed datasheet: ${err.message}`);
    throw err;
  }
}
