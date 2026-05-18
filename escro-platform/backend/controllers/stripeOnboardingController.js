import pool from '../config/database.js';

// Live mode requires a real key. We treat "no key set" or the well-known Stripe sample as dev mode.
const STRIPE_SAMPLE_KEY_PREFIX = 'sk_test_4eC39';
const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
  && !process.env.STRIPE_SECRET_KEY.startsWith(STRIPE_SAMPLE_KEY_PREFIX);

const getStripe = async () => {
  if (!isLiveStripe) return null;
  const { default: stripe } = await import('../config/stripe.js');
  return stripe;
};

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Initiate Stripe Connect Express onboarding for a prestator (expert/company).
// Creates a Stripe account on first call, stores account_id in users.stripe_account_id,
// then returns an account_link URL the user opens to complete KYC + bank details.
export const initiateOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole === 'admin') {
      return res.status(403).json({ error: 'Adminul nu trece prin onboarding-ul Stripe.' });
    }
    // All other roles (client, expert, company) go through Stripe KYC.

    const userRes = await pool.query(
      `SELECT id, email, name, role, stripe_account_id, company, cui, phone FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    // KYC gate: user must have completed verification call with admin first
    const tpRes = await pool.query(
      `SELECT has_verification_call FROM trust_profiles WHERE user_id = $1`,
      [userId]
    );
    if (!tpRes.rows[0]?.has_verification_call) {
      return res.status(412).json({
        error: 'Trebuie să finalizezi apelul de verificare cu administratorul înainte de a configura Stripe.'
      });
    }

    const stripe = await getStripe();
    if (!stripe) {
      // Dev fallback: no real Stripe key configured. Mark as pending and return mock URL so UI can still flow.
      await pool.query(
        `UPDATE users SET stripe_account_id = COALESCE(stripe_account_id, 'pending_stripe_integration')
         WHERE id = $1`,
        [userId]
      );
      console.warn('[stripe] STRIPE_SECRET_KEY missing — onboarding returns mock URL (dev mode)');
      return res.json({
        success: true,
        onboarding_url: `${frontendUrl()}/wallet?stripe_setup=mock`,
        mock: true,
        message: 'STRIPE_SECRET_KEY nu este configurat. Adaugă cheia în .env pentru onboarding real.'
      });
    }

    let accountId = user.stripe_account_id && user.stripe_account_id.startsWith('acct_')
      ? user.stripe_account_id
      : null;

    // Create the Express account if we don't have a real one yet
    if (!accountId) {
      // Only the 'individual' role is a real persoană fizică for Stripe KYC.
      // Both 'expert' (PFA/SRL) and 'company' (SRL) have CUI → business KYC.
      const businessType = userRole === 'individual' ? 'individual' : 'company';

      const accountParams = {
        type: 'express',
        country: 'RO',
        email: user.email,
        capabilities: { transfers: { requested: true } },
        business_type: businessType,
        metadata: { escro_user_id: userId, role: userRole },
      };

      // Pre-fill what we already collected at registration to reduce friction during onboarding
      if (businessType === 'company') {
        if (user.company) accountParams.business_profile = { name: user.company };
        if (user.cui) accountParams.company = { tax_id: user.cui };
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      await pool.query(
        `UPDATE users SET stripe_account_id = $1 WHERE id = $2`,
        [accountId, userId]
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl()}/wallet?stripe_setup=refresh`,
      return_url: `${frontendUrl()}/wallet?stripe_setup=done`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      onboarding_url: link.url,
      account_id: accountId,
      expires_at: link.expires_at,
    });
  } catch (error) {
    console.error('[stripe:initiateOnboarding]', error);
    next(error);
  }
};

