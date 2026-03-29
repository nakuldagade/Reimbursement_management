const express = require('express');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/approvals/pending — pending approvals for current user
router.get('/pending', authenticate, authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    let where = { status: 'PENDING', companyId: req.user.companyId };

    if (req.user.role === 'MANAGER') {
      const subordinates = await prisma.user.findMany({
        where: { managerId: req.user.id },
        select: { id: true },
      });
      where.userId = { in: subordinates.map((s) => s.id) };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        approvalLogs: {
          include: { approver: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

// POST /api/approvals/:expenseId/approve
router.post('/:expenseId/approve', authenticate, authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { user: true },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    if (expense.status !== 'PENDING') {
      return res.status(400).json({ error: 'Expense is not pending approval.' });
    }

    // Check approval chain
    const chain = await prisma.approvalChain.findFirst({
      where: { companyId: req.user.companyId, isDefault: true },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    const currentLevel = expense.currentLevel;
    const nextLevel = currentLevel + 1;
    const totalSteps = chain ? chain.steps.length : 1;

    // Create approval log
    await prisma.approvalLog.create({
      data: {
        expenseId,
        approverId: req.user.id,
        action: 'APPROVED',
        comments: comments || null,
        level: nextLevel,
      },
    });

    if (nextLevel >= totalSteps) {
      // Final approval
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'APPROVED', currentLevel: nextLevel },
      });

      await prisma.notification.create({
        data: {
          userId: expense.userId,
          message: `Your expense for ${expense.category} (${expense.currency} ${expense.amount}) has been approved.`,
          type: 'EXPENSE_APPROVED',
          expenseId,
        },
      });
    } else {
      // Move to next level
      await prisma.expense.update({
        where: { id: expenseId },
        data: { currentLevel: nextLevel },
      });

      // Notify next approver(s) — find admins for next level
      const nextStep = chain.steps.find((s) => s.level === nextLevel + 1);
      if (nextStep) {
        const nextApprovers = nextStep.approverId
          ? [{ id: nextStep.approverId }]
          : await prisma.user.findMany({
              where: { companyId: req.user.companyId, role: nextStep.approverRole || 'ADMIN' },
              select: { id: true },
            });

        for (const approver of nextApprovers) {
          await prisma.notification.create({
            data: {
              userId: approver.id,
              message: `Expense pending your approval: ${expense.category} (${expense.currency} ${expense.amount}) by ${expense.user.firstName} ${expense.user.lastName}`,
              type: 'APPROVAL_REQUESTED',
              expenseId,
            },
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_APPROVED',
        entityType: 'Expense',
        entityId: expenseId,
        userId: req.user.id,
        details: JSON.stringify({ level: nextLevel, comments }),
      },
    });

    res.json({ message: 'Expense approved successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/approvals/:expenseId/reject
router.post('/:expenseId/reject', authenticate, authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    if (expense.status !== 'PENDING') {
      return res.status(400).json({ error: 'Expense is not pending approval.' });
    }

    await prisma.approvalLog.create({
      data: {
        expenseId,
        approverId: req.user.id,
        action: 'REJECTED',
        comments: comments || null,
        level: expense.currentLevel + 1,
      },
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'REJECTED' },
    });

    await prisma.notification.create({
      data: {
        userId: expense.userId,
        message: `Your expense for ${expense.category} (${expense.currency} ${expense.amount}) has been rejected.${comments ? ` Reason: ${comments}` : ''}`,
        type: 'EXPENSE_REJECTED',
        expenseId,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_REJECTED',
        entityType: 'Expense',
        entityId: expenseId,
        userId: req.user.id,
        details: JSON.stringify({ comments }),
      },
    });

    res.json({ message: 'Expense rejected.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/approvals/:expenseId/override — Admin force approve/reject
router.post('/:expenseId/override', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { action, comments } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVED or REJECTED.' });
    }

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    await prisma.approvalLog.create({
      data: {
        expenseId,
        approverId: req.user.id,
        action: `OVERRIDE_${action}`,
        comments: comments || null,
        level: 0,
      },
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: action },
    });

    await prisma.notification.create({
      data: {
        userId: expense.userId,
        message: `Your expense for ${expense.category} has been ${action.toLowerCase()} by admin override.`,
        type: action === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        expenseId,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: `EXPENSE_OVERRIDE_${action}`,
        entityType: 'Expense',
        entityId: expenseId,
        userId: req.user.id,
        details: JSON.stringify({ comments }),
      },
    });

    res.json({ message: `Expense ${action.toLowerCase()} via admin override.` });
  } catch (error) {
    next(error);
  }
});

// GET /api/approvals/chain — get approval chain config
router.get('/chain', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const chains = await prisma.approvalChain.findMany({
      where: { companyId: req.user.companyId },
      include: {
        steps: {
          orderBy: { level: 'asc' },
          include: { approver: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });
    res.json({ chains });
  } catch (error) {
    next(error);
  }
});

// POST /api/approvals/chain — create/update approval chain
router.post('/chain', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, steps, isDefault } = req.body;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Name and steps are required.' });
    }

    if (isDefault) {
      await prisma.approvalChain.updateMany({
        where: { companyId: req.user.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const chain = await prisma.approvalChain.create({
      data: {
        name,
        companyId: req.user.companyId,
        isDefault: isDefault || false,
        steps: {
          create: steps.map((step, index) => ({
            level: index + 1,
            approverRole: step.approverRole || null,
            approverId: step.approverId || null,
          })),
        },
      },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    res.status(201).json({ chain });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
