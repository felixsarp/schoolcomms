import app from './app.js';
import { initDb } from './config/db.js';
import { whatsappMode } from './services/whatsappService.js';

await initDb();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SchoolComms API listening on http://localhost:${PORT} (WhatsApp mode: ${whatsappMode})`);
});
