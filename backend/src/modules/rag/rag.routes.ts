import { Router } from 'express';
import { RagController } from './rag.controller';
import { verifySupabaseToken } from '../../middleware/auth';

const router = Router();

// POST /api/rag/query - Semantically query workspace files using RAG
router.post('/query', verifySupabaseToken, RagController.query);

export default router;
