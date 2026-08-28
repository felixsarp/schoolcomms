import { Router } from 'express';
import { nanoid } from 'nanoid';
import { sql, initDb } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

// mergeParams so we can read :classId from the parent router
const router = Router({ mergeParams: true });
router.use(requireAuth);

const E164_LOOSE = /^\+?[1-9]\d{6,14}$/;

function normalizePhone(raw) {
  return (raw || '').replace(/[\s()-]/g, '');
}

function toParent(row) {
  return {
    id: row.id,
    classGroupId: row.class_group_id,
    name: row.name,
    phone: row.phone,
    addedAt: row.added_at,
  };
}

router.get('/', async (req, res) => {
  await initDb();
  const { rows } = await sql`
    SELECT * FROM parents WHERE class_group_id = ${req.params.classId} ORDER BY name ASC
  `;
  res.json(rows.map(toParent));
});

router.post('/', async (req, res) => {
  const { name, phone } = req.body || {};
  const cleanPhone = normalizePhone(phone);

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Parent name is required.' });
  }
  if (!E164_LOOSE.test(cleanPhone)) {
    return res
      .status(400)
      .json({ error: 'Phone number must include country code, e.g. +233241234567.' });
  }

  await initDb();
  const { rows: classRows } = await sql`SELECT id FROM class_groups WHERE id = ${req.params.classId}`;
  if (!classRows.length) return res.status(404).json({ error: 'Class not found.' });

  const { rows: dupRows } = await sql`
    SELECT id FROM parents WHERE class_group_id = ${req.params.classId} AND phone = ${cleanPhone}
  `;
  if (dupRows.length) {
    return res.status(409).json({ error: 'This phone number is already in the class.' });
  }

  const id = nanoid();
  const { rows } = await sql`
    INSERT INTO parents (id, class_group_id, name, phone)
    VALUES (${id}, ${req.params.classId}, ${name.trim()}, ${cleanPhone})
    RETURNING *
  `;
  res.status(201).json(toParent(rows[0]));
});

router.put('/:parentId', async (req, res) => {
  const { name, phone } = req.body || {};
  await initDb();

  const { rows: existingRows } = await sql`
    SELECT * FROM parents WHERE id = ${req.params.parentId} AND class_group_id = ${req.params.classId}
  `;
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Parent not found in this class.' });

  let nextName = existing.name;
  let nextPhone = existing.phone;

  if (name && name.trim()) nextName = name.trim();
  if (phone) {
    const cleanPhone = normalizePhone(phone);
    if (!E164_LOOSE.test(cleanPhone)) {
      return res.status(400).json({ error: 'Phone number looks invalid.' });
    }
    nextPhone = cleanPhone;
  }

  const { rows } = await sql`
    UPDATE parents SET name = ${nextName}, phone = ${nextPhone}
    WHERE id = ${req.params.parentId}
    RETURNING *
  `;
  res.json(toParent(rows[0]));
});

// Move a parent to a different class (e.g. graduated to next grade).
router.post('/:parentId/move', async (req, res) => {
  const { targetClassId } = req.body || {};
  if (!targetClassId) {
    return res.status(400).json({ error: 'targetClassId is required.' });
  }

  await initDb();
  const { rows: existingRows } = await sql`
    SELECT id FROM parents WHERE id = ${req.params.parentId} AND class_group_id = ${req.params.classId}
  `;
  if (!existingRows.length) return res.status(404).json({ error: 'Parent not found in this class.' });

  const { rows: targetRows } = await sql`SELECT id FROM class_groups WHERE id = ${targetClassId}`;
  if (!targetRows.length) return res.status(404).json({ error: 'Target class not found.' });

  const { rows } = await sql`
    UPDATE parents SET class_group_id = ${targetClassId}
    WHERE id = ${req.params.parentId}
    RETURNING *
  `;
  res.json(toParent(rows[0]));
});

router.delete('/:parentId', async (req, res) => {
  await initDb();
  const { rowCount } = await sql`
    DELETE FROM parents WHERE id = ${req.params.parentId} AND class_group_id = ${req.params.classId}
  `;
  if (!rowCount) return res.status(404).json({ error: 'Parent not found in this class.' });
  res.status(204).end();
});

export default router;
