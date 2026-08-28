import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

// mergeParams so we can read :classId from the parent router
const router = Router({ mergeParams: true });
router.use(requireAuth);

const E164_LOOSE = /^\+?[1-9]\d{6,14}$/;

function normalizePhone(raw) {
  return (raw || '').replace(/[\s()-]/g, '');
}

router.get('/', async (req, res) => {
  await db.read();
  const list = db.data.parents
    .filter((p) => p.classGroupId === req.params.classId)
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(list);
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

  await db.read();
  const classExists = db.data.classGroups.some((c) => c.id === req.params.classId);
  if (!classExists) return res.status(404).json({ error: 'Class not found.' });

  const duplicate = db.data.parents.some(
    (p) => p.classGroupId === req.params.classId && p.phone === cleanPhone
  );
  if (duplicate) {
    return res.status(409).json({ error: 'This phone number is already in the class.' });
  }

  const parent = {
    id: nanoid(),
    classGroupId: req.params.classId,
    name: name.trim(),
    phone: cleanPhone,
    addedAt: new Date().toISOString(),
  };
  db.data.parents.push(parent);
  await db.write();

  res.status(201).json(parent);
});

router.put('/:parentId', async (req, res) => {
  const { name, phone } = req.body || {};
  await db.read();
  const parent = db.data.parents.find(
    (p) => p.id === req.params.parentId && p.classGroupId === req.params.classId
  );
  if (!parent) return res.status(404).json({ error: 'Parent not found in this class.' });

  if (name && name.trim()) parent.name = name.trim();
  if (phone) {
    const cleanPhone = normalizePhone(phone);
    if (!E164_LOOSE.test(cleanPhone)) {
      return res.status(400).json({ error: 'Phone number looks invalid.' });
    }
    parent.phone = cleanPhone;
  }

  await db.write();
  res.json(parent);
});

// Move a parent to a different class (e.g. graduated to next grade).
router.post('/:parentId/move', async (req, res) => {
  const { targetClassId } = req.body || {};
  if (!targetClassId) {
    return res.status(400).json({ error: 'targetClassId is required.' });
  }

  await db.read();
  const parent = db.data.parents.find(
    (p) => p.id === req.params.parentId && p.classGroupId === req.params.classId
  );
  if (!parent) return res.status(404).json({ error: 'Parent not found in this class.' });

  const targetExists = db.data.classGroups.some((c) => c.id === targetClassId);
  if (!targetExists) return res.status(404).json({ error: 'Target class not found.' });

  parent.classGroupId = targetClassId;
  await db.write();
  res.json(parent);
});

router.delete('/:parentId', async (req, res) => {
  await db.read();
  const exists = db.data.parents.some(
    (p) => p.id === req.params.parentId && p.classGroupId === req.params.classId
  );
  if (!exists) return res.status(404).json({ error: 'Parent not found in this class.' });

  db.data.parents = db.data.parents.filter((p) => p.id !== req.params.parentId);
  await db.write();
  res.status(204).end();
});

export default router;
