# ESCRO PLATFORM - REWARD SYSTEM BUSINESS RULES

## Overview
This document contains the permanent business logic for the reward distribution system in the ESCRO platform. All future implementations related to rewards and payments must follow these rules.

---

## GENERAL PRINCIPLES

1. **Escrow remains unchanged**: The existing escrow flow must NOT be modified
2. **Stripe is only the financial layer**: Handles transfers, onboarding, webhooks
3. **Rewards run AFTER commission calculation**: Never affects escrow amount or expert payment
4. **Rewards come from platform commission only**: Never from milestone value or expert payment

---

## REWARD CALCULATION

### Points to Percentage
```
100 points = 1% reward from platform commission
```

### Formula
```javascript
reward_percentage = Math.floor(trust_score / 100)
reward_amount = (commission_amount * reward_percentage) / 100
```

### Example
| Milestone Value | Commission (10%) | User Points | Reward % | Reward Amount |
|-----------------|------------------|-------------|----------|---------------|
| 1000 RON | 100 RON | 300 | 3% | 3 RON |
| 1000 RON | 100 RON | 500 | 5% | 5 RON |
| 1000 RON | 100 RON | 1000 | 10% (capped) | 10 RON |

---

## ENTITIES THAT RECEIVE REWARDS

### 1. Expert/Company (Party 1)
- Identified by: `projects.expert_id` or `projects.company_id`
- Reward type: `expert_reward`
- Based on: their own `trust_profiles.trust_score`

### 2. Client (Party 2)
- Identified by: `projects.client_id`
- Reward type: `client_reward`
- Based on: their own `trust_profiles.trust_score`

### 3. Referrers
- Identified by: `trust_profiles.referred_by`
- Reward type: `referral_reward`
- Multiple allowed: Both expert's referrer AND client's referrer can receive rewards

---

## DATA MODEL

### Users Table (existing + new column)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR;
```

### Reward Transactions Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS reward_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  milestone_id UUID REFERENCES milestones(id),
  amount DECIMAL(10, 2) NOT NULL,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('expert_reward', 'client_reward', 'referral_reward')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_transfer_id VARCHAR,
  source_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Existing Tables (READ ONLY)
- `trust_profiles` - Use `trust_score` and `referred_by`
- `referral_codes` - Do NOT modify
- `referrals` - Do NOT modify
- `escrow_accounts` - Do NOT modify
- `milestone_releases` - Do NOT modify

---

## PENDING REWARDS

### Rule
If user does NOT have `stripe_account_id`:
- Create reward_transactions with status = 'pending'
- Rewards NEVER expire
- Process later when user completes Stripe onboarding

### Processing
When user.stripe_account_id is set:
1. Query all pending rewards for user
2. Execute Stripe transfer for each
3. Update status to 'completed' or 'failed'

---

## STRIPE INTEGRATION

### Connected Accounts
- Each user (expert/company) needs a Stripe Express account
- Account ID stored in `users.stripe_account_id`

### API Calls Required
1. **Create Account**: `stripe.accounts.create({ type: 'express', country: 'RO', ... })`
2. **Account Link**: `stripe.accountLinks.create({ account, refresh_url, return_url, type: 'account_onboarding' })`
3. **Transfer**: `stripe.transfers.create({ amount, currency: 'ron', destination, description })`

### Webhook Events
- `account.updated` - Update user Stripe status
- `transfer.created` - Mark reward as completed
- `transfer.failed` - Mark reward as failed

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `backend/scripts/addStripeAccountIdToUsers.sql` | Migration for stripe_account_id |
| `backend/scripts/addRewardTransactionsTable.sql` | Migration for reward_transactions |
| `backend/services/stripeOnboardingService.js` | Stripe account creation & onboarding |
| `backend/services/rewardEngine.js` | Reward calculation & distribution |

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `backend/controllers/milestoneController.js` | Call rewardEngine after escrow release |
| `backend/server.js` | Add Stripe & reward routes |

---

## PAYOUT SEQUENCE

```
1. Client clicks "Aprobă și Eliberează Bani"
        ↓
2. milestoneController.approveMilestone()
        ↓
3. Mark milestone as 'approved'
        ↓
4. ESCROW RELEASE (EXISTING - UNCHANGED)
   - milestone_release record inserted
   - escrow_accounts updated
   - Expert receives: milestone_amount - commission
        ↓
5. REWARD ENGINE (NEW)
   a. Get project parties (expert, client)
   b. Get trust_score for each from trust_profiles
   c. Calculate reward % = trust_score / 100
   d. Calculate reward amount from commission
   e. Check referred_by for expert → create referral reward if exists
   f. Check referred_by for client → create referral reward if exists
   g. Create reward_transactions records (status: pending)
   h. For each reward:
      - If user.stripe_account_id exists → execute Stripe transfer
      - Update status to 'completed' with stripe_transfer_id
      - Else → keep as 'pending'
        ↓
6. Return success response
```

---

## IMPORTANT CONSTRAINTS

1. **NEVER modify escrow amount**
2. **NEVER modify milestone value**
3. **NEVER modify expert payment** (already calculated in milestone_release)
4. **Rewards are additive** - They come from platform commission, reducing platform earnings
5. **Multiple referrers allowed** - Both expert and client can have different referrers

---

## TRUST SCORE SOURCE

From `trust_profiles` table:
- Field: `trust_score` (DECIMAL 5,2)
- Calculated by: `TrustProfileService.calculateTrustScore()`
- Contains points from: KYC, profile completion, portfolio, projects, referrals, etc.

From `trust_profiles` table:
- Field: `referred_by` (UUID, references users.id)
- Points to the user who referred this user

---

## EXAMPLE FLOW

**Scenario**: 1000 RON milestone, 10% commission

```
Step 1: Client approves milestone

Step 2: Escrow releases (UNCHANGED)
  - Commission: 100 RON
  - Expert receives: 900 RON
  - Platform commission: 100 RON

Step 3: Reward calculation
  - Expert trust_score: 300 → 3% of 100 = 3 RON
  - Client trust_score: 200 → 2% of 100 = 2 RON
  - Expert referred_by: exists → 5% of 100 = 5 RON
  - Client referred_by: does NOT exist → 0 RON

Step 4: Reward distribution
  - Expert gets 3 RON (if stripe_account_id → transfer, else pending)
  - Client gets 2 RON (if stripe_account_id → transfer, else pending)
  - Expert's referrer gets 5 RON (if stripe_account_id → transfer, else pending)

Step 5: Platform keeps: 100 - 3 - 2 - 5 = 90 RON
```

---

## VERSION
- Created: 2026-03-06
- Updated: 2026-03-06
- Status: Approved for implementation
