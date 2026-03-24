import pool from '../config/database.js';
import stripe from '../config/stripe.js';

export const createEscrowAccount = async (req, res, next) => {
  try {
    const { project_id, total_amount_ron } = req.body;

    // Get commission_percent from project
    const projectResult = await pool.query(
      'SELECT commission_percent, service_type FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const commission_percent = projectResult.rows[0].commission_percent || 10;

    // Create Stripe account for escrow
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'RO',
      email: req.user.email,
      capabilities: {
        transfers: { requested: true }
      }
    });

    const result = await pool.query(
      `INSERT INTO escrow_accounts (project_id, total_amount_ron, claudiu_commission_percent, status, held_balance_ron, released_to_expert_total_ron, claudiu_earned_total_ron, created_at)
       VALUES ($1, $2, $3, 'held', $2, 0, 0, NOW())
       RETURNING *`,
      [project_id, total_amount_ron, commission_percent]
    );

    res.status(201).json({
      success: true,
      escrow: result.rows[0],
      stripe_account: account.id,
      message: 'Escrow account created'
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

    // Convert RON to cents
    const amountCents = Math.round(amount_ron * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'ron',
      metadata: { escrow_id, user_id: req.user.id }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      message: 'Payment intent created'
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const { escrow_id, payment_intent_id } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    // Update escrow status
    await pool.query(
      `UPDATE escrow_accounts SET status = 'held', held_balance_ron = total_amount_ron
       WHERE id = $1`,
      [escrow_id]
    );

    // Update project status
    const escrowResult = await pool.query(
      'SELECT project_id FROM escrow_accounts WHERE id = $1',
      [escrow_id]
    );

    await pool.query(
      `UPDATE projects SET status = 'assigned' WHERE id = $1`,
      [escrowResult.rows[0].project_id]
    );

    res.json({
      success: true,
      message: 'Payment confirmed, funds held in escrow'
    });
  } catch (error) {
    next(error);
  }
};

export const getEscrowStatus = async (req, res, next) => {
  try {
    const { escrow_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE id = $1',
      [escrow_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Escrow account not found' });
    }

    res.json({
      success: true,
      escrow: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
