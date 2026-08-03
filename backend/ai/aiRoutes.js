import express from 'express';
import { getHealth } from './aiController.js';

const router = express.Router();

// Public health check route for the AI module configuration status
router.get('/health', getHealth);

export default router;
