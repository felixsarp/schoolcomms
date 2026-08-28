import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcastToRecipients } from '../services/whatsappService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

// 25MB cap, matching WhatsApp's upper bound for documents/video.
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router({ mergeParams: true });
router.use(requireAuth);

function mediaTypeFromMime(mime = '') {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

router.get('/', async (req, res) => {
  await db.read();
  const list = db.data.messages
    .filter((m) => m.classGroupId === req.params.classId)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(list);
});

// multipart/form-data: { body?: string, file?: binary }
router.post('/', upload.single('file'), async (req, res) => {
  const { body } = req.body || {};
  const file = req.file;

  if (!body && !file) {
    return res.status(400).json({ error: 'Provide a text body, a file, or both.' });
  }

  await db.read();
  const classGroup = db.data.classGroups.find((c) => c.id === req.params.classId);
  if (!classGroup) return res.status(404).json({ error: 'Class not found.' });

  const recipients = db.data.parents
    .filter((p) => p.classGroupId === req.params.classId)
    .map((p) => p.phone);

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'This class has no parent contacts yet.' });
  }

  const type = file ? mediaTypeFromMime(file.mimetype) : 'text';
  const mediaUrl = file ? `/uploads/${file.filename}` : undefined;

  const results = await broadcastToRecipients({
    recipients,
    type,
    body,
    mediaUrl,
    filename: file?.originalname,
  });

  const allOk = results.every((r) => r.ok);

  const message = {
    id: nanoid(),
    classGroupId: req.params.classId,
    type,
    body: body || null,
    mediaUrl: mediaUrl || null,
    mediaFilename: file?.originalname || null,
    recipientCount: recipients.length,
    status: allOk ? 'queued (mock)' : 'partial failure (mock)',
    sentBy: req.user.name || req.user.email,
    sentAt: new Date().toISOString(),
    results,
  };

  db.data.messages.push(message);
  await db.write();

  res.status(201).json(message);
});

export default router;
