import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { uploadFile, getFiles, deleteFile, downloadFile } from '../controllers/file.controller';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.post('/project/:projectId', upload.single('file'), uploadFile);
router.get('/project/:projectId', getFiles);
router.get('/:fileId/download', downloadFile);
router.delete('/:fileId', deleteFile);

export default router;
