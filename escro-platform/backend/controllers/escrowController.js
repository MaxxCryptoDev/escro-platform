import pool from '../config/database.js';
import { logAdminAction } from '../services/adminAuditService.js';

// Live Stripe = real key (not the public Stripe sample) is configured.
const STRIPE_SAMPLE_KEY_PREFIX = 'sk_test_4eC39';
const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
  && !process.env.STRIPE_SECRET_KEY.startsWith(STRIPE_SAMPLE_KEY_PREFIX);
const STRIPE_STUB_MODE = !isLiveStripe;

export const createEscrowAccount = async (req, res, next) => {
  try {
    const { project_id, total_amount_ron } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const existingEscrow = await pool.query(
      'SELECT id FROM escrow_accounts WHERE project_id = $1',
      [project_id]
    );
    if (existingEscrow.rows.length > 0) {
      return res.status(409).json({ message: 'Escrow account already exists for this project', escrow_id: existingEscrow.rows[0].id });
    }

    const projectResult = await pool.query(
      'SELECT commission_percent, service_type, client_id, expert_id, company_id, budget_ron FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project parties or admin can create escrow
    const proj = projectResult.rows[0];
    const isParty = [proj.client_id, proj.expert_id, proj.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ message: 'Only project parties can create escrow' });
    }

    const projectBudget = parseFloat(proj.budget_ron) || 0;
    const requested = parseFloat(total_amount_ron) || 0;
    if (requested <= 0 || requested > projectBudget + 0.5) {
      return res.status(400).json({
        message: `Suma escrow (${requested} RON) trebuie să fie pozitivă și cel mult ${projectBudget} RON (bugetul proiectului).`
      });
    }

    // Default expert-side commission (deducted at release): 5%. Admin can override per
    // project (matching) or it stays at 5% for direct (where expert + client each pay 5%).
    const commission_percent = proj.commission_percent || 5;

    // Note: Stripe Connect accounts belong to USERS (prestators), not to escrow records.
    // Onboarding is handled separately in stripeOnboardingController. We don't create
    // a Stripe account here — escrow rows are platform-side bookkeeping only.
    const result = await pool.query(
      `INSERT INTO escrow_accounts (project_id, total_amount_ron, claudiu_commission_percent, status, held_balance_ron, released_to_expert_total_ron, claudiu_earned_total_ron, created_at)
       VALUES ($1, $2, $3, 'held', $2, 0, 0, NOW())
       RETURNING *`,
      [project_id, total_amount_ron, commission_percent]
    );

    res.status(201).json({
      success: true,
      escrow: result.rows[0],
      message: 'Escrow account created',
      stub_mode: STRIPE_STUB_MODE,
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentIntent = async (req, res, next) => {
  try {
    const { escrow_id, amount_ron } = req.body;

    const escrowResult = await pool.query(
      'SELECT * FROM escrow_accounts WHERE id = $1',
      [escrow_id]
    );

    if (escrowResult.rows.length === 0) {
      return res.status(404).json({ message: 'Escrow account not found' });
    }

    if (STRIPE_STUB_MODE) {
      return res.json({
        success: true,
        clientSecret: `stub_secret_${escrow_id}_${Date.now()}`,
        stub_mode: true,
        message: 'Stub payment intent — STRIPE_SECRET_KEY missing',
      });
    }

    const { default: stripe } = await import('../config/stripe.js');
    const amountCents = Math.round(amount_ron * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'ron',
      automatic_payment_methods: { enabled: true },
      metadata: { escrow_id, user_id: req.user.id },
      description: `ESCRO deposit · escrow ${escrow_id}`,
    });

    // Persist the PI id on the escrow row immediately so we can match webhook events even if
    // metadata didn't propagate (e.g., older PIs created before this change).
    await pool.query(
      `UPDATE escrow_accounts SET stripe_payment_intent_id = $1 WHERE id = $2`,
      [paymentIntent.id, escrow_id]
    ).catch(() => {});

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      message: 'Payment intent created'
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const { escrow_id, payment_intent_id } = req.body;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // KYC gate: only verified users (or admin) can mark escrow as held.
    // Prevents stub-mode abuse where an unverified user could fund escrow without going through Stripe Checkout.
    if (!isAdmin && userId) {
      const userKyc = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
      if (userKyc.rows[0]?.kyc_status !== 'verified') {
        return res.status(403).json({
          message: 'Contul tău nu este verificat KYC. Finalizează verificarea înainte de a depune fonduri.',
        });
      }
    }

    if (!STRIPE_STUB_MODE && payment_intent_id && !payment_intent_id.startsWith('stub_')) {
      const { default: stripe } = await import('../config/stripe.js');
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment not successful' });
      }

      const escrowCheck = await pool.query(
        'SELECT total_amount_ron FROM escrow_accounts WHERE id = $1',
        [escrow_id]
      );
      if (escrowCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Escrow account not found' });
      }
      // Client pays milestone amount + 5% commission. Stripe charge should be milestone × 1.05.
      const milestoneCents = Math.round(escrowCheck.rows[0].total_amount_ron * 100);
      const expectedCents = Math.round(milestoneCents * 1.05);
      if (paymentIntent.amount !== expectedCents) {
        return res.status(400).json({ message: `Payment amount mismatch. Expected ${expectedCents} cents (milestone + 5%), got ${paymentIntent.amount}` });
      }
    }

    const existingCheck = await pool.query(
      'SELECT status, project_id, total_amount_ron FROM escrow_accounts WHERE id = $1',
      [escrow_id]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Escrow account not found' });
    }
    if (existingCheck.rows[0].status === 'held') {
      return res.json({ success: true, message: 'Payment already confirmed', stub_mode: STRIPE_STUB_MODE });
    }

    // Balance math (held_balance_ron, claudiu_earned_total_ron) is done by the Stripe
    // webhook handler (`payment_intent.succeeded`). Here we only mark the escrow row as
    // `held` so the UI can react immediately; the webhook is the source of truth for
    // amounts. This avoids double-counting if both endpoints fire for the same payment.
    await pool.query(
      `UPDATE escrow_accounts SET status = 'held' WHERE id = $1 AND status != 'held'`,
      [escrow_id]
    );

    const escrowResult = { rows: existingCheck.rows };

    const projectId = escrowResult.rows[0].project_id;
    await pool.query(
      `UPDATE projects SET status = 'assigned' WHERE id = $1`,
      [projectId]
    );

    const projData = await pool.query(
      `SELECT p.title, p.expert_id, p.company_id, e.total_amount_ron
       FROM projects p JOIN escrow_accounts e ON e.project_id = p.id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projData.rows.length > 0) {
      const proj = projData.rows[0];
      const prestatorId = proj.expert_id || proj.company_id;
      const amount = proj.total_amount_ron ? ` (${parseFloat(proj.total_amount_ron).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON)` : '';
      if (prestatorId) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, link, created_at)
           VALUES ($1, 'escrow_funded', 'Fonduri depuse — poți începe lucrul', $2, $3, NOW())`,
          [prestatorId, `Beneficiarul a depus${amount} în escrow pentru proiectul „${proj.title}". Poți începe lucrul conform contractului.`, `/project/${projectId}`]
        ).catch(e => console.warn('[bg]', e.message));
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed, funds held in escrow',
      stub_mode: STRIPE_STUB_MODE,
    });
  } catch (error) {
    next(error);
  }
};

