import express from 'express';
import { runTest, getTest } from '../controllers/testsController.js';
import {
  createTemplate,
  getTemplate,
  getAllTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateDatasheet,
} from '../controllers/apiTemplatesController.js';
import { validateTestSchema, validateTemplateSchema } from '../middlewares/validator.js';

const router = express.Router();

// Determine if this is a templates or tests route based on the request path
router.use((req, res, next) => {
  req.routeType = req.baseUrl.includes('/templates') ? 'templates' : 'tests';
  next();
});

// =============== Tests Routes ===============
// POST /tests/run
router.post('/run', validateTestSchema, (req, res) => {
  if (req.routeType === 'tests') {
    runTest(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// GET /tests/:id
router.get('/:id', (req, res) => {
  if (req.routeType === 'tests' && req.params.id !== 'detail' && !req.params.id.includes('datasheet')) {
    getTest(req, res);
  } else if (req.routeType === 'templates') {
    // Templates routes
    if (req.params.id === 'datasheet') {
      // GET /templates/:id/datasheet
      getTemplateDatasheet(req, res);
    } else if (req.params.id === 'detail') {
      // This shouldn't be called
      res.status(404).json({ error: 'Not found' });
    } else {
      // GET /templates/:id
      getTemplate(req, res);
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Handle /:id/datasheet for templates
router.get('/:id/datasheet', (req, res) => {
  if (req.routeType === 'templates') {
    getTemplateDatasheet(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST / (create)
router.post('/', (req, res) => {
  if (req.routeType === 'templates') {
    validateTemplateSchema(req, res, () => {
      createTemplate(req, res);
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// GET / (list all)
router.get('/', (req, res) => {
  if (req.routeType === 'templates') {
    getAllTemplate(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// PUT /:id (update)
router.put('/:id', (req, res) => {
  if (req.routeType === 'templates') {
    validateTemplateSchema(req, res, () => {
      updateTemplate(req, res);
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// DELETE /:id
router.delete('/:id', (req, res) => {
  if (req.routeType === 'templates') {
    deleteTemplate(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
