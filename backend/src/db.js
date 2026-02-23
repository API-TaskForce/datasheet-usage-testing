/**
 * Database module - Central export point
 * 
 * Separates logic into:
 * - db/jobs.js - Test job management
 * - db/templates.js - API template management
 */

import {
  createJob,
  updateJob,
  getJob,
  listJobs,
} from './db/jobs.js';

import {
  createTemplate,
  updateTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
} from './db/templates.js';

// =============== JOBS EXPORTS ===============
export {
  createJob,
  updateJob,
  getJob,
  listJobs,
};

// =============== TEMPLATES EXPORTS ===============
export {
  createTemplate,
  updateTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
};
 
