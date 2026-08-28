import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { sql, initDb, pool } from '../config/db.js';

async function seed() {
  await initDb();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@school.test';
  const name = process.env.SEED_ADMIN_NAME || 'School Admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const { rows: existing } = await sql`
    SELECT id FROM users WHERE lower(email) = lower(${email}) LIMIT 1
  `;
  if (existing.length) {
    console.log(`Staff account already exists for ${email}. Nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO users (id, name, email, password_hash) VALUES (${nanoid()}, ${name}, ${email}, ${passwordHash})
  `;

  console.log(`Seeded staff login:\n  email: ${email}\n  password: ${password}\n(change this after first login)`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
