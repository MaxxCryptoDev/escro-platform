# ESCRO Platform - Local Setup Guide

Step-by-step guide to get the platform running on your machine.

## ✅ Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js
node --version    # Should be 16.x or higher
npm --version     # Should be 8.x or higher

# Check PostgreSQL
psql --version    # Should be 12 or higher
```

If any are missing:
- **Node.js**: https://nodejs.org/en/download/
- **PostgreSQL**: https://www.postgresql.org/download/

## 🗄️ Step 1: Setup PostgreSQL

### On Windows/Mac

1. **Install PostgreSQL** (if not done)
   - Download from: https://www.postgresql.org/download/
   - During installation, remember the `postgres` user password
   - Choose default port 5432

2. **Create database:**
   ```bash
   psql -U postgres
   # You'll be prompted for password
   
   CREATE DATABASE escro_platform;
   \q  # Exit
   ```

### On Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres psql
CREATE DATABASE escro_platform;
\q
```

### Verify Connection

```bash
psql -U postgres -d escro_platform
# Should connect successfully
\q  # Exit
```

## 🔧 Step 2: Backend Setup

### 2.1 Navigate to Backend
```bash
cd escro-platform/backend
```

### 2.2 Install Dependencies
```bash
npm install
```

This will install:
- express (web framework)
- pg (PostgreSQL driver)
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- stripe (payment processing)
- multer (file uploads)
- cors (cross-origin requests)
- dotenv (environment variables)
- And development tools (nodemon, etc.)

### 2.3 Configure Environment Variables

1. **Copy template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your values:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=YOUR_POSTGRES_PASSWORD  # <-- Set this
   DB_NAME=escro_platform
   
   # JWT
   JWT_SECRET=your_super_secret_random_key_here_12345  # <-- Change this
   JWT_EXPIRE=7d
   
   # Stripe (Test Mode - get from https://dashboard.stripe.com)
   STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY    # <-- Add this
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUB_KEY  # <-- Add this
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET     # <-- Optional for now
   
   # Files
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=10485760
   
   # Admin
   ADMIN_EMAIL=vladau.claudiu95@gmail.com
   
   # Frontend
   FRONTEND_URL=http://localhost:3000
   ```

### 2.4 Initialize Database

```bash
npm run db:init
```

This will:
- Create all tables (users, projects, milestones, etc.)
- Setup relationships and indexes
- Print success message

**Expected output:**
```
PostgreSQL connection successful!
Database tables created successfully!
```

### 2.5 Start Backend Server

```bash
npm run dev
```

**Expected output:**
```
Server running on port 5000
Database connected
```

### Test Backend

In a new terminal:
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

✅ **Backend is ready!** Leave it running.

## 🎨 Step 3: Frontend Setup

### 3.1 Navigate to Frontend
In a **new terminal window**:
```bash
cd escro-platform/frontend
```

### 3.2 Install Dependencies
```bash
npm install
```

This will install:
- react (UI library)
- react-router-dom (routing)
- axios (HTTP client)
- socket.io-client (real-time)
- vite (build tool)
- And development dependencies

### 3.3 Start Development Server

```bash
npm run dev
```

**Expected output:**
```
Local:        http://localhost:3000/
press h to show help
```

✅ **Frontend is ready!** Open your browser to `http://localhost:3000`

## 🧪 Step 4: First Test Run

### 4.1 Register First User (Admin)

1. Open `http://localhost:3000` in browser
2. Click **"Register"**
3. Fill form:
   ```
   Email: admin@escro.ro
   Password: admin123 (or your choice)
   Name: Claudiu Vladau
   Role: admin
   ```
4. Click **Register**
5. You should see redirect to login or dashboard

### 4.2 Login

1. Go to login page
2. Enter email & password from registration
3. Should redirect to admin dashboard

### 4.3 Create Test Expert

1. In browser, open new tab to `http://localhost:3000`
2. Click **Register**
3. Fill form:
   ```
   Email: test_expert@escro.ro
   Password: expert123
   Name: John Expert
   Role: expert
   Company: Expert Services Inc
   Expertise: Web Development
   ```
4. Click Register

### 4.4 Approve Expert (As Admin)

1. Go back to admin tab
2. Click **Admin Dashboard** (if not already there)
3. Find "Pending Expert Verification" tab
4. Click **Approve** next to test expert
5. Expert is now verified

### 4.5 Create Test Client

