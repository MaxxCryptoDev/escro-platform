# ESCRO - Quick Reference: Reward System

## Core Rule
```
100 points = 1% reward from platform commission
```

## Reward Sources
- Expert/Company → `trust_profiles.trust_score` → `expert_reward`
- Client → `trust_profiles.trust_score` → `client_reward`  
- Referrer → `trust_profiles.referred_by` → `referral_reward`

## Where to Read
See: `docs/REWARD_SYSTEM_BUSINESS_RULES.md` for full details.

## Key Points
- NEVER touch escrow/expert payment
- Rewards from commission ONLY
- stripe_account_id goes in users table
- reward_transactions table for tracking
- Use existing trust_profiles, NOT create new referral tables

## Implementation Files
- `backend/services/rewardEngine.js` - Main logic
- `backend/services/stripeOnboardingService.js` - Stripe integration
