const express = require('express');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/rules — list approval rules
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const rules = await prisma.approvalRule.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { createdAt: 'desc' },
    });
    // Parse config JSON
    const parsed = rules.map((r) => ({ ...r, config: JSON.parse(r.config) }));
    res.json({ rules: parsed });
  } catch (error) {
    next(error);
  }
});

// POST /api/rules — create rule
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, type, config } = req.body;

    if (!name || !type || !config) {
      return res.status(400).json({ error: 'Name, type, and config are required.' });
    }

    if (!['PERCENTAGE', 'SPECIFIC_APPROVER', 'HYBRID'].includes(type)) {
      return res.status(400).json({ error: 'Type must be PERCENTAGE, SPECIFIC_APPROVER, or HYBRID.' });
    }

    const rule = await prisma.approvalRule.create({
      data: {
        name,
        type,
        config: JSON.stringify(config),
        companyId: req.user.companyId,
      },
    });

    res.status(201).json({ rule: { ...rule, config: JSON.parse(rule.config) } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/rules/:id — update rule
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, config, isActive } = req.body;

    const rule = await prisma.approvalRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(config && { config: JSON.stringify(config) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ rule: { ...rule, config: JSON.parse(rule.config) } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/rules/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.approvalRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rule deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
