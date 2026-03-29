# ReimburseX — Reimbursement Management System

A full-stack, production-ready expense reimbursement platform built with React, Node.js, Express, and Prisma.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS v4 |
| **Backend** | Node.js + Express |
| **Database** | SQLite (via Prisma ORM) — easily switch to PostgreSQL |
| **Auth** | JWT (bcryptjs + jsonwebtoken) |
| **OCR** | Tesseract.js |
| **Currency** | ExchangeRate API (free) |

## 📦 Quick Start

```bash
# 1. Install backend dependencies & seed database
cd server
npm install
npx prisma migrate dev --name init
node prisma/seed.js

# 2. Install frontend dependencies
cd ../client
npm install

# 3. Start both servers (in separate terminals)
# Terminal 1 – Backend (port 5000)
cd server && npm run dev

# Terminal 2 – Frontend (port 5173)
cd client && npm run dev

# 4. Open http://localhost:5173
```

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@acme.com | admin123 |
| Manager | manager@acme.com | manager123 |
| Employee | alice@acme.com | employee123 |
| Employee | bob@acme.com | employee123 |

## ✨ Features

- **Authentication & RBAC** — JWT auth with Admin/Manager/Employee roles
- **Company Auto-Setup** — Signup creates company with country-based default currency
- **Expense Management** — Submit, filter, multi-currency support, receipt upload
- **OCR Receipt Parsing** — Auto-extract amount, date, vendor from receipts
- **Multi-Level Approvals** — Configurable approval chains (Manager → Admin)
- **Conditional Rules** — Percentage, specific approver, and hybrid rules
- **Admin Override** — Force approve/reject any expense
- **Notifications** — Real-time in-app notifications
- **Dashboard** — Role-specific stats and analytics
- **CSV Export** — Download expense reports
- **Audit Logs** — Track all actions
- **Mobile Responsive** — Works on all screen sizes

## 📁 Project Structure

```
├── server/
│   ├── prisma/           # Schema + migrations + seed
│   ├── src/
│   │   ├── config/       # Database client
│   │   ├── middleware/    # Auth, RBAC, uploads, errors
│   │   ├── routes/       # All API endpoints
│   │   └── utils/        # OCR, currency, countries
│   └── uploads/          # Receipt files
├── client/
│   └── src/
│       ├── components/   # Layout, NotificationBell, StatusBadge
│       ├── context/      # AuthContext
│       ├── pages/        # All page components
│       └── services/     # API client
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register + create company |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user profile |
| GET/POST/PUT/DELETE | /api/users | User management (Admin) |
| POST | /api/expenses | Submit expense |
| GET | /api/expenses | My expenses |
| GET | /api/expenses/all | All company expenses (Admin) |
| GET | /api/expenses/export | CSV export |
| GET | /api/approvals/pending | Pending approvals |
| POST | /api/approvals/:id/approve | Approve expense |
| POST | /api/approvals/:id/reject | Reject expense |
| POST | /api/approvals/:id/override | Admin override |
| GET/POST | /api/approvals/chain | Approval chain config |
| GET/POST/PUT/DELETE | /api/rules | Conditional rules |
| GET | /api/notifications | Notifications |
| GET | /api/dashboard/stats | Dashboard statistics |
| POST | /api/ocr/parse | OCR receipt parsing |
