import pool from '../config/database.js';

export const getWalletBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Total earned from milestone releases (projects where user is expert or company).
    // Exclude releases where Stripe transfer is still pending or failed — those funds
    // are NOT actually with the user and shouldn't be available for payout.
    const earnedResult = await pool.query(
      `SELECT COALESCE(SUM(mr.expert_amount_ron), 0) AS total_earned
       FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       WHERE (p.expert_id = $1 OR p.company_id = $1)
         AND COALESCE(mr.stripe_payout_status, 'pending') NOT IN ('failed')`,
      [userId]
    );

    // Funds still pending Stripe transfer (visible as "în procesare" — not available yet)
    const pendingTransferResult = await pool.query(
      `SELECT COALESCE(SUM(mr.expert_amount_ron), 0) AS pending_transfer
       FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       WHERE (p.expert_id = $1 OR p.company_id = $1)
         AND COALESCE(mr.stripe_payout_status, 'pending') = 'pending'
         AND mr.stripe_transfer_id IS NULL`,
      [userId]
    );

    // Failed transfers (admin needs to intervene)
    const failedTransferResult = await pool.query(
      `SELECT COALESCE(SUM(mr.expert_amount_ron), 0) AS failed_transfer
       FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       WHERE (p.expert_id = $1 OR p.company_id = $1)
         AND mr.stripe_payout_status = 'failed'`,
      [userId]
    );

    // Paid out (completed payouts)
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(amount_ron), 0) AS paid_out
       FROM payout_requests
       WHERE user_id = $1 AND status = 'paid'`,
      [userId]
    );

    // In flight payouts (pending + processing)
    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(amount_ron), 0) AS pending_payout
       FROM payout_requests
       WHERE user_id = $1 AND status IN ('pending', 'processing')`,
      [userId]
    );

    const total_earned = parseFloat(earnedResult.rows[0].total_earned);
    const paid_out = parseFloat(paidResult.rows[0].paid_out);
    const pending_payout = parseFloat(pendingResult.rows[0].pending_payout);
    const pending_transfer = parseFloat(pendingTransferResult.rows[0].pending_transfer);
    const failed_transfer = parseFloat(failedTransferResult.rows[0].failed_transfer);

    // Stripe connect status + extra wallet_balance (referral rewards etc.)
    const stripeResult = await pool.query(
      `SELECT stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_transfers_enabled,
              COALESCE(wallet_balance, 0) AS wallet_balance
       FROM users WHERE id = $1`,
      [userId]
    );
    const stripe = stripeResult.rows[0] || {};
    const referral_balance = parseFloat(stripe.wallet_balance || 0);
    const available = Math.max(0, total_earned + referral_balance - paid_out - pending_payout);

    res.json({
      success: true,
      balance: {
        total_earned: Math.round(total_earned * 100) / 100,
        referral_balance: Math.round(referral_balance * 100) / 100,
        paid_out: Math.round(paid_out * 100) / 100,
        pending_payout: Math.round(pending_payout * 100) / 100,
        pending_transfer: Math.round(pending_transfer * 100) / 100,
        failed_transfer: Math.round(failed_transfer * 100) / 100,
        available: Math.round(available * 100) / 100,
      },
      stripe: {
        account_id: stripe.stripe_account_id || null,
        onboarding_complete: stripe.stripe_onboarding_complete || false,
        charges_enabled: stripe.stripe_charges_enabled || false,
        transfers_enabled: stripe.stripe_transfers_enabled || false,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEarningsHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;

    let whereClause = '(p.expert_id = $1 OR p.company_id = $1)';
    const params = [userId];

    if (statusFilter && ['pending', 'processing', 'paid', 'failed'].includes(statusFilter)) {
      whereClause += ` AND mr.stripe_payout_status = $${params.length + 1}`;
      params.push(statusFilter);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       WHERE ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT
         mr.id,
         mr.milestone_id,
         p.id AS project_id,
         p.title AS project_title,
         m.title AS milestone_title,
         mr.release_amount_ron,
         mr.claudiu_commission_amount_ron,
         mr.expert_amount_ron,
         mr.released_at,
         mr.stripe_payout_status,
         mr.stripe_transfer_id
       FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       LEFT JOIN milestones m ON mr.milestone_id = m.id
       WHERE ${whereClause}
       ORDER BY mr.released_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      earnings: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const requestPayout = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const userId = req.user.id;
    const { amount_ron } = req.body;

    if (!amount_ron || isNaN(amount_ron) || parseFloat(amount_ron) <= 0) {
      return res.status(400).json({ error: 'Suma solicitată este invalidă.' });
    }
    if (parseFloat(amount_ron) < 50) {
      return res.status(400).json({ error: 'Suma minimă pentru retragere este 50 RON.' });
    }

    const amount = Math.round(parseFloat(amount_ron) * 100) / 100;

    await dbClient.query('BEGIN');

    // Lock user row to serialize concurrent payout requests
    await dbClient.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);

    // Calculate available balance INSIDE the transaction
    const earnedResult = await dbClient.query(
      `SELECT COALESCE(SUM(mr.expert_amount_ron), 0) AS total_earned
       FROM milestone_releases mr
       JOIN escrow_accounts ea ON mr.escrow_id = ea.id
       JOIN projects p ON ea.project_id = p.id
       WHERE p.expert_id = $1 OR p.company_id = $1`,
      [userId]
    );
    const paidResult = await dbClient.query(
      `SELECT COALESCE(SUM(amount_ron), 0) AS used
       FROM payout_requests
       WHERE user_id = $1 AND status IN ('paid', 'pending', 'processing')`,
      [userId]
    );
    const refBalRes = await dbClient.query(
      `SELECT COALESCE(wallet_balance, 0) AS wallet_balance FROM users WHERE id = $1`,
      [userId]
    );

    const total_earned = parseFloat(earnedResult.rows[0].total_earned);
    const referral_balance = parseFloat(refBalRes.rows[0]?.wallet_balance || 0);
    const used = parseFloat(paidResult.rows[0].used);
    const available = Math.max(0, total_earned + referral_balance - used);

    if (amount > available) {
      await dbClient.query('ROLLBACK');
      return res.status(400).json({ error: `Suma solicitată (${amount} RON) depășește balanța disponibilă (${available.toFixed(2)} RON).` });
    }

    const payoutResult = await dbClient.query(
      `INSERT INTO payout_requests (user_id, amount_ron, status, requested_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [userId, amount]
    );

    await dbClient.query('COMMIT');

    // Find admin user to notify
    const adminResult = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (adminResult.rows.length > 0) {
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows[0]?.name || 'Un utilizator';
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'payout_requested', 'Cerere retragere nouă', $2, '/admin/financiar', NOW())`,
        [adminResult.rows[0].id, `${userName} a solicitat o retragere de ${amount} RON.`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    // Notify the user
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'payout_requested', 'Cerere retragere înregistrată', $2, '/wallet/payouts', NOW())`,
      [userId, `Cererea de retragere de ${amount} RON a fost înregistrată și va fi procesată în curând.`]
    ).catch(e => console.warn('[bg]', e.message));

    res.status(201).json({
      success: true,
      payout_request: payoutResult.rows[0],
      message: 'Cererea de retragere a fost înregistrată cu succes.'
    });
  } catch (error) {
    await dbClient.query('ROLLBACK').catch(e => console.warn('[payout rollback]', e.message));
    next(error);
  } finally {
    dbClient.release();
  }
};

export const getPayoutHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM payout_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );

    res.json({ success: true, payouts: result.rows });
  } catch (error) {
    next(error);
  }
};

export const cancelPayoutRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE payout_requests SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cererea nu a fost găsită sau nu mai poate fi anulată.' });
    }

    res.json({ success: true, message: 'Cererea de retragere a fost anulată.' });
  } catch (error) {
    next(error);
  }
};
