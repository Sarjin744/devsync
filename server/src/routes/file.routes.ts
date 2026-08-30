import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  uploadFile,
  getFiles,
  getFileDetails,
  downloadFile,
  renameFile,
  deleteFile,
} from '../controllers/file.controller';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);

// Project file collections
router.post('/project/:projectId', upload.single('file'), uploadFile);
router.get('/project/:projectId', getFiles);

// Individual file operations
router.get('/:fileId', getFileDetails);
router.get('/:fileId/download', downloadFile);
router.patch('/:fileId', renameFile);
router.delete('/:fileId', deleteFile);

export default router;
