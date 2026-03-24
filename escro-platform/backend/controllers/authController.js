import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { generateUserContractPDF, generateContractNumber } from '../utils/contractGenerator.js';
import trustProfileService from '../services/trustProfileService.js';
import referralService from '../services/referralService.js';

const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui, referral_code } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users 
       (email, password_hash, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) 
       RETURNING id, email, name, role, company, phone, expertise, bio, industry, experience, portfolio_description, cui`,
      [email, hashedPassword, name, role, company || null, phone || null, expertise || null, bio || null, industry || null, experience || null, portfolio_description || null, cui || null]
    );

    const user = result.rows[0];

    if (user.role === 'expert' || user.role === 'company') {
      try {
        await trustProfileService.getOrCreateTrustProfile(user.id);
        console.log('[DEBUG] Trust profile created for user:', user.id);
        
        // Create referral code for the user
        try {
          await referralService.getOrCreateReferralCode(user.id);
          console.log('[DEBUG] Referral code created for user:', user.id);
        } catch (refError) {
          console.error('[ERROR] Failed to create referral code:', refError.message);
        }
      } catch (tpError) {
        console.error('[ERROR] Failed to create trust profile:', tpError.message);
      }
    }

    if (referral_code && (user.role === 'expert' || user.role === 'company')) {
      try {
        // First ensure trust profile exists
        await trustProfileService.getOrCreateTrustProfile(user.id);
        
        // Check for VIP code with trust_level_bonus in referral_codes table
        const codeResult = await pool.query(
          'SELECT user_id, trust_level_bonus FROM referral_codes WHERE code = $1',
          [referral_code.toUpperCase()]
        );
        
        let trustLevelBonus = null;
        let referrerId = null;
        
        if (codeResult.rows.length > 0 && codeResult.rows[0].trust_level_bonus) {
          // VIP code - use the specified level
          trustLevelBonus = parseInt(codeResult.rows[0].trust_level_bonus);
          referrerId = codeResult.rows[0].user_id;
          console.log('[DEBUG] VIP code detected, level:', trustLevelBonus);
          
          // Save referral info
          await pool.query(
            `UPDATE trust_profiles SET referred_by = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
            [referrerId, user.id]
          );
        } else {
          // Normal referral code - get referrer's trust level and apply -1
          const referrerCodeResult = await pool.query(
            'SELECT user_id FROM referral_codes WHERE code = $1',
            [referral_code.toUpperCase()]
          );
          
          if (referrerCodeResult.rows.length > 0) {
            referrerId = referrerCodeResult.rows[0].user_id;
            
            // Get referrer's trust level
            const referrerProfile = await pool.query(
              'SELECT trust_level FROM trust_profiles WHERE user_id = $1',
              [referrerId]
            );
            
            const referrerLevel = referrerProfile.rows[0]?.trust_level || 1;
            // New user gets level = referrer level - 1 (minimum 1)
            trustLevelBonus = Math.max(1, referrerLevel - 1);
            console.log('[DEBUG] Normal referral, referrer level:', referrerLevel, '-> new user level:', trustLevelBonus);
            
            // Save referral info
            await pool.query(
              `UPDATE trust_profiles SET referred_by = $1, trust_level = $2, trust_score = $2 * 20, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3`,
              [referrerId, trustLevelBonus, user.id]
            );
          }
        }

        console.log('[DEBUG] Referral processed, trust level will be finalized after approval');
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
    if (user.role === 'expert' || user.role === 'company') {
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
        kyc_status: user.kyc_status,
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

    console.log('[DEBUG LOGIN] email:', email, 'found rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('[DEBUG LOGIN] user found:', result.rows[0].email, 'role:', result.rows[0].role);
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, user.role);

    let trustLevel = null;
    let referralCode = null;
    
    if (user.role === 'expert' || user.role === 'company') {
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
        console.log('[DEBUG] Error fetching trust/referral:', e.message);
      }
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        kyc_status: user.kyc_status,
        trust_level: trustLevel,
        referral_code: referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, company, kyc_status FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0]
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