// One-shot: ensure escrow row + return Stripe payment intent client secret for the checkout page.
// Frontend uses this to render <PaymentElement>; the actual fund-held flip happens via webhook.
export const startCheckoutSession = async (req, res, next) => {
  try {
    const { project_id, amount_ron, milestone_id } = req.body;
    const userId = req.user.id;
    const amount = parseFloat(amount_ron);
    if (!project_id || !(amount > 0)) {
      return res.status(400).json({ error: 'project_id și amount_ron > 0 sunt obligatorii.' });
    }

    const projRes = await pool.query(
      `SELECT id, client_id, expert_id, company_id, title, budget_ron, commission_percent, task_id
       FROM projects WHERE id = $1`,
      [project_id]
    );
    if (!projRes.rows.length) return res.status(404).json({ error: 'Proiect inexistent.' });
    const proj = projRes.rows[0];

    const isClient = String(proj.client_id) === String(userId);
    const isAdmin = req.user.role === 'admin';
    if (!isClient && !isAdmin) {
      return res.status(403).json({ error: 'Doar beneficiarul poate depune fonduri.' });
    }

    // Gate: standalone projects (non-PM) need a signed project contract before any funding.
    // PM sub-projects (task_id IS NOT NULL) use milestone contracts instead. Admin can override.
    if (!isAdmin && !proj.task_id) {
      const contractRes = await pool.query(
        `SELECT status FROM contracts
         WHERE project_id = $1 AND contract_type = 'project'
         ORDER BY created_at DESC LIMIT 1`,
        [project_id]
      );
      if (contractRes.rows.length === 0) {
        return res.status(412).json({
          error: 'Generează și semnează contractul de proiect înainte să depui fonduri în escrow.',
          code: 'CONTRACT_REQUIRED',
        });
      }
      if (contractRes.rows[0].status !== 'accepted') {
        return res.status(412).json({
          error: 'Contractul de proiect trebuie semnat de ambele părți înainte să depui fonduri.',
          code: 'CONTRACT_NOT_ACCEPTED',
        });
      }
    }

    // Find or create escrow row (idempotent)
    let escrowRow = (await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1', [project_id])).rows[0];
    if (!escrowRow) {
      const commission = proj.commission_percent || 5;
      const ins = await pool.query(
        `INSERT INTO escrow_accounts (project_id, total_amount_ron, claudiu_commission_percent, status, held_balance_ron, released_to_expert_total_ron, claudiu_earned_total_ron, created_at)
         VALUES ($1, $2, $3, 'open', 0, 0, 0, NOW())
         RETURNING *`,
        [project_id, amount, commission]
      );
      escrowRow = ins.rows[0];
    }

    // Client-side commission: 5% on top of milestone amount (kept by platform on deposit).
    // What goes to the expert (held in escrow) = `amount`. What the client actually pays
    // through Stripe = `amount + 5%`. The +5% is the platform's cut from the client.
    const CLIENT_COMMISSION_RATE = 0.05;
    const clientCommission = Math.round(amount * CLIENT_COMMISSION_RATE * 100) / 100;
    const totalChargeRon = amount + clientCommission;

    const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
      && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_4eC39');

    if (!isLiveStripe) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[startCheckoutSession] STRIPE_SECRET_KEY missing or sample in production — refusing stub mode');
        return res.status(503).json({
          error: 'Plățile sunt indisponibile momentan. Echipa platformei a fost notificată.',
        });
      }
      // Dev mode without real Stripe key: pretend payment succeeded.
      // held_balance_ron = milestone amount (for expert); platform pockets clientCommission immediately.
      await pool.query(
        `UPDATE escrow_accounts
         SET status = 'held',
             held_balance_ron = total_amount_ron,
             claudiu_earned_total_ron = COALESCE(claudiu_earned_total_ron, 0) + $2
         WHERE id = $1 AND status != 'held'`,
        [escrowRow.id, clientCommission]
      );
      return res.json({
        success: true,
        mock: true,
        escrow_id: escrowRow.id,
        amount,
        client_commission: clientCommission,
        total_charge: totalChargeRon,
        message: 'STRIPE_SECRET_KEY lipsește — escrow marcat ca held în dev mode.'
      });
    }

    const { default: stripe } = await import('../config/stripe.js');
    const amountCents = Math.round(totalChargeRon * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'ron',
      automatic_payment_methods: { enabled: true },
      metadata: {
        escrow_id: escrowRow.id,
        project_id,
        user_id: userId,
        milestone_amount: String(amount),
        client_commission: String(clientCommission),
        ...(milestone_id ? { milestone_id } : {}),
      },
      description: `ESCRO deposit · ${proj.title}`,
    });

    await pool.query(
      `UPDATE escrow_accounts SET stripe_payment_intent_id = $1 WHERE id = $2`,
      [paymentIntent.id, escrowRow.id]
    ).catch(() => {});

    res.json({
      success: true,
      escrow_id: escrowRow.id,
      client_secret: paymentIntent.client_secret,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      amount,
      client_commission: clientCommission,
      total_charge: totalChargeRon,
      project_title: proj.title,
    });
  } catch (error) {
    console.error('[startCheckoutSession]', error);
    next(error);
  }
};

