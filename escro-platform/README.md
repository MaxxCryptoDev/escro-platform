# ESCRO Platform - Complete Application

Full-stack application for escrow, milestone-based payments, and expert arbitration.

## 🏗️ Project Structure

```
escro-platform/
├── backend/              # Node.js + Express API
│   ├── config/          # Database & Stripe config
│   ├── controllers/      # Business logic
│   ├── middleware/       # Auth & error handling
│   ├── routes/          # API endpoints
│   ├── scripts/         # Database initialization
│   ├── server.js        # Main server file
│   ├── package.json
│   └── .env.example     # Environment template
│
└── frontend/            # React + Vite UI
    ├── src/
    │   ├── pages/       # Page components
    │   ├── context/     # Auth context
    │   ├── services/    # API client
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── App.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. **Navigate to backend:**
```bash
cd escro-platform/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your values:
# - DB_PASSWORD (your PostgreSQL password)
# - JWT_SECRET (generate a random string)
# - STRIPE_SECRET_KEY (from Stripe dashboard - test mode)
# - STRIPE_PUBLISHABLE_KEY
# - STRIPE_WEBHOOK_SECRET
```

4. **Initialize database:**
```bash
npm run db:init
```

5. **Start server:**
```bash
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend:**
```bash
cd escro-platform/frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📋 Database Schema

### Core Tables

**users** - All platform users (experts, clients, admins)
- id (UUID)
- email, password_hash
- name, role (expert/client/admin)
- company, expertise, bio
- kyc_status (pending/verified/rejected)

**projects** - Client project requests
- id, client_id, expert_id
- title, description
- budget_ron, timeline_days
- status (open/assigned/in_progress/completed/disputed)

**milestones** - Deliverable stages within projects
- id, project_id, order_number
- title, deliverable_description
- percentage_of_budget, amount_ron
- status (pending/in_progress/delivered/approved/disputed/released)

**escrow_accounts** - Fund management
- id, project_id
- total_amount_ron
- claudiu_commission_percent
- held_balance_ron, released_to_expert_total_ron, claudiu_earned_total_ron

**milestone_releases** - Payment history
- id, escrow_id, milestone_id
- release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron
- released_at

**messages** - In-app communication
- id, project_id, sender_id, recipient_id
- content, file_url
- created_at, read_at

**milestone_disputes** - Conflict resolution
- id, milestone_id, raised_by
- reason, claudiu_decision
- claudiu_release_amount_ron
- status (pending/resolved)

## 🔐 Authentication

- JWT-based authentication
- Tokens stored in localStorage
- Automatic injection in all API requests
- Role-based access (expert, client, admin)

## 💳 Payment Flow

1. **Client creates project** with milestone structure
2. **Client deposits full budget** to escrow (via Stripe)
3. **Expert assigned** to project by admin (Claudiu)
4. **Expert delivers** milestone deliverable (file upload)
5. **Client approves** milestone
6. **Funds auto-release:**
   - Claudiu's commission deducted (%)
   - Expert gets rest
   - Tracked in milestone_releases table

### Dispute Flow

1. **Client or expert flags dispute** on specific milestone
2. **Claudiu reviews** evidence (chat, files)
3. **Claudiu decides** release amount (0-100% of milestone)
4. **Funds distributed** according to decision
5. **Project continues** or ends

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Projects (Clients)
- `POST /api/projects` - Create project with milestones
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Project details + milestones

### Milestones
- `POST /api/milestones/:id/deliverable` - Upload deliverable
- `PUT /api/milestones/:id/approve` - Approve milestone
- `POST /api/milestones/:id/dispute` - Dispute milestone

### Escrow
- `POST /api/escrow` - Create escrow account
- `POST /api/escrow/payment-intent` - Create Stripe payment intent
- `POST /api/escrow/confirm-payment` - Confirm payment
- `GET /api/escrow/:id` - Check escrow status

### Messages
- `POST /api/messages` - Send message
- `GET /api/projects/:id/messages` - Get all messages
- `PUT /api/messages/:id/read` - Mark as read

### Admin
- `PUT /api/admin/experts/:id/verify` - Approve/reject expert KYC
- `GET /api/admin/experts/pending` - List pending experts
- `GET /api/admin/experts/verified` - List verified experts
- `POST /api/admin/projects/:id/assign-expert` - Assign expert to project
- `PUT /api/admin/disputes/:id/resolve` - Arbitrate dispute
- `GET /api/admin/dashboard` - Dashboard stats

## 🎯 User Flows

### Expert Registration
1. Register account (email, password, name, company, expertise)
2. Platform verifies KYC documents
3. Admin (Claudiu) approves/rejects
4. If approved → can receive projects

### Client Project Creation
1. Register account
2. Create project (title, description, budget)
3. Define milestones (deliverables, % of budget)
4. Deposit funds to escrow via Stripe
5. Admin assigns expert
6. Expert starts work

### Project Execution
1. Expert uploads deliverable for milestone
2. Client reviews in-app
3. Client approves → funds release to expert
4. Repeat for each milestone
5. Project marked complete when all approved

### Dispute Handling
1. Client or expert flags specific milestone
2. Claudiu reviews chat history + files
3. Claudiu decides how to distribute funds
4. System releases per decision
5. Project continues or resolution ends

## 🧪 Testing the Platform

### Create Test Users

**Admin (Claudiu)**
```
Email: admin@escro.ro
Password: admin123
Role: admin
```

**Test Expert**
1. Register at `/register` with role "expert"
2. Admin must approve KYC at `/admin/dashboard`
3. Then can receive projects

**Test Client**
1. Register at `/register` with role "client"
2. Go to `/client/dashboard`
3. Create project with milestones
4. Deposit test funds (use Stripe test card: 4242 4242 4242 4242)

**Test Payment Flow**
1. Client creates project: 5000 RON, 4 milestones (25% each)
2. Client deposits 5000 RON
3. Admin assigns expert
4. Expert delivers milestone 1
5. Client approves → 1250 RON released (minus commission)
6. Repeat for next milestones

## 🔧 Stripe Test Mode

**Use these test cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

## 📝 Environment Variables Reference

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=escro_platform

# JWT
JWT_SECRET=your_random_secret_key
JWT_EXPIRE=7d

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Files
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Admin
ADMIN_EMAIL=vladau.claudiu95@gmail.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 🚀 Deployment

### Backend to gazduire.net
1. Connect via SSH to hosting
2. Clone/upload code
3. Run `npm install`
4. Create `.env` with production values
5. Run `npm run db:init`
6. Use PM2/systemd to run server persistently
7. Setup Nginx as reverse proxy

### Frontend to gazduire.net
1. Build: `npm run build`
2. Upload `dist/` folder to `public_html/`
3. Configure Nginx to serve index.html

## 📞 Support

Questions? Check:
- API responses for error messages
- Browser console for client-side errors
- Server logs for backend issues
- Database for data integrity

## ✅ Checklist Before Production

- [ ] Set up PostgreSQL backup
- [ ] Configure Stripe webhooks for production
- [ ] Setup HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Setup logging & monitoring
- [ ] Create admin user manually
- [ ] Test full payment flows
- [ ] Setup error tracking (Sentry, etc.)
- [ ] Document internal processes for Claudiu
- [ ] Setup email notifications (optional)

## 📊 Next Features (Optional)

- Real-time notifications (Socket.io)
- Expert reputation/rating system
- Automated payouts to expert bank accounts
- Project templates for common services
- Advanced search & filtering
- Mobile app (React Native)
- Multi-currency support
- Video call integration for arbitration

---

**Built for:** Claudiu Vladau - ESCRO Platform
**Status:** MVP Ready for Testing
**Last Updated:** February 7, 2026
