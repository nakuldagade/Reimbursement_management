const express = require('express');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const role = req.user.role;

    if (role === 'ADMIN') {
      const [totalExpenses, pendingCount, approvedCount, rejectedCount, totalAmount, recentExpenses, userCount] =
        await Promise.all([
          prisma.expense.count({ where: { companyId } }),
          prisma.expense.count({ where: { companyId, status: 'PENDING' } }),
          prisma.expense.count({ where: { companyId, status: 'APPROVED' } }),
          prisma.expense.count({ where: { companyId, status: 'REJECTED' } }),
          prisma.expense.aggregate({ where: { companyId, status: 'APPROVED' }, _sum: { convertedAmount: true } }),
          prisma.expense.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { user: { select: { firstName: true, lastName: true } } },
          }),
          prisma.user.count({ where: { companyId } }),
        ]);

      // Category breakdown
      const expenses = await prisma.expense.findMany({
        where: { companyId },
        select: { category: true, convertedAmount: true },
      });

      const categoryBreakdown = {};
      expenses.forEach((e) => {
        if (!categoryBreakdown[e.category]) categoryBreakdown[e.category] = 0;
        categoryBreakdown[e.category] += e.convertedAmount || e.amount || 0;
      });

      return res.json({
        role: 'ADMIN',
        stats: {
          totalExpenses,
          pendingCount,
          approvedCount,
          rejectedCount,
          totalApprovedAmount: totalAmount._sum.convertedAmount || 0,
          userCount,
          categoryBreakdown,
        },
        recentExpenses,
      });
    }

    if (role === 'MANAGER') {
      const subordinates = await prisma.user.findMany({
        where: { managerId: req.user.id },
        select: { id: true },
      });
      const subIds = subordinates.map((s) => s.id);

      const [teamTotal, teamPending, teamApproved, teamRejected, recentExpenses] = await Promise.all([
        prisma.expense.count({ where: { userId: { in: subIds } } }),
        prisma.expense.count({ where: { userId: { in: subIds }, status: 'PENDING' } }),
        prisma.expense.count({ where: { userId: { in: subIds }, status: 'APPROVED' } }),
        prisma.expense.count({ where: { userId: { in: subIds }, status: 'REJECTED' } }),
        prisma.expense.findMany({
          where: { userId: { in: subIds } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { firstName: true, lastName: true } } },
        }),
      ]);

      return res.json({
        role: 'MANAGER',
        stats: {
          teamTotal,
          teamPending,
          teamApproved,
          teamRejected,
          teamSize: subordinates.length,
        },
        recentExpenses,
      });
    }

    // EMPLOYEE
    const [myTotal, myPending, myApproved, myRejected, totalSpent, recentExpenses] = await Promise.all([
      prisma.expense.count({ where: { userId: req.user.id } }),
      prisma.expense.count({ where: { userId: req.user.id, status: 'PENDING' } }),
      prisma.expense.count({ where: { userId: req.user.id, status: 'APPROVED' } }),
      prisma.expense.count({ where: { userId: req.user.id, status: 'REJECTED' } }),
      prisma.expense.aggregate({ where: { userId: req.user.id, status: 'APPROVED' }, _sum: { convertedAmount: true } }),
      prisma.expense.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      role: 'EMPLOYEE',
      stats: {
        myTotal,
        myPending,
        myApproved,
        myRejected,
        totalSpent: totalSpent._sum.convertedAmount || 0,
      },
      recentExpenses,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
