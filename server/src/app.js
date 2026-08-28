import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import parentRoutes from './routes/parents.js';
import messageRoutes from './routes/messages.js';
import { whatsappMode } from './services/whatsappService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Local-disk fallback for uploaded files when Vercel Blob isn't configured.
// Vercel's production filesystem is read-only, so this route (and the
// matching write in routes/messages.js) is dev-only; see BLOB_READ_WRITE_TOKEN.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, whatsappMode });
});

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/classes/:classId/parents', parentRoutes);
app.use('/api/classes/:classId/messages', messageRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

export default app;
