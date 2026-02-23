import { error as logError } from '../lib/log.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logError(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
} 
