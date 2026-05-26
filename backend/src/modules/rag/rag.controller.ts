import { Response } from 'express';
import { RagService } from './rag.service';
import { AuthenticatedRequest } from '../../middleware/auth';

export class RagController {
  /**
   * Handles POST /api/rag/query
   * Authenticated route to query the RAG semantic pipeline.
   */
  static async query(req: AuthenticatedRequest, res: Response) {
    try {
      const { question, groupId } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question parameter is required and must be a string.' });
      }

      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Supabase User context is missing.' });
      }

      const targetGroupId = groupId || 'CS402-G4';

      const result = await RagService.queryRAG(question, targetGroupId, userId);

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error during RAG query controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error during RAG query.' });
    }
  }
}
