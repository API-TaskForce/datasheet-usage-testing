import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use('/tests', routes);

// health
app.get('/', (req, res) => res.json({ service: 'api-limiter-service', status: 'ok' }));

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
