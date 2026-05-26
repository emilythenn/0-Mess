import { Response } from 'express';
import { FileService } from './file.service';
import { AuthenticatedRequest } from '../../middleware/auth';

export class FileController {
  /**
   * Handles POST /api/files/upload
   * Authenticated route to upload, extract, chunk, embed, and index a document.
   */
  static async uploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded in the request.' });
      }

      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Supabase User context is missing.' });
      }

      // Read group workspace identifier
      const groupId = req.body.groupId || req.query.groupId || 'CS402-G4';
      const { title, description, category } = req.body;

      const result = await FileService.indexFile(
        req.file.originalname,
        `${(req.file.size / 1024).toFixed(0)} KB`,
        category || req.file.mimetype || 'Documents',
        req.file.buffer,
        userId,
        groupId,
        title,
        description
      );

      res.status(200).json({
        message: 'File successfully processed and indexed semantically.',
        ...result,
      });
    } catch (error: any) {
      console.error('Error during uploadFile controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error during indexing.' });
    }
  }

  /**
   * Handles GET /api/files
   * Retrieves a list of all indexed files for the given groupId.
   */
  static async getFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const groupId = (req.query.groupId as string) || 'CS402-G4';
      const files = await FileService.listFiles(groupId);
      
      res.status(200).json({ files });
    } catch (error: any) {
      console.error('Error during getFiles controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error retrieving files.' });
    }
  }

  /**
   * Handles DELETE /api/files/:id
   * Deletes an uploaded file and cascades to delete all chunks.
   */
  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Supabase User context is missing.' });
      }

      await FileService.deleteFile(id);

      res.status(200).json({
        message: 'File and related index vectors successfully removed.',
      });
    } catch (error: any) {
      console.error('Error during deleteFile controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error during deletion.' });
    }
  }

  /**
   * Handles POST /api/files/link
   * Creates a persistent shared URL link resource for a workspace.
   */
  static async createLink(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Supabase User context is missing.' });
      }

      const { title, url, category, description, groupId } = req.body;
      if (!title || !url || !category) {
        return res.status(400).json({ error: 'Missing required fields: title, url, and category.' });
      }

      const resource = await FileService.createLink(
        title,
        url,
        category,
        description || '',
        userId,
        groupId || 'CS402-G4'
      );

      res.status(200).json({
        message: 'Shared link resource created successfully.',
        resource,
      });
    } catch (error: any) {
      console.error('Error during createLink controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error during link creation.' });
    }
  }

  /**
   * Handles PUT /api/files/:id
   * Updates an existing resource (file metadata or link contents).
   */
  static async updateResource(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Supabase User context is missing.' });
      }

      const { id } = req.params;
      const { title, description, url } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Missing required field: title.' });
      }

      const resource = await FileService.updateResource(id, title, description || '', url || null);

      res.status(200).json({
        message: 'Workspace resource updated successfully.',
        resource,
      });
    } catch (error: any) {
      console.error('Error during updateResource controller execution:', error);
      res.status(500).json({ error: error.message || 'Internal server error during update.' });
    }
  }
}
