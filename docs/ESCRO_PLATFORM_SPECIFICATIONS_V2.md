# ESCRO Platform - Specifications V2
**Data:** 7 februarie 2026
**Status:** Requirements gathering phase

---

## 1. Core Model (Updated)

### Matching Engine
- **Type:** Manual (não automático)
- **Owner:** Claudiu Vladau
- **Process:** Claudiu evaluates client needs → selects appropriate expert from network → personal introduction
- **Criteria:** Customized per client (budget, timeline, constraints, industry, expertise)
- **No algorithmic matching needed** ✓

### Cost Model
- **Platform costs:** Covered by experts (they host their profiles, pay verification)
- **Claudiu's revenue:** Commission/percentage per deal (customizable)
- **Payment flow:** 
  1. Client deposits funds in escrow
  2. Expert delivers
  3. Client confirms
  4. Funds released → Expert keeps % after Claudiu's commission
  5. Claudiu takes agreed % per deal

### Timeline
- **Launch date:** TBD (no fixed deadline)
- **Development approach:** Iterative, feature-by-feature
- **MVP ready when:** Claudiu can manually manage all workflows

---

## 2. MVP Features (Minimum Viable Product)

### Phase 1 - Core Escrow
- [ ] User registration (experts + clients)
- [ ] Expert profiles (name, expertise, verification status)
- [ ] Project creation (client inputs: description, budget, timeline)
- [ ] Escrow wallet (hold funds safely)
- [ ] Payment integration (Stripe Connect for experts)
- [ ] Project status tracking (pending → in progress → completed)
- [ ] Manual assignment (Claudiu assigns expert to project)

### Phase 2 - Trust & Arbitration
- [ ] Dispute flag system (simple: "something wrong")
- [ ] Claudiu arbitration dashboard (review dispute, make decision)
- [ ] Reputation/review after project completion
- [ ] Basic messaging (client ↔ expert)

### Phase 3 - Admin (Claudiu only)
- [ ] Commission settings per deal (customize % after expert selection)
- [ ] Expert verification checklist
- [ ] Transaction history
- [ ] Dispute log
- [ ] Revenue reporting

---

## 3. Technology Stack (Simplified)

### Backend
- **Node.js + Express** (lightweight, fast to build)
- **PostgreSQL** (reliable, relational data)
- **Stripe API** (escrow + payments)
- **JWT Auth** (user sessions)

### Frontend
- **React** (component-based, mature)
- **Tailwind CSS** (styling, quick)
- **Formspree** (contact/support forms already working)

### Deployment
- **Server:** gazduire.net (already hosting landing page)
- **Database:** Managed PostgreSQL (or Supabase for simplicity)
- **File storage:** AWS S3 or Cloudinary (expert documents/profiles)

---

## 4. Data Models (Preliminary)

### User (Expert)
```
- id (UUID)
- name, email, phone
- expertise (string: "escrow", "legal", "accounting", etc.)
- company
- bio
- verification_status ("pending", "verified", "rejected")
- commission_rate (%)
- created_at, updated_at
```

### Client
```
- id (UUID)
- name, email, phone
- company
- registration_date
```

### Project
```
- id (UUID)
- client_id (FK)
- title, description
- budget
- timeline
- criteria/requirements (JSON - customizable)
- assigned_expert_id (FK) - Claudiu assigns manually
- status ("open", "assigned", "in_progress", "delivered", "completed", "disputed")
- created_at, deadline, completed_at
```

### Escrow Account
```
- id (UUID)
- project_id (FK)
- amount (in RON/USD)
- status ("held", "released", "refunded")
- claudiu_commission (%)
- expert_commission (%)
- created_at, released_at
```

### Dispute
```
- id (UUID)
- project_id (FK)
- raised_by (client_id or expert_id)
- reason (text)
- claudiu_decision (text - arbitration result)
- status ("pending", "resolved")
- created_at, resolved_at
```

---

## 5. User Workflows

### Expert Registration
1. Expert fills profile (name, expertise, company, bio)
2. Uploads verification documents
3. Claudiu manually verifies
4. Status → "verified"
5. Expert can now receive projects

### Project Creation (Client)
1. Client logs in
2. Creates new project:
   - Title, description
   - Budget, deadline
   - Custom criteria (JSON object)
3. Pays into escrow
4. Project status → "open"
5. Waits for Claudiu to assign expert

### Matching (Claudiu Manual)
1. Reviews open projects
2. Evaluates against expert network
3. Selects best expert
4. System auto-assigns expert to project
5. Sends notification to expert
6. Client can see who was assigned

### Project Delivery
1. Expert starts work
2. Client + expert communicate via in-app messaging
3. Expert delivers (uploads files/documents)
4. Client reviews
5. Client confirms ("delivery accepted")
6. Escrow releases funds
7. Claudiu's commission auto-deducted
8. Expert gets paid

### Dispute (If Needed)
1. Client flags project as disputed
2. Claudiu reviews both sides
3. Claudiu makes decision (arbitration)
4. Escrow released per decision
5. Project marked as "resolved"

---

## 6. Admin Dashboard (Claudiu Only)

- **Open projects:** List of new projects waiting assignment
- **Assignments:** Quick "assign expert" button
- **Commission settings:** Set % per deal (before assignment)
- **Transactions:** All escrow movements
- **Disputes:** Pending arbitrations
- **Expert management:** Verify/reject experts
- **Revenue:** Total earned to date

---

## 7. Next Steps - Questions to Answer

Before we start building, need clarification:

1. **Payment currency:** RON or USD or both?
2. **Minimum project budget:** What's the smallest escrow?
3. **Commission structure:** 
   - Fixed % per deal? (e.g., 10% always)
   - Or different % per expert/deal type?
   - Who pays commission - client or expert?
4. **Expert network size:** How many verified experts at launch? 0 (grow as you onboard) or pre-selected?
5. **Client base:** Do you have initial clients waiting, or bootstrap with zero?
6. **KYC requirements:** How strict? (docs needed? video call?)
7. **Messaging:** In-app chat or keep it external (WhatsApp, email)?
8. **Document storage:** Where do expert deliverables live? (platform files or external links)
9. **Refund policy:** If dispute goes to client, does money go back or can they reassign to different expert?
10. **Timeline for first real project:** When do you want to onboard first expert + first client to test?

---

## 8. Success Metrics (For MVP)

- ✓ 1 expert can register and get verified
- ✓ 1 client can create project + fund escrow
- ✓ Claudiu can manually assign expert to project
- ✓ Expert can deliver
- ✓ Client can confirm
- ✓ Escrow releases correctly
- ✓ Claudiu's commission calculated correctly

---

## 9. Risk/Considerations

- **Stripe compliance:** Need good docs + legal review for escrow model
- **Regulatory:** Financial services license needed? (depends on country/amount)
- **Fraud:** Expert doesn't deliver after getting paid → arbitration needed
- **User adoption:** Cold start problem (need experts first, or clients first?)
- **Scaling:** Manual matching works for 10-50 projects/month. After that, reconsider automation.

---

## Status: Waiting for Answers

Once you answer the 10 questions above, can start building.

**Estimated timeline to MVP (once questions answered):**
- Backend API: 2-3 weeks
- Frontend (React): 2-3 weeks
- Testing + fixes: 1 week
- **Total: 5-7 weeks** for basic, working platform

