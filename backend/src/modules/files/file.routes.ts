import { Router } from 'express';
import multer from 'multer';
import { FileController } from './file.controller';
import { verifySupabaseToken } from '../../middleware/auth';

const router = Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

// POST /api/files/upload - Upload and index a file
router.post('/upload', verifySupabaseToken, upload.single('file'), FileController.uploadFile);

// GET /api/files - Get list of uploaded files
router.get('/', verifySupabaseToken, FileController.getFiles);

// DELETE /api/files/:id - Delete an uploaded file
router.delete('/:id', verifySupabaseToken, FileController.deleteFile);

// POST /api/files/link - Create a persistent link resource
router.post('/link', verifySupabaseToken, FileController.createLink);

// PUT /api/files/:id - Update an existing resource (metadata or link)
router.put('/:id', verifySupabaseToken, FileController.updateResource);

export default router;
