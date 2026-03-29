const express = require('express');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { convertCurrency } = require('../utils/currency');

const router = express.Router();

// POST /api/expenses — submit expense
router.post('/', authenticate, upload.single('receipt'), async (req, res, next) => {
  try {
    const { amount, currency, category, description, expenseDate } = req.body;

    if (!amount || !category || !expenseDate) {
      return res.status(400).json({ error: 'Amount, category, and date are required.' });
    }

    const expenseCurrency = currency || req.user.company.defaultCurrency;
    const baseCurrency = req.user.company.defaultCurrency;

    let convertedAmount = parseFloat(amount);
    if (expenseCurrency !== baseCurrency) {
      convertedAmount = await convertCurrency(parseFloat(amount), expenseCurrency, baseCurrency);
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        currency: expenseCurrency,
        convertedAmount,
        baseCurrency,
        category,
        description: description || '',
        expenseDate: new Date(expenseDate),
        receiptUrl: req.file ? `/uploads/${req.file.filename}` : null,
        userId: req.user.id,
        companyId: req.user.companyId,
      },
    });

    // Notify manager
    if (req.user.managerId) {
      await prisma.notification.create({
        data: {
          userId: req.user.managerId,
          message: `New expense submitted by ${req.user.firstName} ${req.user.lastName}: ${category} - ${expenseCurrency} ${amount}`,
          type: 'EXPENSE_SUBMITTED',
          expenseId: expense.id,
        },
      });
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { companyId: req.user.companyId, role: 'ADMIN', id: { not: req.user.id } },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          message: `New expense submitted by ${req.user.firstName} ${req.user.lastName}: ${category} - ${expenseCurrency} ${amount}`,
          type: 'EXPENSE_SUBMITTED',
          expenseId: expense.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_CREATED',
        entityType: 'Expense',
        entityId: expense.id,
        userId: req.user.id,
        details: JSON.stringify({ amount, currency: expenseCurrency, category }),
      },
    });

    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses — list my expenses
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, category, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          approvalLogs: {
            include: { approver: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/team — manager/admin view
router.get('/team', authenticate, authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let where = { companyId: req.user.companyId };

    if (req.user.role === 'MANAGER') {
      const subordinates = await prisma.user.findMany({
        where: { managerId: req.user.id },
        select: { id: true },
      });
      where.userId = { in: subordinates.map((s) => s.id) };
    }

    if (status) where.status = status;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          approvalLogs: {
            include: { approver: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/all — admin view of all expenses
router.get('/all', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const where = { companyId: req.user.companyId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          approvalLogs: {
            include: { approver: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/export — CSV export
router.get('/export', authenticate, async (req, res, next) => {
  try {
    let where = { companyId: req.user.companyId };
    if (req.user.role === 'EMPLOYEE') {
      where.userId = req.user.id;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const csvHeader = 'Date,Employee,Category,Amount,Currency,Converted Amount,Status,Description\n';
    const csvRows = expenses.map((e) =>
      `${e.expenseDate.toISOString().split('T')[0]},${e.user.firstName} ${e.user.lastName},${e.category},${e.amount},${e.currency},${e.convertedAmount || ''},${e.status},"${(e.description || '').replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csvHeader + csvRows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
