const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getCountryCurrency } = require('../utils/countries');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, companyName, country } = req.body;

    if (!email || !password || !firstName || !lastName || !companyName || !country) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Get default currency from country
    const defaultCurrency = await getCountryCurrency(country);

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          country,
          defaultCurrency,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'ADMIN',
          companyId: company.id,
        },
      });

      // Create default approval chain
      await tx.approvalChain.create({
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

      return { user, company };
    });

    const token = jwt.sign(
      { userId: result.user.id, role: result.user.role, companyId: result.user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        company: result.company,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always return success to prevent email enumeration
      return res.json({ message: 'If an account with that email exists, a new password has been sent.' });
    }

    // Generate random 8-character password
    const newPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    let transporter;
    let isEthereal = false;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Generate test SMTP service account from ethereal.email
      isEthereal = true;
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER ? `"ExpenseFlow Security" <${process.env.SMTP_USER}>` : '"ExpenseFlow Security" <security@expenseflow.demo>',
      to: email,
      subject: "Password Reset - ExpenseFlow",
      text: `Hello ${user.firstName},\n\nYour password has been successfully reset.\n\nYour new password is: ${newPassword}\n\nPlease log in and change this password immediately.\n\nBest,\nExpenseFlow Team`,
      html: `<p>Hello ${user.firstName},</p><p>Your password has been successfully reset.</p><p>Your new password is: <strong>${newPassword}</strong></p><p>Please log in and change this password immediately.</p><br><p>Best,<br>ExpenseFlow Team</p>`
    });

    let previewUrl = null;
    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("Password Reset Email Preview URL: %s", previewUrl);
    } else {
      console.log("Live email sent to %s successfully.", email);
    }

    res.json({ 
      message: 'If an account with that email exists, a new password has been sent.',
      previewUrl // Returning this purely for frontend demo purposes so the user can see it easily if it's ethereal
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

module.exports = router;
