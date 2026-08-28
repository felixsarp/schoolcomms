import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { initDb, db } from '../config/db.js';

async function seed() {
  await initDb();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@school.test';
  const name = process.env.SEED_ADMIN_NAME || 'School Admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const exists = db.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    console.log(`Staff account already exists for ${email}. Nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  db.data.users.push({
    id: nanoid(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  await db.write();

  console.log(`Seeded staff login:\n  email: ${email}\n  password: ${password}\n(change this after first login)`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
