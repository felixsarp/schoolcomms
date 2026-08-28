import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function classWithCounts(classGroup, allParents) {
  const parentCount = allParents.filter((p) => p.classGroupId === classGroup.id).length;
  return { ...classGroup, parentCount };
}

router.get('/', async (req, res) => {
  await db.read();
  const list = db.data.classGroups
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => classWithCounts(c, db.data.parents));
  res.json(list);
});

router.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Class name is required.' });
  }

  await db.read();
  const classGroup = {
    id: nanoid(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  db.data.classGroups.push(classGroup);
  await db.write();

  res.status(201).json(classWithCounts(classGroup, db.data.parents));
});

router.get('/:id', async (req, res) => {
  await db.read();
  const classGroup = db.data.classGroups.find((c) => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Class not found.' });
  res.json(classWithCounts(classGroup, db.data.parents));
});

router.put('/:id', async (req, res) => {
  const { name } = req.body || {};
  await db.read();
  const classGroup = db.data.classGroups.find((c) => c.id === req.params.id);
  if (!classGroup) return res.status(404).json({ error: 'Class not found.' });

  if (name && name.trim()) classGroup.name = name.trim();
  await db.write();
  res.json(classWithCounts(classGroup, db.data.parents));
});

router.delete('/:id', async (req, res) => {
  await db.read();
  const exists = db.data.classGroups.some((c) => c.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Class not found.' });

  db.data.classGroups = db.data.classGroups.filter((c) => c.id !== req.params.id);
  db.data.parents = db.data.parents.filter((p) => p.classGroupId !== req.params.id);
  db.data.messages = db.data.messages.filter((m) => m.classGroupId !== req.params.id);
  await db.write();

  res.status(204).end();
});

export default router;
