import { info, log } from '../lib/log.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const delta = Date.now() - start;
    const status = res.statusCode;
    const statusFlag = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    // condensed single-line log with level flag and duration
    log(statusFlag === 'warn' ? 'INFO' : statusFlag, `${req.method} ${req.originalUrl} ${status} - ${delta}ms`);
  });
  next();
}

export { info };
 