// Re-generate an onboarding link (called when Stripe redirects to /refresh_url because the previous link expired).
export const refreshOnboardingLink = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stripe = await getStripe();
    if (!stripe) return res.status(412).json({ error: 'Stripe is not configured.' });

    const userRes = await pool.query(`SELECT stripe_account_id FROM users WHERE id = $1`, [userId]);
    const accountId = userRes.rows[0]?.stripe_account_id;
    if (!accountId || !accountId.startsWith('acct_')) {
      return res.status(412).json({ error: 'Niciun cont Stripe inițializat. Apelează /onboarding întâi.' });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl()}/wallet?stripe_setup=refresh`,
      return_url: `${frontendUrl()}/wallet?stripe_setup=done`,
      type: 'account_onboarding',
    });
    res.json({ success: true, onboarding_url: link.url, expires_at: link.expires_at });
  } catch (error) {
    console.error('[stripe:refreshOnboardingLink]', error);
    next(error);
  }
};

export const getOnboardingStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_transfers_enabled
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];

    // If we have a real account id, refresh its status from Stripe so the DB stays in sync even
    // when webhooks don't reach us (dev without ngrok, etc.).
    const stripe = await getStripe();
    if (stripe && row.stripe_account_id && row.stripe_account_id.startsWith('acct_')) {
      try {
        const acct = await stripe.accounts.retrieve(row.stripe_account_id);
        const onboardingComplete = !!acct.details_submitted;
        const chargesEnabled = !!acct.charges_enabled;
        const transfersEnabled = !!acct.payouts_enabled && acct.capabilities?.transfers === 'active';
        const noOutstanding = !(acct.requirements?.currently_due?.length || 0)
          && !(acct.requirements?.past_due?.length || 0);
        const stripeKycVerified = onboardingComplete && chargesEnabled && noOutstanding;

        await pool.query(
          `UPDATE users SET
             stripe_onboarding_complete = $1,
             stripe_charges_enabled = $2,
             stripe_transfers_enabled = $3,
             kyc_status = CASE
               WHEN $5::boolean = TRUE AND COALESCE(kyc_status, 'pending') != 'verified' THEN 'verified'
               ELSE kyc_status
             END
           WHERE id = $4`,
          [onboardingComplete, chargesEnabled, transfersEnabled, userId, stripeKycVerified]
        );
        return res.json({
          success: true,
          stripe: {
            account_id: row.stripe_account_id,
            onboarding_complete: onboardingComplete,
            charges_enabled: chargesEnabled,
            transfers_enabled: transfersEnabled,
            details_submitted: acct.details_submitted,
            requirements: acct.requirements,
          }
        });
      } catch (e) {
        console.warn('[stripe:getOnboardingStatus] account retrieve failed:', e.message);
      }
    }

    res.json({
      success: true,
      stripe: {
        account_id: row.stripe_account_id,
        onboarding_complete: row.stripe_onboarding_complete || false,
        charges_enabled: row.stripe_charges_enabled || false,
        transfers_enabled: row.stripe_transfers_enabled || false,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Stripe Express dashboard one-time login link (for prestators to manage their bank/payouts).
export const createLoginLink = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stripe = await getStripe();
    if (!stripe) return res.status(412).json({ error: 'Stripe is not configured.' });

    const userRes = await pool.query(`SELECT stripe_account_id FROM users WHERE id = $1`, [userId]);
    const accountId = userRes.rows[0]?.stripe_account_id;
    if (!accountId || !accountId.startsWith('acct_')) {
      return res.status(412).json({ error: 'Niciun cont Stripe Connect.' });
    }
    const link = await stripe.accounts.createLoginLink(accountId);
    res.json({ success: true, url: link.url });
  } catch (error) {
    console.error('[stripe:createLoginLink]', error);
    next(error);
  }
};

// Webhook handler — verifies signature then routes events. Body is RAW (Buffer) because
// the route uses express.raw() in server.js.
export const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = await getStripe();
  const isProduction = process.env.NODE_ENV === 'production';

  let event;
  if (stripe && secret && signature) {
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
      console.error('[stripe:webhook] signature verification failed:', err.message);
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }
  } else {
    if (isProduction) {
      console.error('[stripe:webhook] refusing unsigned event in production', {
        hasStripe: !!stripe,
        hasSecret: !!secret,
        hasSignature: !!signature,
      });
      return res.status(412).send('Webhook verification not configured');
    }
    // Dev / not configured — accept unsigned but log loudly
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).send('Invalid body');
    }
    if (!secret) console.warn('[stripe:webhook] STRIPE_WEBHOOK_SECRET missing — running unverified (dev only)');
  }

  // Persist for audit
  await pool.query(
    `INSERT INTO stripe_events (stripe_event_id, event_type, resource_id, data, processed, created_at)
     VALUES ($1, $2, $3, $4, FALSE, NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [event.id, event.type, event.data?.object?.id || null, JSON.stringify(event)]
  ).catch(e => console.warn('[stripe:webhook] persist failed:', e.message));

  try {
    switch (event.type) {
      case 'account.updated': {
        const acct = event.data.object;
        const onboardingComplete = !!acct.details_submitted;
        const chargesEnabled = !!acct.charges_enabled;
        const transfersEnabled = !!acct.payouts_enabled && acct.capabilities?.transfers === 'active';
        // KYC is considered passed when Stripe Connect onboarding is fully complete
        // AND the account is past the verification stage (no outstanding requirements).
        const noOutstanding = !(acct.requirements?.currently_due?.length || 0)
          && !(acct.requirements?.past_due?.length || 0);
        const stripeKycVerified = onboardingComplete && chargesEnabled && noOutstanding;

        await pool.query(
          `UPDATE users SET
             stripe_onboarding_complete = $1,
             stripe_charges_enabled = $2,
             stripe_transfers_enabled = $3
           WHERE stripe_account_id = $4`,
          [onboardingComplete, chargesEnabled, transfersEnabled, acct.id]
        );

        // Only Stripe-side success may flip kyc_status to 'verified' — never internal verification call.
        if (stripeKycVerified) {
          await pool.query(
            `UPDATE users SET kyc_status = 'verified', updated_at = CURRENT_TIMESTAMP
             WHERE stripe_account_id = $1 AND COALESCE(kyc_status, 'pending') != 'verified'`,
            [acct.id]
          ).catch(e => console.warn('[stripe→kyc]', e.message));

          // Notify the user that KYC is complete and they can now use the platform
          const userRes = await pool.query(`SELECT id FROM users WHERE stripe_account_id = $1`, [acct.id]);
          const uid = userRes.rows[0]?.id;
          if (uid) {
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, message, link, created_at)
               VALUES ($1, 'kyc_verified', 'KYC complet ✓',
                       'Verificarea Stripe a fost finalizată cu succes. Acum poți folosi toate funcționalitățile platformei.',
                       '/wallet', NOW())`,
              [uid]
            ).catch(() => {});
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const escrowId = pi.metadata?.escrow_id;
        if (escrowId) {
          // Mark escrow as held with full amount, mirror the confirmPayment flow
          await pool.query(
            `UPDATE escrow_accounts
             SET status = 'held',
                 held_balance_ron = COALESCE(NULLIF(held_balance_ron, 0), total_amount_ron),
                 stripe_payment_intent_id = $2
             WHERE id = $1 AND status != 'held'`,
            [escrowId, pi.id]
          ).catch(async () => {
            // stripe_payment_intent_id column may not exist yet — fallback without it
            await pool.query(
              `UPDATE escrow_accounts SET status = 'held', held_balance_ron = COALESCE(NULLIF(held_balance_ron, 0), total_amount_ron) WHERE id = $1 AND status != 'held'`,
              [escrowId]
            );
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.warn('[stripe:webhook] payment_intent.payment_failed', pi.id, pi.last_payment_error?.message);
        break;
      }
      case 'transfer.created':
        console.log(`[stripe:webhook] transfer.created`, event.data.object.id);
        break;
      case 'transfer.failed': {
        const transfer = event.data.object;
        const transferId = transfer.id;
        const failureMessage = transfer.failure_message || transfer.failure_code || 'Transfer failed';
        console.error('[stripe:webhook] transfer.failed', transferId, failureMessage);

        const mrUpdate = await pool.query(
          `UPDATE milestone_releases
           SET stripe_payout_status = 'failed'
           WHERE stripe_transfer_id = $1
           RETURNING id, milestone_id, expert_amount_ron`,
          [transferId]
        ).catch(e => { console.warn('[transfer.failed mr]', e.message); return { rows: [] }; });

        const prUpdate = await pool.query(
          `UPDATE payout_requests
           SET status = 'failed'
           WHERE stripe_transfer_id = $1
           RETURNING id, user_id, amount_ron`,
          [transferId]
        ).catch(e => { console.warn('[transfer.failed pr]', e.message); return { rows: [] }; });

        const adminEmail = process.env.ADMIN_EMAIL || 'vladau.claudiu95@gmail.com';
        const adminRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]).catch(() => ({ rows: [] }));
        const adminId = adminRes.rows[0]?.id;
        if (adminId) {
          const details = mrUpdate.rows[0]
            ? `milestone release #${mrUpdate.rows[0].id} (${mrUpdate.rows[0].expert_amount_ron} RON)`
            : prUpdate.rows[0]
            ? `payout request #${prUpdate.rows[0].id} (${prUpdate.rows[0].amount_ron} RON)`
            : `transfer ${transferId}`;
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link, created_at)
             VALUES ($1, 'stripe_transfer_failed', 'Transfer Stripe eșuat', $2, '/admin/payouts', NOW())`,
            [adminId, `Transfer Stripe eșuat: ${details}. Motiv: ${failureMessage}. Verifică în Stripe Dashboard.`]
          ).catch(e => console.warn('[transfer.failed notify]', e.message));
        }
        break;
      }
      default:
        // Other events get logged but not acted on
        break;
    }

    await pool.query(
      `UPDATE stripe_events SET processed = TRUE, processed_at = NOW() WHERE stripe_event_id = $1`,
      [event.id]
    ).catch(() => {});

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe:webhook] handler error', error);
    return res.status(500).send('Webhook handler error');
  }
};
