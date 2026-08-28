import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { sql, initDb, pool } from '../config/db.js';

async function seed() {
  await initDb();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@school.test';
  const name = process.env.SEED_ADMIN_NAME || 'School Admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert: safe to re-run any time. If this email already has an account,
  // its password is reset to match SEED_ADMIN_PASSWORD rather than silently
  // leaving whatever password was set the first time this ever ran.
  const { rows } = await sql`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (${nanoid()}, ${name}, ${email}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name
    RETURNING (xmax = 0) AS inserted
  `;

  const created = rows[0]?.inserted;
  console.log(
    `${created ? 'Created' : 'Reset password for'} staff login:\n  email: ${email}\n  password: ${password}\n(change this after first login)`
  );
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