1. Open new tab to `http://localhost:3000`
2. Register:
   ```
   Email: test_client@escro.ro
   Password: client123
   Name: Jane Client
   Role: client
   ```

### 4.6 Create Test Project

1. Login as client (test_client@escro.ro)
2. Go to **Client Dashboard**
3. Fill "Create New Project":
   ```
   Project Title: Website Redesign
   Budget (RON): 5000
   Timeline (days): 30
   ```
4. Add milestones:
   - **Milestone 1**: Wireframes (25%)
   - **Milestone 2**: Design (25%)
   - **Milestone 3**: Frontend (25%)
   - **Milestone 4**: Testing (25%)
5. Click **Create Project**

### 4.7 Test Payment (Stripe Test Card)

1. Should see escrow form
2. Use Stripe test card:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/34 (any future date)
   CVC: 123
   ```
3. Click **Pay**
4. Should see success message

### 4.8 Assign Expert (As Admin)

1. Go to admin dashboard
2. Look for project assignment
3. Assign test_expert to the project
4. Expert should see project in their dashboard

✅ **Basic flow complete!**

## 🔧 Troubleshooting

### "Cannot connect to PostgreSQL"
```bash
# Check if PostgreSQL is running
psql -U postgres -d escro_platform

# If error, start PostgreSQL:
# Windows: psql in Services (services.msc)
# Mac: brew services start postgresql
# Linux: sudo service postgresql start
```

### "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### "Port 5000/3000 already in use"
```bash
# Find process using port (Linux/Mac)
lsof -i :5000
kill -9 <PID>

# Windows - use Task Manager or:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "JWT token errors in console"
- Make sure `JWT_SECRET` is set in `.env`
- Refresh page and login again
- Clear localStorage: `localStorage.clear()`

### "File upload not working"
- Check `uploads/` folder exists in backend
- Verify `UPLOAD_DIR` in `.env`
- Check file size < 10MB

### "Stripe errors"
- Verify `STRIPE_SECRET_KEY` is correct
- Check you're using test mode keys (start with `sk_test_`)
- Get keys from: https://dashboard.stripe.com/apikeys

## 📊 Database Check

See what's in your database:

```bash
# Connect to database
psql -U postgres -d escro_platform

# List tables
\dt

# See users
SELECT email, name, role, kyc_status FROM users;

# See projects
SELECT id, title, budget_ron, status FROM projects;

# See milestones
SELECT id, title, amount_ron, status FROM milestones;

# Exit
\q
```

## 🚀 Next Steps

Once everything works:

1. **Explore the admin dashboard**
   - Create more test data
   - Test dispute resolution workflow
   - Check escrow calculations

2. **Test expert workflow**
   - Login as expert
   - View assigned project
   - Upload deliverable
   - See payment tracking

3. **Test full payment flow**
   - Create project
   - Deposit funds
   - Approve milestones
   - Watch funds release automatically

4. **Review code**
   - Backend logic in `/controllers/`
   - Frontend pages in `/src/pages/`
   - Database schema in `/scripts/initDb.js`

## 🔗 Useful Links

- **Backend API Docs**: Check README.md for endpoint list
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **React Docs**: https://react.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

## ⚠️ Important Notes

1. **This is development mode** - don't expose to internet
2. **Stripe test mode** - no real payments processed
3. **JWT secret** - change before production
4. **Database passwords** - change before production
5. **File uploads** - stored locally, not cloud backup

## ✅ Success Checklist

- [ ] Node.js and npm installed
- [ ] PostgreSQL installed and running
- [ ] Database created: `escro_platform`
- [ ] Backend installed: `npm install` done
- [ ] `.env` file configured with DB password & Stripe keys
- [ ] Database initialized: `npm run db:init` successful
- [ ] Backend running: `npm run dev` successful
- [ ] Frontend installed: `npm install` done
- [ ] Frontend running: `npm run dev` successful
- [ ] Can open `http://localhost:3000`
- [ ] Can register user
- [ ] Can login successfully
- [ ] Can create project
- [ ] Can make test payment with Stripe test card

## 🆘 Still Stuck?

Check:
1. All terminals are still running (backend at :5000, frontend at :3000)
2. No error messages in terminal output
3. Browser console for JavaScript errors (F12)
4. `.env` file has all required variables
5. PostgreSQL is running and database exists

---

**Last Updated:** February 7, 2026
**Platform:** ESCRO
**Developer:** Claudiu Vladau
