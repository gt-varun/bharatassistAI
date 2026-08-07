import { Router } from 'express';
import { generateChatCompletion } from '../../services/ai/geminiClient.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.post('/chat', async (req, res, next) => {
  try {
    const { prompt, context } = req.body;
    const response = await generateChatCompletion({ prompt, context });
    return sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});

export default router;
