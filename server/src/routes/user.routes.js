const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — list all users in company
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        createdAt: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users — create user (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, managerId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'EMPLOYEE',
        companyId: req.user.companyId,
        managerId: managerId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        userId: req.user.id,
        details: JSON.stringify({ email, role: role || 'EMPLOYEE' }),
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id — update user
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, managerId } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(managerId !== undefined && { managerId: managerId || null }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        userId: req.user.id,
        details: JSON.stringify({ role, managerId }),
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        userId: req.user.id,
      },
    });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
