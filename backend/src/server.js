import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import routes from './routes/index.js';
import { proxyRequest } from './controllers/proxyController.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';

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

// health
app.get('/', (req, res) => res.json({ service: 'api-limiter-service', status: 'ok' }));

// API Routes
// /tests -> for test execution and retrieval
// /templates -> for API template management
app.use('/tests', routes);
app.use('/templates', routes);

// error handler
app.use(errorHandler);

import { success } from './lib/log.js';

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    success(`api-limiter-service listening on http://localhost:${PORT}`);
  });
}
