import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { register } from 'prom-client';

//Imports internos
import { proxyRequest } from './controllers/proxyController.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';
import { success } from './lib/log.js';
import { getMetrics } from './controllers/monitoringController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const app = express();

// CORS configuration for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Proxy endpoint for external API calls (solves CORS) - MUST be before other routes
// POST /proxy with { url, method, headers, body }
app.post('/proxy', proxyRequest);
app.post('/api/proxy', proxyRequest);

// health
app.get('/health', (req, res) => res.json({ service: 'api-limiter-service', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ service: 'api-limiter-service', status: 'ok' }));

// API Routes
// /tests -> for test execution and retrieval
// /templates -> for API template management
// /test-configs -> for predefined test configurations
app.use('/tests', routes);
app.use('/api/tests', routes);
app.use('/templates', routes);
app.use('/api/templates', routes);
app.use('/test-configs', routes);
app.use('/api/test-configs', routes);
app.get('/monitoring/metrics', getMetrics);
app.get('/api/monitoring/metrics', getMetrics);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Serve frontend build in production-like environments when available.
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/api|\/metrics|\/health).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// error handler
app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    success(`api-limiter-service listening on http://localhost:${PORT}`);
  });
}
