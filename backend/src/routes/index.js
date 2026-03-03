import express from 'express';
import {
  runTest,
  getTest,
  getAllTestsController,
  getActiveJobController,
} from '../controllers/testsController.js';

const router = express.Router();

// ... (in the GET section)
// GET /tests/:id/active
router.get('/:id/active', (req, res) => {
  if (req.routeType === 'tests') {
    getActiveJobController(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});
import {
  createTemplate,
  getTemplate,
  getAllTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateDatasheet,
} from '../controllers/apiTemplatesController.js';
import {
  createConfig,
  listConfigs,
  updateConfig,
  deleteConfig,
  getConfig,
} from '../controllers/testConfigsController.js';
import { validateTestSchema, validateTemplateSchema } from '../middlewares/validator.js';

// Determine if this is a templates, tests or configs route based on the request path
router.use((req, res, next) => {
  if (req.baseUrl.includes('/templates')) req.routeType = 'templates';
  else if (req.baseUrl.includes('/tests')) req.routeType = 'tests';
  else if (req.baseUrl.includes('/test-configs')) req.routeType = 'configs';
  next();
});

// =============== Test Configs Routes ===============
router.get('/', (req, res) => {
  if (req.routeType === 'configs') {
    listConfigs(req, res);
  } else if (req.routeType === 'tests') {
    getAllTestsController(req, res);
  } else if (req.routeType === 'templates') {
    getAllTemplate(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

router.post('/', (req, res) => {
  if (req.routeType === 'configs') {
    createConfig(req, res);
  } else if (req.routeType === 'templates') {
    validateTemplateSchema(req, res, () => {
      createTemplate(req, res);
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

router.post('/run', validateTestSchema, (req, res) => {
  if (req.routeType === 'tests') {
    runTest(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

router.get('/:id', (req, res) => {
  if (req.routeType === 'configs') {
    getConfig(req, res);
  } else if (
    req.routeType === 'tests' &&
    req.params.id !== 'detail' &&
    !req.params.id.includes('datasheet')
  ) {
    getTest(req, res);
  } else if (req.routeType === 'templates') {
    // ... templates logic
    if (req.params.id === 'datasheet') getTemplateDatasheet(req, res);
    else getTemplate(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

router.put('/:id', (req, res) => {
  if (req.routeType === 'configs') {
    updateConfig(req, res);
  } else if (req.routeType === 'templates') {
    validateTemplateSchema(req, res, () => {
      updateTemplate(req, res);
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

router.delete('/:id', (req, res) => {
  if (req.routeType === 'configs') {
    deleteConfig(req, res);
  } else if (req.routeType === 'templates') {
    deleteTemplate(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
