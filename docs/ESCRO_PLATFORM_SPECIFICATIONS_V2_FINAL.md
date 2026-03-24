# ESCRO Platform - Specifications V2 (UPDATED)
**Data:** 7 februarie 2026
**Status:** Requirements confirmed - ready to start development

---

## ANSWERS CONFIRMED ✓

1. **Currency:** RON ✓
2. **Commission:** % per deal (Claudiu sets custom % per transaction) ✓
3. **Who pays:** Expert pays commission to Claudiu ✓
4. **Initial users:** Bootstrap from 0
   - Experts register → Claudiu approves (KYC verification)
   - Clients register → Claudiu can auto-approve or review
   - No pre-existing network
5. **Client base:** None yet - will grow organically ✓
6. **KYC:** Yes - required before expert verification ✓
7. **Messaging:** In-app chat with full admin access
   - Claudiu can see all conversations
   - Claudiu can participate if needed (arbitration)
8. **Deliverables:** TBD (not specified - can use file uploads in platform)

---

## FINAL DATA MODEL

### User/Expert Registration Flow
```
Expert Signs Up
  ↓
Provides: name, email, phone, expertise, company, bio
  ↓
Uploads KYC docs (ID, proof of residence, etc.)
  ↓
Claudiu reviews & approves (admin dashboard)
  ↓
Status: "verified" → Can receive projects
```

### Escrow + Commission Calculation
```
Client creates project: 5,000 RON
Claudiu sets commission: 10% (for this deal)

Escrow holds: 5,000 RON

Expert delivers & completes

Client confirms

Funds released:
  - Claudiu takes: 5,000 × 10% = 500 RON
  - Expert gets: 5,000 - 500 = 4,500 RON
```

### Chat/Messaging
```
Client ↔ Expert: In-app messaging (private)
Claudiu (Admin): 
  - Can view all conversations (read-only or participative)
  - Can jump into any chat for arbitration
  - Chat history logged with timestamps
```

---

## MVP FEATURES (FINAL)

### Phase 1 - Core Escrow & Matching
- [ ] Expert registration + KYC approval workflow
- [ ] Client registration (simple, no KYC yet)
- [ ] Expert verification dashboard (Claudiu approves/rejects)
- [ ] Project creation (client inputs: title, description, budget, timeline, criteria)
- [ ] Escrow wallet (Stripe Connect integration)
- [ ] Manual expert assignment (Claudiu assigns expert from verified list)
- [ ] Commission configuration (Claudiu sets % per project before/after assignment)
- [ ] Project status tracking (open → assigned → in_progress → completed)

### Phase 2 - Communication & Arbitration
- [ ] In-app messaging (client ↔ expert)
- [ ] Admin chat access (Claudiu sees all, can participate)
- [ ] Message history & timestamps
- [ ] Dispute flag system
- [ ] Claudiu arbitration (review, decide, release funds accordingly)
- [ ] Project completion confirmation (client marks "done")
- [ ] Escrow release with commission deduction

### Phase 3 - Trust & Analytics
- [ ] Expert reputation (reviews after project)
- [ ] Client feedback
- [ ] Claudiu admin dashboard (transactions, disputes, revenue)
- [ ] Expert management (view all, stats, performance)

---

## DATABASE SCHEMA (UPDATED)