export const topupEscrow = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { amount_ron, milestone_id } = req.body;
    const userId = req.user.id;

    const amount = parseFloat(amount_ron) || 0;
    if (amount <= 0) return res.status(400).json({ message: 'Suma trebuie să fie pozitivă.' });

    const proj = await pool.query(
      'SELECT client_id, expert_id, company_id, title FROM projects WHERE id = $1',
      [project_id]
    );
    if (!proj.rows.length) return res.status(404).json({ message: 'Proiect negăsit.' });
    const p = proj.rows[0];

    const isParty = [p.client_id, p.expert_id, p.company_id].filter(Boolean).map(String).includes(String(userId));
    if (!isParty && req.user.role !== 'admin') return res.status(403).json({ message: 'Acces interzis.' });

    const escrow = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1', [project_id]);
    if (!escrow.rows.length) return res.status(404).json({ message: 'Contul escrow nu există. Activează mai întâi escrow-ul.' });

    const updated = await pool.query(
      `UPDATE escrow_accounts
         SET held_balance_ron = held_balance_ron + $1,
             total_amount_ron  = total_amount_ron  + $1,
             updated_at = NOW()
       WHERE project_id = $2
       RETURNING *`,
      [amount, project_id]
    );

    const prestatorId = p.expert_id || p.company_id;
    if (prestatorId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'escrow_funded', 'Fonduri depuse — poți continua lucrul', $2, $3, NOW())`,
        [prestatorId,
          `Beneficiarul a depus ${amount.toLocaleString('ro-RO')} RON în escrow pentru proiectul „${p.title}". Poți continua cu milestone-ul următor.`,
          `/project/${project_id}`]
      ).catch(() => {});
    }

    res.json({ success: true, escrow: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getEscrowStatus = async (req, res, next) => {
  try {
    const { escrow_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const result = await pool.query(
      `SELECT ea.*, p.client_id, p.expert_id, p.company_id
       FROM escrow_accounts ea JOIN projects p ON ea.project_id = p.id
       WHERE ea.id = $1`,
      [escrow_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Escrow account not found' });
    }

    const row = result.rows[0];
    const isParty = [row.client_id, row.expert_id, row.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Strip party id columns from response
    const { client_id, expert_id, company_id, ...escrow } = row;
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

/**
 * Refund the remaining held escrow balance to the client.
 * Allowed when: project is canceled/rejected/disputed-resolved with leftover funds, OR admin override.
 * Records a wallet_transaction (type='refund') for the client.
 */
export const refundEscrow = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    await client.query('BEGIN');

    const projRes = await client.query(
      `SELECT id, status, client_id, expert_id, company_id, title
       FROM projects WHERE id = $1 FOR UPDATE`,
      [project_id]
    );
    if (projRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }
    const proj = projRes.rows[0];

    // Permission: admin OR the beneficiar (client_id) can refund
    if (!isAdmin && String(proj.client_id) !== String(userId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only client/admin can refund' });
    }

    // Status check: only certain end-states are refundable for non-admins.
    // 'completed' excluded — at that point milestones were paid, nothing to refund (admin override available).
    const REFUNDABLE_NON_ADMIN = ['rejected', 'cancelled', 'disputed'];
    if (!REFUNDABLE_NON_ADMIN.includes(proj.status) && !isAdmin) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Refund not allowed for status '${proj.status}'. Only after project is cancelled/rejected/disputed.`
      });
    }

    const escrowRes = await client.query(
      `SELECT id, held_balance_ron, stripe_payment_intent_id
       FROM escrow_accounts WHERE project_id = $1 FOR UPDATE`,
      [project_id]
    );
    if (escrowRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No escrow account for this project' });
    }
    const escrow = escrowRes.rows[0];
    // Sanity check: held_balance_ron is already net of any released milestones (decremented on
    // milestone approve). So refunding held_balance refunds ONLY what hasn't been paid to prestator.
    // Cross-validate against released_to_expert_total + claudiu_earned to detect inconsistency.
    const sanityRes = await client.query(
      `SELECT total_amount_ron,
              COALESCE(released_to_expert_total_ron, 0) AS released,
              COALESCE(claudiu_earned_total_ron, 0) AS commission
       FROM escrow_accounts WHERE id = $1`,
      [escrow.id]
    );
    const s = sanityRes.rows[0] || {};
    const total = parseFloat(s.total_amount_ron) || 0;
    const released = parseFloat(s.released) || 0;
    const commission = parseFloat(s.commission) || 0;
    const heldVerify = parseFloat(escrow.held_balance_ron) || 0;
    const expected = Math.round((total - released - commission) * 100) / 100;
    if (Math.abs(heldVerify - expected) > 0.5) {
      console.error('[refundEscrow] balance inconsistency detected', {
        escrow_id: escrow.id, held: heldVerify, expected, total, released, commission,
      });
    }
    const refundAmount = heldVerify;
    if (refundAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No held balance to refund' });
    }

    // Call Stripe refund BEFORE DB updates so a Stripe failure can rollback cleanly.
    // Legacy escrows (no PI) and stub mode fall back to virtual-only refund.
    let stripeRefundId = null;
    if (escrow.stripe_payment_intent_id && !STRIPE_STUB_MODE) {
      try {
        const { default: stripe } = await import('../config/stripe.js');
        const refundCents = Math.round(refundAmount * 100);
        const stripeRefund = await stripe.refunds.create({
          payment_intent: escrow.stripe_payment_intent_id,
          amount: refundCents,
          reason: 'requested_by_customer',
          metadata: { project_id: String(project_id), escrow_id: String(escrow.id) },
        }, { idempotencyKey: `refund_escrow_${escrow.id}` });
        stripeRefundId = stripeRefund.id;
      } catch (stripeErr) {
        await client.query('ROLLBACK');
        console.error('[refundEscrow stripe]', stripeErr.message, stripeErr.code);
        return res.status(502).json({
          error: 'Refund Stripe a eșuat. Fondurile nu au fost mișcate. Încearcă din nou sau contactează adminul.',
          details: stripeErr.message,
        });
      }
    }

    // Zero out held balance + mark escrow released
    await client.query(
      `UPDATE escrow_accounts
       SET held_balance_ron = 0,
           status = 'refunded',
           stripe_refund_id = COALESCE($2, stripe_refund_id)
       WHERE id = $1`,
      [escrow.id, stripeRefundId]
    );

    // Record refund as wallet_transaction for the client
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id)
       VALUES ($1, $2, 'refund', $3, $4)`,
      [
        proj.client_id,
        refundAmount,
        `Refund pentru "${proj.title}"${stripeRefundId ? ` (Stripe: ${stripeRefundId})` : ' (virtual — fără PI Stripe)'}`,
        project_id
      ]
    );

    // Notify
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'refund', 'Refund procesat', $2, $3, NOW())`,
      [proj.client_id, `Suma de ${refundAmount} RON a fost returnată din escrow pentru "${proj.title}".`, `/project/${project_id}`]
    );

    await client.query('COMMIT');

    // Audit: admin-initiated refunds must be traceable
    if (isAdmin) {
      try {
        await logAdminAction(req, 'escrow_refund', 'project', project_id, {
          refund_amount: refundAmount,
          project_title: proj.title,
          client_id: proj.client_id,
          project_status: proj.status,
          stripe_refund_id: stripeRefundId,
        });
      } catch (e) {
        console.warn('[refundEscrow audit]', e.message);
      }
    }

    res.json({
      success: true,
      refunded_amount: refundAmount,
      stripe_refund_id: stripeRefundId,
      message: stripeRefundId
        ? 'Refund procesat — fondurile se întorc pe cardul folosit la plată în 5-10 zile lucrătoare.'
        : 'Refund procesat virtual (escrow fără PI Stripe).'
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.warn('[refund rollback]', e.message));
    next(error);
  } finally {
    client.release();
  }
};

export const getEscrowByProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify user is party to the project
    const partyRes = await pool.query(
      `SELECT client_id, expert_id, company_id FROM projects WHERE id = $1`,
      [project_id]
    );
    if (partyRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const p = partyRes.rows[0];
    const isParty = [p.client_id, p.expert_id, p.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE project_id = $1 LIMIT 1',
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, escrow: null });
    }

    res.json({
      success: true,
      escrow: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
