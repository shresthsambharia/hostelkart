import asyncHandler from 'express-async-handler';
import { aiService } from './aiService.js';

/**
 * @desc    Check Gemini AI integration configuration health
 * @route   GET /api/ai/health
 * @access  Public
 */
export const getHealth = asyncHandler(async (req, res) => {
  const configured = aiService.isConfigured();
  res.json({
    success: true,
    provider: 'Gemini',
    configured
  });
});