### experts
```sql
id UUID PRIMARY KEY
email VARCHAR UNIQUE
password_hash VARCHAR
name VARCHAR
expertise TEXT
company VARCHAR
bio TEXT
kyc_status ENUM ('pending', 'verified', 'rejected')
kyc_documents JSONB (file paths/URLs)
verification_date TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

### clients
```sql
id UUID PRIMARY KEY
email VARCHAR UNIQUE
password_hash VARCHAR
name VARCHAR
company VARCHAR
created_at TIMESTAMP
```

### projects
```sql
id UUID PRIMARY KEY
client_id UUID (FK)
expert_id UUID (FK) - assigned by Claudiu
title VARCHAR
description TEXT
budget_ron DECIMAL
timeline_days INT
custom_criteria JSONB (flexible schema per project)
status ENUM ('open', 'assigned', 'in_progress', 'delivered', 'completed', 'disputed')
created_at TIMESTAMP
deadline TIMESTAMP
completed_at TIMESTAMP
```

### escrow_accounts
```sql
id UUID PRIMARY KEY
project_id UUID (FK)
amount_ron DECIMAL
claudiu_commission_percent DECIMAL (e.g., 10.0)
claudiu_commission_amount_ron DECIMAL (calculated at release)
expert_amount_ron DECIMAL (calculated at release)
status ENUM ('held', 'released', 'refunded')
created_at TIMESTAMP
released_at TIMESTAMP
```

### messages
```sql
id UUID PRIMARY KEY
project_id UUID (FK)
sender_id UUID (FK) - expert_id or client_id
recipient_id UUID (FK)
content TEXT
file_url VARCHAR (optional attachment)
created_at TIMESTAMP
read_at TIMESTAMP
```

### disputes
```sql
id UUID PRIMARY KEY
project_id UUID (FK)
raised_by UUID (FK) - expert_id or client_id
reason TEXT
claudiu_decision TEXT (arbitration judgment)
status ENUM ('pending', 'resolved')
created_at TIMESTAMP
resolved_at TIMESTAMP
```

---

## ADMIN DASHBOARD (CLAUDIU ONLY)

### Projects Section
- View all projects (open, assigned, in_progress, completed, disputed)
- Quick "assign expert" dropdown
- Set commission % before/after assignment
- View project details + all messages

### Messages Section
- Inbox view of all project chats
- Can read/participate in any conversation
- Search messages
- Filter by project or user

### Expert Management
- Pending KYC approvals (list with docs)
- Approve/reject buttons
- View all verified experts (name, expertise, stats)
- Suspend/remove expert if needed

### Transactions
- All escrow movements
- Filter by date, project, expert
- Commission earned (RON total)
- Pending releases vs. completed

### Disputes
- List of disputed projects
- View both sides' arguments
- Make arbitration decision
- Document decision + release funds

---

## DEVELOPMENT ROADMAP

### Week 1-2: Backend Setup
- Node.js + Express scaffold
- PostgreSQL setup
- Stripe Connect integration (sandbox)
- JWT auth (login/register)
- File upload handling (KYC docs)

### Week 2-3: Core API Endpoints
- `/auth/register`, `/auth/login`
- `/experts` (CRUD + KYC management)
- `/clients` (CRUD)
- `/projects` (create, assign, list)
- `/escrow` (create account, release with commission)
- `/messages` (send, get history)

### Week 3-4: Admin Features
- Admin dashboard API
- Commission configuration endpoint
- Expert approval workflow
- Dispute handling endpoints

### Week 4-5: Frontend (React)
- Expert registration form + KYC upload
- Client dashboard (create project, view status)
- Project detail + messaging UI
- Admin dashboard (full control)

### Week 5-6: Testing + Integration
- Test escrow flow end-to-end
- Stripe payment testing
- Admin approval workflow
- Security review

### Week 6-7: Deploy + Docs
- Deploy to gazduire.net or separate server
- Admin docs for Claudiu
- User guides for experts/clients

---

## QUESTIONS STILL PENDING

9. **Refund policy:** If client wins dispute, does money go back to client or can they reassign to different expert?
10. **First test timeline:** When do you want to onboard first expert + client to test real project?

Answer these, and we're 100% ready to code.

---

## TECH STACK (FINAL)

**Backend**
- Node.js 20 + Express.js
- PostgreSQL 14+
- Stripe API v3 (escrow/payments in RON)
- JWT (auth)
- Multer (file uploads)

**Frontend**
- React 18 + Vite
- Tailwind CSS
- React Query (data fetching)
- Socket.io (real-time chat)

**Deployment**
- Server: gazduire.net (same hosting as landing page)
- Database: PostgreSQL managed (or Supabase)
- Storage: AWS S3 or local file system (KYC docs)

---

## ESTIMATED BUILD TIME

**5-7 weeks** from today (Feb 7) → ready for first real project test by mid-March

Once you answer questions 9-10, can start immediately.
