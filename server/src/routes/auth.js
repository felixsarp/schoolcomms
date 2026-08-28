import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { sql, initDb } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  await initDb();
  const { rows } = await sql`SELECT * FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Any logged-in staff member can add another staff member.
router.post('/users', requireAuth, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  await initDb();
  const { rows: existing } = await sql`
    SELECT id FROM users WHERE lower(email) = lower(${email}) LIMIT 1
  `;
  if (existing.length) {
    return res.status(409).json({ error: 'A staff account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = nanoid();
  await sql`
    INSERT INTO users (id, name, email, password_hash) VALUES (${id}, ${name}, ${email}, ${passwordHash})
  `;

  res.status(201).json({ id, name, email });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.sub, email: req.user.email, name: req.user.name });
});

export default router;
