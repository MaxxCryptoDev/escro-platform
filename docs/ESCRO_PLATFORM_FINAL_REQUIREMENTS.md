# ESCRO Platform - FINAL SPECIFICATIONS
**Data:** 7 februarie 2026
**Status:** ALL REQUIREMENTS CONFIRMED ✓ - READY TO CODE

---

## ANSWERS - COMPLETE SET

1. Currency: **RON** ✓
2. Commission: **% per deal** ✓
3. Who pays: **Expert** ✓
4. Initial users: **Bootstrap from 0** ✓
5. Client base: **None yet** ✓
6. KYC: **Required** ✓
7. Messaging: **In-app chat + admin access to all** ✓
8. Deliverables: **File uploads in platform** ✓
9. **Dispute resolution & fund distribution:** 
   - Claudiu decides how to distribute in disputes
   - **MILESTONE-BASED ESCROW:** Expert & client set milestones when making deal
   - Each milestone has: deliverable, % of funds released at completion
   - Example: Stage 1 = 15%, Stage 2 = 25%, Stage 3 = 30%, Final = 30%
   - Client marks stage complete → funds auto-release to expert (minus Claudiu's commission)
   - If dispute on specific milestone, Claudiu reviews & decides distribution arbitrarily ✓
10. **Testing timeline:** Start testing when application is **fully complete** (MVP end-to-end) ✓

---

## CORE FEATURE: MILESTONE-BASED ESCROW

### Escrow Flow (Updated)

```
Deal Setup (Expert + Client agree):
  - Total budget: 10,000 RON
  - Claudiu commission: 10%
  
  Milestone 1 (Stage 1):
    - Deliverable: Design document
    - % of budget: 15% (1,500 RON)
    
  Milestone 2 (Stage 2):
    - Deliverable: Development kickoff
    - % of budget: 25% (2,500 RON)
    
  Milestone 3 (Stage 3):
    - Deliverable: First feature complete
    - % of budget: 30% (3,000 RON)
    
  Milestone 4 (Final):
    - Deliverable: Full project delivery
    - % of budget: 30% (3,000 RON)

Escrow holds full 10,000 RON

---

Milestone 1 Complete:
  - Expert delivers design doc
  - Client reviews & marks "approved"
  - Escrow releases: 1,500 RON
    → Claudiu commission: 1,500 × 10% = 150 RON
    → Expert gets: 1,500 - 150 = 1,350 RON
  - Remaining in escrow: 8,500 RON

---

[Repeat for milestones 2, 3, 4...]

---

Dispute on Milestone 2:
  - Expert says: "I delivered, client won't approve"
  - Client says: "Deliverable doesn't meet requirements"
  - Project marked as "disputed"
  - Claudiu reviews evidence (chat, files)
  - Claudiu decision: "Expert delivered 80% of milestone 2 requirements"
  - Claudiu releases: 2,500 × 80% = 2,000 RON to expert
  - Remaining disputed: 2,500 × 20% = 500 RON → decide case-by-case or refund to client
  - Project continues or ends based on decision
```

### Milestone Data Model

```sql
milestones (new table)
- id UUID PRIMARY KEY
- project_id UUID (FK)
- order_number INT (1, 2, 3, 4...)
- title VARCHAR (e.g., "Stage 1: Design")
- description TEXT
- deliverable_description TEXT (what needs to be delivered)
- percentage_of_budget DECIMAL (e.g., 15.0 for 15%)
- amount_ron DECIMAL (calculated: budget × percentage / 100)
- status ENUM ('pending', 'in_progress', 'delivered', 'approved', 'disputed', 'released')
- deliverable_file_url VARCHAR (uploaded file)
- completed_at TIMESTAMP
- created_at TIMESTAMP

milestone_disputes (new table)
- id UUID PRIMARY KEY
- milestone_id UUID (FK)
- raised_by UUID (FK)
- reason TEXT
- claudiu_decision TEXT
- claudiu_release_amount_ron DECIMAL (how much to release to expert)
- status ENUM ('pending', 'resolved')
- created_at TIMESTAMP
- resolved_at TIMESTAMP
```

---

## UPDATED ESCROW TABLE

```sql
escrow_accounts
- id UUID PRIMARY KEY
- project_id UUID (FK)
- total_amount_ron DECIMAL
- claudiu_commission_percent DECIMAL (e.g., 10.0)
- status ENUM ('held', 'partially_released', 'fully_released')
- held_balance_ron DECIMAL (remaining in escrow)
- released_to_expert_total_ron DECIMAL (cumulative releases)
- claudiu_earned_total_ron DECIMAL (cumulative commissions)
- created_at TIMESTAMP
- all_milestones_completed_at TIMESTAMP

milestone_releases (new table - payment history)
- id UUID PRIMARY KEY
- escrow_id UUID (FK)
- milestone_id UUID (FK)
- release_amount_ron DECIMAL
- claudiu_commission_amount_ron DECIMAL
- expert_amount_ron DECIMAL
- released_at TIMESTAMP
```

---

## PROJECT WORKFLOW (UPDATED)

### Step 1: Expert + Client agree on deal
```
Expert proposes:
- Title: "Build WordPress Site"
- Budget: 5,000 RON
- Timeline: 30 days
- Milestones:
  1. Setup & design mockups (20% = 1,000 RON)
  2. Frontend development (30% = 1,500 RON)
  3. Backend & integrations (30% = 1,500 RON)
  4. Testing & deployment (20% = 1,000 RON)

Client reviews & accepts in-app
→ Project created with all milestones
```

### Step 2: Client deposits 5,000 RON
```
Escrow account created
Status: "held"
Escrow holds full 5,000 RON
```

### Step 3: Expert works on Milestone 1
```
Expert uploads deliverable (design mockup file)
Marks milestone as "delivered"
Client reviews in-app
Client approves → Milestone status = "approved"
```

### Step 4: Claudiu's commission auto-deducted & expert paid
```
Escrow automatically:
  - Calculates: 1,000 × 10% = 100 RON (Claudiu commission)
  - Pays expert: 1,000 - 100 = 900 RON
  - Updates held_balance: 5,000 - 1,000 = 4,000 RON
  - Logs to milestone_releases table
  
Expert receives 900 RON in their payout account
```

### Step 5: Repeat milestones 2, 3, 4
### Step 6: All milestones done → Project "completed"
### Total paid to expert: 4,600 RON (5,000 - 400 commission)
### Claudiu earned: 400 RON from this deal

---

## DISPUTE SCENARIO (MILESTONE-SPECIFIC)

```
Milestone 2 marked "delivered"
Client says: "This doesn't match requirements"
Project flagged as "disputed"

Client + Expert chat in-app (Claudiu can see all messages)

Options:
A) They resolve it between them → milestone auto-approved
B) Claudiu arbitrates:
   - Reviews chat history
   - Reviews deliverable file
   - Decides: "Expert fulfilled 70% of requirements"
   - Claudiu releases: 1,500 × 70% = 1,050 RON to expert
   - Disputed amount: 1,500 × 30% = 450 RON → can be:
     * Held for rework (expert gets it when fixed)
     * Refunded to client (if requirements were unreasonable)
     * Claudiu decides case-by-case
```

---

## ADMIN DASHBOARD (MILESTONES VIEW)

### Per Project
- See all milestones (status: pending, in_progress, delivered, approved, disputed, released)
- View deliverable file
- Approve/dispute any milestone
- See payment history
- For disputes: review both sides, make decision, input release amount

### Milestone Release Log
- List all payments released
- Amount, expert, project, milestone, date
- Claudiu's commission earned
- Running total revenue

---

## DATABASE UPDATES SUMMARY

**New tables:**
- `milestones` - per project milestones
- `milestone_releases` - payment history per milestone
- `milestone_disputes` - disputes tied to specific milestones

**Updated tables:**
- `escrow_accounts` - now tracks partial releases, held balance
- `projects` - no change needed (milestones link via FK)

**Removed/consolidated:**
- Old `disputes` table → use `milestone_disputes` instead

---

## DEVELOPMENT ROADMAP (UPDATED)

### Week 1: Backend Setup + Schema
- Node.js + Express
- PostgreSQL with new schema (milestones, milestone_releases, milestone_disputes)
- Stripe Connect integration
- File upload handling

### Week 2: Core API - Auth & User Management
- Expert registration + KYC
- Client registration
- Admin approval workflow
- JWT auth

### Week 3: Project + Milestone API
- `/projects/create` (with milestones array)
- `/milestones` (list, view, upload deliverable)
- `/milestones/{id}/approve` (client marks done)
- `/milestones/{id}/dispute` (client disputes milestone)

### Week 4: Escrow + Payments
- `/escrow/create` (when client deposits)
- Auto-release on milestone approval
- Commission calculation & deduction
- Stripe payout to expert
- Payment history

### Week 5: Admin + Arbitration
- Admin dashboard API endpoints
- Dispute review & decision endpoints
- Milestone dispute resolution
- Fund distribution (Claudiu manually sets release amount)

### Week 6: Messaging
- In-app chat API (WebSocket for real-time)
- Admin message access
- Chat history logging

### Week 7: Frontend (React)
- Expert dashboard (create proposal, upload deliverables, track milestones)
- Client dashboard (approve/dispute milestones)
- Admin dashboard (full control, arbitration)

### Week 8: Testing + QA
- End-to-end flow testing
- Stripe sandbox testing
- Admin decision-making workflow
- Security audit

### Week 9: Deploy
- Server setup on gazduire.net or separate host
- Database migration
- Stripe production setup
- Documentation

---

## TIMELINE TO LAUNCH

**Start date:** 7 februarie 2026
**Estimated completion:** Late April 2026 (9-10 weeks)

**First real test:** Beginning of May 2026
- Onboard 1 expert (KYC approved)
- Onboard 1 client (simple registration)
- Run 1 test project with milestones
- Test escrow, payment, and full workflow

---

## READY TO START CODING ✓

All requirements confirmed. Full specifications locked.

**Next step:** Set up git repo + start Week 1 (backend skeleton).

Questions before I start?

