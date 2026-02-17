import express from 'express';
import { runTest, getTest } from '../controllers/testsController.js';
import { validateTestSchema } from '../middlewares/validator.js';

const router = express.Router();

// POST /tests/run
router.post('/run', validateTestSchema, runTest);

// GET /tests/:id
router.get('/:id', getTest);

export default router;
