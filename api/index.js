// Vercel serverless entry point. Maps to /api (see vercel.json rewrites,
// which forward every /api/* request here while preserving the original
// path, so the Express app's own /api/... route mounts still match).
import app from '../server/src/app.js';

export default app;
