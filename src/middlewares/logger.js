export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const delta = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${delta}ms`);
  });
  next();
} 
