import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { sql, initDb } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcastToRecipients } from '../services/whatsappService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Buffered in memory: it's then either pushed to Vercel Blob (production)
// or written to the local uploads/ dir (dev, see storeFile below).
// 25MB cap, matching WhatsApp's upper bound for documents/video.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router({ mergeParams: true });
router.use(requireAuth);

function mediaTypeFromMime(mime = '') {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

async function storeFile(file) {
  const filename = `${nanoid()}${path.extname(file.originalname)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob.url;
  }

  // Local dev fallback: Vercel's filesystem is read-only in production, so
  // this branch only runs when BLOB_READ_WRITE_TOKEN isn't set.
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads/${filename}`;
}

function toMessage(row) {
  return {
    id: row.id,
    classGroupId: row.class_group_id,
    type: row.type,
    body: row.body,
    mediaUrl: row.media_url,
    mediaFilename: row.media_filename,
    recipientCount: row.recipient_count,
    status: row.status,
    sentBy: row.sent_by,
    sentAt: row.sent_at,
    results: row.results,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await initDb();
    const { rows } = await sql`
      SELECT * FROM messages WHERE class_group_id = ${req.params.classId} ORDER BY sent_at DESC
    `;
    res.json(rows.map(toMessage));
  })
);

// multipart/form-data: { body?: string, file?: binary }
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { body } = req.body || {};
    const file = req.file;

    if (!body && !file) {
      return res.status(400).json({ error: 'Provide a text body, a file, or both.' });
    }

    await initDb();
    const { rows: classRows } = await sql`SELECT id FROM class_groups WHERE id = ${req.params.classId}`;
    if (!classRows.length) return res.status(404).json({ error: 'Class not found.' });

    const { rows: parentRows } = await sql`
      SELECT phone FROM parents WHERE class_group_id = ${req.params.classId}
    `;
    const recipients = parentRows.map((p) => p.phone);

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'This class has no parent contacts yet.' });
    }

    const type = file ? mediaTypeFromMime(file.mimetype) : 'text';
    const mediaUrl = file ? await storeFile(file) : undefined;

    const results = await broadcastToRecipients({
      recipients,
      type,
      body,
      mediaUrl,
      filename: file?.originalname,
    });

    const allOk = results.every((r) => r.ok);
    const id = nanoid();
    const status = allOk ? 'queued (mock)' : 'partial failure (mock)';

    const { rows } = await sql`
      INSERT INTO messages (
        id, class_group_id, type, body, media_url, media_filename,
        recipient_count, status, sent_by, results
      ) VALUES (
        ${id}, ${req.params.classId}, ${type}, ${body || null}, ${mediaUrl || null},
        ${file?.originalname || null}, ${recipients.length}, ${status},
        ${req.user.name || req.user.email}, ${JSON.stringify(results)}
      )
      RETURNING *
    `;

    res.status(201).json(toMessage(rows[0]));
  })
);

export default router;
