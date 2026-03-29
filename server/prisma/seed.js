const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      country: 'United States',
      defaultCurrency: 'INR',
    },
  });

  // Create admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      password: adminPassword,
      firstName: 'John',
      lastName: 'Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  // Create manager
  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.create({
    data: {
      email: 'manager@acme.com',
      password: managerPassword,
      firstName: 'Sarah',
      lastName: 'Manager',
      role: 'MANAGER',
      companyId: company.id,
    },
  });

  // Create employees
  const empPassword = await bcrypt.hash('employee123', 12);
  const emp1 = await prisma.user.create({
    data: {
      email: 'alice@acme.com',
      password: empPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'EMPLOYEE',
      companyId: company.id,
      managerId: manager.id,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      email: 'bob@acme.com',
      password: empPassword,
      firstName: 'Bob',
      lastName: 'Smith',
      role: 'EMPLOYEE',
      companyId: company.id,
      managerId: manager.id,
    },
  });

  // Create default approval chain
  await prisma.approvalChain.create({
    data: {
      name: 'Default Approval Chain',
      companyId: company.id,
      isDefault: true,
      steps: {
        create: [
          { level: 1, approverRole: 'MANAGER' },
          { level: 2, approverRole: 'ADMIN' },
        ],
      },
    },
  });

  // Create sample expenses
  const categories = ['Food', 'Travel', 'Office Supplies', 'Software', 'Training'];
  const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

  for (let i = 0; i < 10; i++) {
    const user = i % 2 === 0 ? emp1 : emp2;
    const status = statuses[i % 3];
    const category = categories[i % 5];
    const amount = parseFloat((Math.random() * 500 + 20).toFixed(2));

    const expense = await prisma.expense.create({
      data: {
        amount,
        currency: 'INR',
        convertedAmount: amount,
        baseCurrency: 'INR',
        category,
        description: `Sample ${category.toLowerCase()} expense #${i + 1}`,
        expenseDate: new Date(2026, 2, Math.floor(Math.random() * 28) + 1),
        status,
        userId: user.id,
        companyId: company.id,
      },
    });

    if (status !== 'PENDING') {
      await prisma.approvalLog.create({
        data: {
          expenseId: expense.id,
          approverId: status === 'APPROVED' ? manager.id : admin.id,
          action: status,
          comments: status === 'REJECTED' ? 'Missing receipt' : 'Looks good',
          level: 1,
        },
      });
    }
  }

  // Create sample approval rule
  await prisma.approvalRule.create({
    data: {
      name: 'High Value Auto-Escalate',
      type: 'PERCENTAGE',
      config: JSON.stringify({
        threshold: 500,
        requiredApprovalPercentage: 100,
        description: 'Expenses over ₹500 require all approvers',
      }),
      companyId: company.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📧 Demo accounts:');
  console.log('  Admin:    admin@acme.com / admin123');
  console.log('  Manager:  manager@acme.com / manager123');
  console.log('  Employee: alice@acme.com / employee123');
  console.log('  Employee: bob@acme.com / employee123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
