import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import axios from 'axios';

export default function Referral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [trustLevel, setTrustLevel] = useState(1);
  const [trustScore, setTrustScore] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);
  const [rewardsScore, setRewardsScore] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const storedCode = localStorage.getItem('referralCode');
      if (storedCode) {
        setReferralCode(storedCode);
      }
      
      const token = localStorage.getItem('token');
      
      // Fetch referral code
      try {
        const response = await axios.get('/api/referrals/my-referral-info', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.code) {
          setReferralCode(response.data.code);
          localStorage.setItem('referralCode', response.data.code);
        }
      } catch (err) {
        console.error('Error fetching referral code:', err);
      }
      
      // Fetch trust profile
      try {
        let trustResponse;
        try {
          trustResponse = await axios.get('/api/trust-profiles/my-trust-profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) {
          // Try recalculating first
          console.log('[DEBUG] Trying recalculation...', e.message);
          trustResponse = await axios.get('/api/trust-profiles/recalculate', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        
        console.log('[DEBUG] Trust profile full response:', trustResponse.data);
        
        const data = trustResponse.data;
        
        // Log all keys to debug
        console.log('[DEBUG] All data keys:', Object.keys(data));
        
        // Handle both direct fields and nested structure
        console.log('[DEBUG] Full data object:', JSON.stringify(data));
        
        // Try various possible field names
        const level = data.trust_level ?? data.trustLevel ?? 1;
        const trust = data.trust_score ?? data.trustScore ?? 0;
        
        // Check for identity/verification points - try multiple possible names
        let identity = 0;
        if (data.type2_points !== undefined && data.type2_points !== null) identity = data.type2_points;
        else if (data.verification_score !== undefined && data.verification_score !== null) identity = data.verification_score;
        else if (data.verificationScore !== undefined && data.verificationScore !== null) identity = data.verificationScore;
        
        // Check for rewards points - try multiple possible names  
        let rewards = 0;
        if (data.type1_points !== undefined && data.type1_points !== null) rewards = data.type1_points;
        else if (data.reward_points !== undefined && data.reward_points !== null) rewards = data.reward_points;
        else if (data.rewards_points !== undefined && data.rewards_points !== null) rewards = data.rewards_points;
        
        console.log('[DEBUG] Final parsed - level:', level, 'trust:', trust, 'identity:', identity, 'rewards:', rewards);
        
        setTrustLevel(level);
        setTrustScore(Math.round(trust));
        setVerificationScore(Math.round(identity));
        setRewardsScore(Math.round(rewards));
      } catch (err) {
        console.error('Error fetching trust profile:', err);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const referralLink = referralCode ? `http://localhost:3000/register?ref=${referralCode}` : 'http://localhost:3000/register';

  const getFriendLevel = (myLevel) => {
    if (myLevel >= 4) return myLevel - 1;
    return Math.max(1, myLevel);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    container: {
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2.5rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      textAlign: 'center',
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem',
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#64748b',
      marginBottom: '2rem',
    },
    giftBox: {
      fontSize: '4rem',
      marginBottom: '1rem',
    },
    section: {
      marginBottom: '2rem',
    },
    label: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem',
      display: 'block',
    },
    codeBox: {
      backgroundColor: '#f3f4f6',
      border: '2px dashed #3b82f6',
      borderRadius: '12px',
      padding: '1rem',
      fontSize: '2rem',
      fontWeight: '700',
      color: '#3b82f6',
      letterSpacing: '2px',
      marginBottom: '1rem',
    },
    linkBox: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '0.75rem',
      fontSize: '0.9rem',
      color: '#6b7280',
      wordBreak: 'break-all',
      marginBottom: '1rem',
    },
    button: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    buttonSecondary: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    infoBox: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'left',
      marginTop: '2rem',
    },
    infoTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#1e40af',
      marginBottom: '0.75rem',
    },
    infoText: {
      fontSize: '0.95rem',
      color: '#1e3a8a',
      lineHeight: '1.6',
      marginBottom: '0.5rem',
    },
    successMessage: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '0.75rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontWeight: '500',
    },
  };

  return (
    <div style={styles.pageContainer}>
      <Header currentPage="referral" />
      
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.giftBox}>🎁</div>
          <h1 style={styles.title}>Invită Prieteni și Câștigă!</h1>
          <p style={styles.subtitle}>
            Recomandă platforma ESCRO prietenilor tăi și primești <b>+10 puncte Recompensă</b> pentru fiecare prieten!
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '12px', minWidth: '80px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>Nivel {trustLevel}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Nivel</div>
            </div>
            <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '12px', minWidth: '80px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{Math.round(trustScore)}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Încredere</div>
            </div>
            <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '12px', minWidth: '80px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>{Math.round(verificationScore)}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Identitate</div>
            </div>
            <div style={{ backgroundColor: '#fce7f3', padding: '1rem', borderRadius: '12px', minWidth: '80px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#db2777' }}>{Math.round(rewardsScore)}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recompensă</div>
            </div>
          </div>

          {loading ? (
            <p style={styles.subtitle}>Se încarcă...</p>
          ) : (
            <>
              {copied && (
                <div style={styles.successMessage}>
                  ✓ Copiat în clipboard!
                </div>
              )}

              <div style={styles.section}>
                <label style={styles.label}>Link de înregistrare</label>
                <div style={styles.linkBox}>{referralLink}</div>
                <button 
                  onClick={handleCopyLink}
                  style={styles.buttonSecondary}
                >
                  📎 Copiază Link-ul
                </button>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoTitle}>🎁 Ce primește prietenul tău?</div>
                <div style={styles.infoText}>
                  ✓ Prietenul va primi <b>Nivel {getFriendLevel(trustLevel)}</b> garantat la înregistrare!
                </div>
                <div style={styles.infoText}>
                  ✓ Primește <b>+10 puncte Identitate</b> (din totalul de 100)
                </div>
                
                <div style={{ ...styles.infoTitle, marginTop: '1rem' }}>🎁 Ce primești tu?</div>
                <div style={styles.infoText}>
                  ✓ Când prietenul se înregistrează cu codul tău: <b>+10 puncte Recompensă</b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
