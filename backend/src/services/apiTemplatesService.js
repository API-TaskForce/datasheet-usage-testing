import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';
import { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate } from '../db.js';
import { error as logError } from '../lib/log.js';

/**
 * Detect if a template is a Dummy API based on name or URI
 * @param {string} name - Template name
 * @param {string} apiUri - Template URI
 * @returns {boolean} True if it should be treated as a Dummy API
 */
function detectIsDummyAPI(name, apiUri) {
  const nameLower = (name || '').toLowerCase();
  const uriLower = (apiUri || '').toLowerCase();
  
  // Check if name contains "dummy"
  if (nameLower.includes('dummy')) {
    return true;
  }
  
  // Check if URI is a known dummy/testing service
  const dummyIndicators = [
    'jsonplaceholder',
    'httpbin',
    'mockapi',
    'reqres',
    'demo',
  ];
  
  for (const indicator of dummyIndicators) {
    if (uriLower.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Create a new API Template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createNewTemplate(templateData) {
  try {
    // Validate YAML
    validateYAML(templateData.datasheet);

    // Detect if it's a dummy API (either explicitly set or auto-detected)
    const isDummy = Boolean(templateData.isDummy) || detectIsDummyAPI(templateData.name, templateData.apiUri);

    // If it's a dummy API, ensure it has a default config
    let dummyConfig = null;
    if (isDummy) {
      dummyConfig = templateData?.dummyConfig || {
        rateMax: 60,
        quotaMax: 1000,
        windowType: 'FIXED_WINDOW',
        coolingPeriodMs: 30000,
        windowSeconds: 60,
        totalRequests: 1000,
      };
    } else {
      dummyConfig = templateData?.dummyConfig && typeof templateData.dummyConfig === 'object' 
        ? templateData.dummyConfig 
        : null;
    }

    const template = {
      id: uuidv4(),
      name: templateData.name,
      authMethod: templateData.authMethod,
      authCredential: templateData.authCredential,
      apiUri: templateData.apiUri,
      datasheet: templateData.datasheet,
      status: templateData.status || 'active',
      isDummy,
      dummyConfig,
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

    // Detect or preserve isDummy flag
    const name = updateData.name !== undefined ? updateData.name : existing.name;
    const apiUri = updateData.apiUri !== undefined ? updateData.apiUri : existing.apiUri;
    const isDummy = updateData.isDummy !== undefined 
      ? Boolean(updateData.isDummy)
      : (existing.isDummy || detectIsDummyAPI(name, apiUri));

    // Ensure dummyConfig exists if it's a dummy API
    let dummyConfig = updateData.dummyConfig;
    if (isDummy) {
      dummyConfig = updateData.dummyConfig || existing.dummyConfig || {
        rateMax: 60,
        quotaMax: 1000,
        windowType: 'FIXED_WINDOW',
        coolingPeriodMs: 30000,
        windowSeconds: 60,
        totalRequests: 1000,
      };
    } else if (updateData.dummyConfig === null || (updateData.dummyConfig === undefined && !isDummy)) {
      dummyConfig = null;
    }

    const fieldsToUpdate = {
      ...updateData,
      isDummy,
      dummyConfig,
    };

    const updated = await updateTemplate(id, fieldsToUpdate);
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
 * Extract numerical value from various formats
 * @param {*} value - Value to extract (can be number, string, object)
 * @returns {number|null} Extracted number or null
 */
function extractFirstNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return null;

  const match = value.replace(/,/g, '').match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? null : num;
}

/**
 * Parse duration string to seconds
 * @param {*} value - Duration value (number, string like "30s", "5m", "1h")
 * @returns {number|null} Duration in seconds or null
 */
function parseDurationToSeconds(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return null;

  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const numMatch = raw.match(/\d+/);
  if (!numMatch) return null;
  const n = parseInt(numMatch[0], 10);
  if (Number.isNaN(n)) return null;

  if (raw.includes('hour') || raw.includes('hora') || raw.endsWith('h')) return n * 3600;
  if (raw.includes('minute') || raw.includes('min') || raw.includes('minuto') || raw.endsWith('m'))
    return n * 60;
  return n;
}

/**
 * Normalize window model type to standard values
 * @param {string} windowType - Window type from datasheet
 * @returns {string} Normalized window model: UNLIMITED, FIXED_WINDOW, SLIDING_WINDOW, or UNKNOWN
 */
function normalizeWindowModel(windowType) {
  const v = String(windowType || '').toUpperCase();
  if (!v) return 'UNKNOWN';
  
  if (v.includes('UNLIMITED') || v.includes('ILIMITADO') || v.includes('NONE')) return 'UNLIMITED';
  if (v.includes('SLID')) return 'SLIDING_WINDOW';
  if (v.includes('FIXED') || v.includes('FIJO') || v.includes('DAILY') || v.includes('MONTHLY') || v.includes('CUSTOM')) {
    return 'FIXED_WINDOW';
  }
  
  return 'UNKNOWN';
}

/**
 * Extract API limits from parsed datasheet
 * @param {Object} datasheet - Parsed YAML datasheet
 * @returns {Object} Limits object with { quotaMax, rateMax, windowModel, windowSeconds, cooldownSeconds, source }
 */
export function extractLimitsFromDatasheet(datasheet) {
  const result = {
    quotaMax: null,
    rateMax: null,
    windowModel: 'UNKNOWN',
    windowSeconds: null,
    cooldownSeconds: null,
    source: 'datasheet',
  };

  if (!datasheet || typeof datasheet !== 'object') {
    result.source = 'none';
    return result;
  }

  // Extract quota from capacity array
  const quotaCandidates = [];
  if (Array.isArray(datasheet.capacity)) {
    datasheet.capacity.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const isQuota = !entry.type || String(entry.type).toUpperCase().includes('QUOTA');
      if (!isQuota) return;
      const n = extractFirstNumber(entry.value);
      if (n !== null) quotaCandidates.push(n);
    });
  }

  result.quotaMax = quotaCandidates.length > 0 ? Math.max(...quotaCandidates) : null;

  // Extract rate from maxPower or rateLimit
  if (datasheet.maxPower) {
    if (typeof datasheet.maxPower === 'object') {
      result.rateMax = extractFirstNumber(datasheet.maxPower.value);
    } else {
      result.rateMax = extractFirstNumber(datasheet.maxPower);
    }
  }

  if (result.rateMax === null && datasheet.rateLimit && typeof datasheet.rateLimit === 'object') {
    if (typeof datasheet.rateLimit.requestsPerMinute === 'number') {
      result.rateMax = datasheet.rateLimit.requestsPerMinute;
    } else if (typeof datasheet.rateLimit.requestsPerSecond === 'number') {
      result.rateMax = datasheet.rateLimit.requestsPerSecond * 60;
    }
  }

  // Extract window type and determine model
  let windowTypeRaw = null;
  if (Array.isArray(datasheet.capacity)) {
    const withWindow = datasheet.capacity.find((entry) => entry && entry.windowType);
    if (withWindow) windowTypeRaw = withWindow.windowType;
  }

  if (!windowTypeRaw && datasheet.rateLimit?.windowType) {
    windowTypeRaw = datasheet.rateLimit.windowType;
  }

  result.windowModel = normalizeWindowModel(windowTypeRaw);

  // Extract cooldown/window duration
  if (datasheet.coolingPeriod) {
    result.cooldownSeconds = parseDurationToSeconds(datasheet.coolingPeriod);
  }

  if (!result.cooldownSeconds && datasheet.rateLimit?.window) {
    result.cooldownSeconds = parseDurationToSeconds(datasheet.rateLimit.window);
  }

  if (!result.cooldownSeconds && datasheet.maxPower?.window) {
    result.cooldownSeconds = parseDurationToSeconds(datasheet.maxPower.window);
  }

  // Set window seconds (for fixed windows)
  if (result.cooldownSeconds) {
    result.windowSeconds = result.cooldownSeconds;
  }

  // Default cooldown if not specified
  if (!result.cooldownSeconds) {
    result.cooldownSeconds = 30;
  }

  // If no limits detected, treat as unlimited
  if (result.quotaMax === null && result.rateMax === null && result.windowModel === 'UNKNOWN') {
    result.windowModel = 'UNLIMITED';
  }

  return result;
}

/**
 * Get API limits for a template (from datasheet or defaults)
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Limits object
 */
export async function getTemplateLimits(id) {
  try {
    const template = await getTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    // If template has datasheet, extract limits from it
    if (template.datasheet) {
      const parsed = parseDatasheet(template.datasheet);
      const limits = extractLimitsFromDatasheet(parsed);
      
      console.log('[getTemplateLimits] Extracted limits:', {
        templateId: id,
        quotaMax: limits.quotaMax,
        rateMax: limits.rateMax,
        windowModel: limits.windowModel,
        cooldownSeconds: limits.cooldownSeconds,
      });
      
      return limits;
    }

    // Return default/unknown limits if no datasheet
    return {
      quotaMax: null,
      rateMax: null,
      windowModel: 'UNKNOWN',
      windowSeconds: null,
      cooldownSeconds: 30,
      source: 'default',
    };
  } catch (err) {
    logError(`Error getting template limits: ${err.message}`);
    throw err;
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
