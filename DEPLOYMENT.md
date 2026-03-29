# 🚀 ExpenseFlow Deployment Guide

Deploying ExpenseFlow requires hosting two separate pieces (Frontend & Backend) and ensuring your database and uploads are persistent. 

Because the local development version uses **SQLite** (a local file database) and saves receipt images to the local `server/uploads/` folder, you cannot deploy this to a "serverless" platform without a bit of configuration. Serverless platforms wipe local files every time they sleep or restart!

Here is the recommended **100% Free** deployment architecture:

---

## 🏗️ The Architecture

1. **Frontend (React/Vite)** ➔ Deploy to **Vercel** or **Netlify** (Free)
2. **Backend (Node.js)** ➔ Deploy to **Render.com** Web Service (Free tier)
3. **Database (PostgreSQL)** ➔ Switch from SQLite to **Neon.tech** or **Supabase** (Free)
4. **File Uploads** ➔ Switch from local uploads to **Cloudinary** or **AWS S3**

---

## Step-by-Step Deployment Instructions

### Phase 1: Prepare the Database for Production
Serverless containers delete local files. If you keep SQLite, your database will get wiped every few hours! You must switch to PostgreSQL.

1. Go to [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and create a free PostgreSQL database.
2. Copy the **Connection String** (e.g., `postgresql://user:password@endpoint...`).
3. In your project, open `server/prisma/schema.prisma`.
4. Change the provider from SQLite to PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. In your server `package.json`, update the migration script to push to PostgreSQL:
   ```json
   "db:migrate": "npx prisma db push"
   ```

### Phase 2: Deploy the Backend (Render)

[Render.com](https://render.com) is the best free host for Node.js backends.

1. Create a free account on Render and click **New → Web Service**.
2. Connect your GitHub repository (`Reimbursement_management`).
3. Render will ask for some settings. Fill them out exactly like this:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma db push`
   - **Start Command**: `npm run start`
4. Expand the **Environment Variables** section and add:
   - `DATABASE_URL` = *(Your Neon/Supabase PostgreSQL connection string)*
   - `JWT_SECRET` = *(Generate a random long string for security)*
   - `JWT_EXPIRES_IN` = `7d`
   - `PORT` = `10000` *(Render natively uses the PORT variable)*
   - `SMTP_...` = *(Your optional Gmail credentials for reset passwords)*
5. Click **Create Web Service**. Wait 3-5 minutes for it to build. Once done, copy the live URL (e.g., `https://reimbursement-api.onrender.com`).

*Note Check: Because receipts are currently saved to `server/uploads`, they will be deleted when Render sleeps. For a true production app, you will want to update `server/src/middleware/upload.js` to upload images to Cloudinary instead of disk.*

### Phase 3: Deploy the Frontend (Vercel)

Now that your Backend is live, we need to point the React app to it and deploy it.

1. In your project, open `client/src/services/api.js`.
2. Find the `baseURL` line and change it to dynamically load your production URL:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
   const api = axios.create({ baseURL: API_URL });
   ```
3. Commit and push this change to GitHub.
4. Go to [Vercel.com](https://vercel.com) and create a free account.
5. Click **Add New Project** and select your GitHub repository.
6. Vercel will ask for settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` 
7. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://your-render-backend-url.onrender.com/api` *(Make sure to add `/api` at the end!)*
8. Click **Deploy**.

---

## 🚀 You're Live!

Once Vercel finishes deploying, they will give you a live URL (e.g., `https://expense-flow.vercel.app`). 

1. Visit the URL.
2. Sign up to create the first admin account and company.
3. Test submitting an expense.
4. Share the link with your team!
