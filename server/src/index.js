import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb } from './config/db.js';
import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import parentRoutes from './routes/parents.js';
import messageRoutes from './routes/messages.js';
import { whatsappMode } from './services/whatsappService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

await initDb();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SchoolComms API listening on http://localhost:${PORT} (WhatsApp mode: ${whatsappMode})`);
});
