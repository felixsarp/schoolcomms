import { Router } from 'express';
import { nanoid } from 'nanoid';
import { sql, initDb } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

function toClass(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    parentCount: Number(row.parent_count ?? 0),
  };
}

async function fetchClassWithCount(id) {
  const { rows } = await sql`
    SELECT c.*, COUNT(p.id)::int AS parent_count
    FROM class_groups c
    LEFT JOIN parents p ON p.class_group_id = c.id
    WHERE c.id = ${id}
    GROUP BY c.id
  `;
  return rows[0];
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await initDb();
    const { rows } = await sql`
      SELECT c.*, COUNT(p.id)::int AS parent_count
      FROM class_groups c
      LEFT JOIN parents p ON p.class_group_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    res.json(rows.map(toClass));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Class name is required.' });
    }

    await initDb();
    const id = nanoid();
    await sql`INSERT INTO class_groups (id, name) VALUES (${id}, ${name.trim()})`;

    res.status(201).json(toClass(await fetchClassWithCount(id)));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await initDb();
    const classGroup = await fetchClassWithCount(req.params.id);
    if (!classGroup) return res.status(404).json({ error: 'Class not found.' });
    res.json(toClass(classGroup));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    await initDb();

    if (name && name.trim()) {
      await sql`UPDATE class_groups SET name = ${name.trim()} WHERE id = ${req.params.id}`;
    }

    const classGroup = await fetchClassWithCount(req.params.id);
    if (!classGroup) return res.status(404).json({ error: 'Class not found.' });
    res.json(toClass(classGroup));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await initDb();
    const { rowCount } = await sql`DELETE FROM class_groups WHERE id = ${req.params.id}`;
    if (!rowCount) return res.status(404).json({ error: 'Class not found.' });
    res.status(204).end();
  })
);

export default router;
