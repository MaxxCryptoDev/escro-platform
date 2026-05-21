import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { generateUserContractPDF, generateContractNumber } from '../utils/contractGenerator.js';
import trustProfileService from '../services/trustProfileService.js';
import referralService from '../services/referralService.js';
import { sendEmail } from '../services/emailService.js';

const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui, referral_code } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (!['expert', 'company', 'individual'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid. Sunt acceptate doar: expert, company, individual.' });
    }

    // Business roles (expert PFA/SRL, company SRL) MUST supply CUI + company name.
    // 'individual' (persoană fizică) skips these — KYC will be done via Stripe individual flow.
    if (['expert', 'company'].includes(role)) {
      if (!cui || !String(cui).trim()) {
        return res.status(400).json({ message: 'CUI obligatoriu pentru ' + (role === 'expert' ? 'expert (PFA/SRL)' : 'companie (SRL).') });
      }
      if (!company || !String(company).trim()) {
        return res.status(400).json({ message: 'Denumirea firmei este obligatorie pentru acest tip de cont.' });
      }
    }

    // Password policy: min 8 chars + must contain letter + digit
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Parola trebuie să aibă minim 8 caractere.' });
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Parola trebuie să conțină atât litere cât și cifre.' });
    }

    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Get current T&C version — registration implies acceptance of current
    const termsRes = await pool.query(`SELECT version FROM terms_versions WHERE is_current = TRUE LIMIT 1`);
    const currentTermsVersion = termsRes.rows[0]?.version || null;

    const result = await pool.query(
      `INSERT INTO users
       (email, password_hash, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui,
        accepted_terms_version, accepted_terms_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING id, email, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui, kyc_status, verification_date, verification_call_acknowledged_at`,
      [email, hashedPassword, name, role, company || null, phone || null, expertise || null, bio || null, industry || null, experience || null, portfolio_description || null, cui || null, currentTermsVersion]
    );

    const user = result.rows[0];

    if (user.role !== 'admin') {
      try {
        await trustProfileService.getOrCreateTrustProfile(user.id);

        // Auto-award email validation points (10 type2 pts) on registration
        try {
          await trustProfileService.awardType2Points(user.id, 'email_validated');
        } catch (emailErr) {
          console.error('[ERROR] Failed to award email points:', emailErr.message);
        }

        // Create referral code for the user (so anyone — including individuals — can refer others).
        try {
          await referralService.getOrCreateReferralCode(user.id);
        } catch (refError) {
          console.error('[ERROR] Failed to create referral code:', refError.message);
        }
      } catch (tpError) {
        console.error('[ERROR] Failed to create trust profile:', tpError.message);
      }
    }

    if (referral_code && user.role !== 'admin') {
      try {
        const codeResult = await pool.query(
          `SELECT rc.id, rc.user_id, rc.trust_level_bonus, rc.usage_count, rc.max_uses, u.role AS referrer_role
           FROM referral_codes rc
           JOIN users u ON rc.user_id = u.id
           WHERE rc.code = $1 AND rc.is_active = TRUE AND rc.usage_count < rc.max_uses`,
          [referral_code.toUpperCase()]
        );

        if (codeResult.rows.length > 0) {
          const referrerId = codeResult.rows[0].user_id;
          const trustLevelBonus = codeResult.rows[0].trust_level_bonus;
          const codeId = codeResult.rows[0].id;
          const newUsageCount = codeResult.rows[0].usage_count + 1;
          const maxUses = codeResult.rows[0].max_uses;

          if (trustLevelBonus) {
            // VIP/level code — set fixed trust level on new user's profile
            const level = parseInt(trustLevelBonus);
            await pool.query(
              `UPDATE trust_profiles SET referred_by = $1, trust_level = $2, trust_score = $3, type2_points = type2_points + 20, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4`,
              [referrerId, level, level * 20, user.id]
            );
            console.log('[REFERRAL] Level code applied, level:', level);
          } else {
            // Normal referral — set level based on referrer's level
            await trustProfileService.applyReferralOnSignup(user.id, referrerId);
          }

          // Increment usage_count; deactivate only if max_uses reached
          const shouldDeactivate = newUsageCount >= maxUses;
          await pool.query(
            `UPDATE referral_codes SET usage_count = $1, is_active = $2 WHERE id = $3`,
            [newUsageCount, !shouldDeactivate, codeId]
          );

          // Record referral in referrals table
          await pool.query(
            `INSERT INTO referrals (referrer_id, referred_id, referral_code_id, status)
             VALUES ($1, $2, $3, 'registered')
             ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
            [referrerId, user.id, codeId]
          );

          console.log('[REFERRAL] Code used:', referral_code.toUpperCase(), `(${newUsageCount}/${maxUses})`, shouldDeactivate ? '[DEACTIVATED]' : '');
        } else {
          console.log('[REFERRAL] Code not found or exhausted:', referral_code.toUpperCase());
        }
      } catch (refError) {
        console.error('[ERROR] Failed to process referral:', refError.message);
      }
    }

    try {
      const pdfUrl = await generateUserContractPDF({
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        cui: user.cui,
        industry: user.industry,
        expertise: user.expertise,
        experience: user.experience,
        role: user.role
      });

      const contractNumber = generateContractNumber();
      
      await pool.query(
        `INSERT INTO user_contracts (user_id, contract_type, contract_pdf_url, signed_at, ip_address)
         VALUES ($1, 'terms_conditions', $2, NOW(), $3)`,
        [user.id, pdfUrl, req.ip || req.connection.remoteAddress]
      );

      console.log('[DEBUG] User contract generated:', pdfUrl);
    } catch (contractError) {
      console.error('[ERROR] Failed to generate user contract:', contractError.message);
    }

    let referralCode = null;
    if (user.role !== 'admin') {
      try {
        const referral = await pool.query(
          'SELECT code FROM referral_codes WHERE user_id = $1',
          [user.id]
        );
        if (referral.rows.length > 0) {
          referralCode = referral.rows[0].code;
        }
      } catch (e) {
        console.log('[DEBUG] Error fetching referral code:', e.message);
      }
    }

    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        company: user.company,
        cui: user.cui,
        expertise: user.expertise,
        industry: user.industry,
        experience: user.experience,
        bio: user.bio,
        portfolio_description: user.portfolio_description,
        kyc_status: user.kyc_status,
        verification_date: user.verification_date || null,
        verification_call_acknowledged_at: user.verification_call_acknowledged_at || null,
        referral_code: referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Block soft-deleted or suspended users from logging in
    if (user.deleted_at) {
      return res.status(403).json({ message: 'Contul a fost dezactivat.' });
    }
    if (user.kyc_status === 'suspended' || user.kyc_status === 'rejected') {
      return res.status(403).json({ message: 'Contul este suspendat. Contactează administratorul.' });
    }

    const token = generateToken(user.id, user.email, user.role);

    let trustLevel = null;
    let referralCode = null;
    
    if (user.role !== 'admin') {
      try {
        const profile = await pool.query(
          'SELECT trust_level, trust_score FROM trust_profiles WHERE user_id = $1',
          [user.id]
        );
        if (profile.rows.length > 0) {
          trustLevel = profile.rows[0].trust_level;
        }
        
        const referral = await pool.query(
          'SELECT code FROM referral_codes WHERE user_id = $1',
          [user.id]
        );
        if (referral.rows.length > 0) {
          referralCode = referral.rows[0].code;
        }
      } catch (e) {
        console.warn('[bg] Error fetching trust/referral:', e.message);
      }
    }

    // Check if user needs to accept new T&C
    let requiresTermsAcceptance = false;
    try {
      const termsRes = await pool.query(`SELECT version FROM terms_versions WHERE is_current = TRUE LIMIT 1`);
      const currentVersion = termsRes.rows[0]?.version;
      if (currentVersion && user.accepted_terms_version !== currentVersion) {
        requiresTermsAcceptance = true;
      }
    } catch { /* silent — non-critical */ }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        phone: user.phone,
        cui: user.cui,
        expertise: user.expertise,
        industry: user.industry,
        experience: user.experience,
        bio: user.bio,
        portfolio_description: user.portfolio_description,
        kyc_status: user.kyc_status,
        verification_date: user.verification_date,
        verification_call_acknowledged_at: user.verification_call_acknowledged_at,
        trust_level: trustLevel,
        referral_code: referralCode,
        requires_terms_acceptance: requiresTermsAcceptance,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, company, phone, cui, expertise, industry, experience, bio, portfolio_description, kyc_status, verification_date, verification_call_acknowledged_at, accepted_terms_version FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Check current T&C version
    let requiresTermsAcceptance = false;
    try {
      const termsRes = await pool.query(`SELECT version FROM terms_versions WHERE is_current = TRUE LIMIT 1`);
      const currentVersion = termsRes.rows[0]?.version;
      if (currentVersion && user.accepted_terms_version !== currentVersion) {
        requiresTermsAcceptance = true;
      }
    } catch { /* silent */ }

    res.json({
      success: true,
      user: { ...user, requires_terms_acceptance: requiresTermsAcceptance }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserContract = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_contracts WHERE user_id = $1 AND contract_type = $2 ORDER BY created_at DESC LIMIT 1',
      [req.user.id, 'terms_conditions']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    res.json({
      success: true,
      contract: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const r = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    // Always return success to avoid user enumeration
    if (!r.rows.length) return res.json({ success: true });

    const user = r.rows[0];
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any previous unused tokens for this user before issuing a new one
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      toName: user.name,
      template: 'passwordReset',
      data: { name: user.name, resetUrl },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password required' });
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Parola trebuie să aibă minim 8 caractere.' });
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Parola trebuie să conțină atât litere cât și cifre.' });
    }

    const r = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (!r.rows.length) return res.status(400).json({ message: 'Token invalid sau expirat' });

    const { id: tokenId, user_id } = r.rows[0];
    const hash = await bcrypt.hash(password, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);

    res.json({ success: true, message: 'Parola a fost resetată cu succes' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Parola curentă și cea nouă sunt obligatorii' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'Parola nouă trebuie să aibă minim 8 caractere.' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ message: 'Parola nouă trebuie să conțină atât litere cât și cifre.' });
    }

    const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!valid) return res.status(400).json({ message: 'Parola curentă este incorectă' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ success: true, message: 'Parola a fost schimbată cu succes' });
  } catch (error) {
    next(error);
  }
};
