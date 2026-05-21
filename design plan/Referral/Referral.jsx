import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Icon, Spinner } from '../components/ui';

export default function Referral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [trustLevel, setTrustLevel] = useState(1);
  const [trustScore, setTrustScore] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);
  const [rewardsScore, setRewardsScore] = useState(0);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const refRes = await axios.get('/api/referrals/my-referral-info', { headers });
        if (refRes.data.code) {
          setReferralCode(refRes.data.code);
          localStorage.setItem('referralCode', refRes.data.code);
        }
      } catch { /* silent */ }

      try {
        const res = await axios.get('/api/trust-profiles/my-trust-profile', { headers });
        const d = res.data;
        setTrustLevel(d.trust_level ?? 1);
        setTrustScore(Math.round(d.trust_score ?? 0));
        setVerificationScore(Math.round(d.type2_points ?? d.verification_score ?? 0));
        setRewardsScore(Math.round(d.type1_points ?? d.reward_points ?? 0));
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [user]);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : `${window.location.origin}/register`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const friendLevel = trustLevel >= 4 ? trustLevel - 1 : Math.max(1, trustLevel);

  const LEVELS = [
    { level: 1, label: 'Starter',  desc: '20 pts',  color: 'var(--fg-3)' },
    { level: 2, label: 'Emerging', desc: '40 pts',  color: 'var(--warning)' },
    { level: 3, label: 'Trusted',  desc: '60 pts',  color: 'var(--accent)' },
    { level: 4, label: 'Verified', desc: '80 pts',  color: 'var(--success)' },
    { level: 5, label: 'Elite',    desc: '100+ pts', color: 'var(--violet)' },
  ];

  if (loading) return <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Page header */}
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">Program Referral · Trust L{trustLevel}</div>
          <h1 className="h-title">Invită & <em>câștigă</em>.</h1>
          <p className="h-sub">Recomandă platforma și ajuți-ți rețeaua să acceadă la un Trust Level mai ridicat.</p>
        </div>
      </div>

      {/* Trust score vault */}
      <div className="vault" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', marginBottom: '.5rem' }}>Trust Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginBottom: '.875rem' }}>
          <span className="vault-num"><em>{trustScore}</em></span>
          <span className="vault-cur">pts</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: n <= trustLevel ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.12)',
              transition: 'background .3s',
            }} />
          ))}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', fontSize: 11.5, fontFamily: 'var(--f-mono)', color: 'rgba(255,255,255,0.45)' }}>
          <span>Identitate: {verificationScore} pts</span>
          <span>Recompense: {rewardsScore} pts</span>
        </div>
      </div>

      {/* Referral code card */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>Codul tău de referral</div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {referralCode ? (
            <>
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-2)', border: '1px dashed var(--accent-border)', borderRadius: 'var(--r-md)', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 34, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent-hi)' }}>{referralCode}</div>
              </div>
              <button className="btn btn-primary" onClick={() => copy(referralCode, 'code')} style={{ width: '100%', marginBottom: '1rem' }}>
                <Icon name={copied === 'code' ? 'check' : 'copy'} size={14} />
                {copied === 'code' ? 'Copiat!' : 'Copiază codul'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-3)', fontSize: 13, marginBottom: '1rem' }}>
              Codul tău de referral se generează automat.
            </div>
          )}

          <div>
            <label className="label">Link de invitație</label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <div style={{ flex: 1, padding: '.625rem .875rem', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', wordBreak: 'break-all', border: '1px solid var(--border-1)' }}>
                {referralLink}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => copy(referralLink, 'link')}>
                <Icon name={copied === 'link' ? 'check' : 'copy'} size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>Cum funcționează</div>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {[
            `Împărtășește codul tău unic cu contactele tale`,
            `Aceștia se înregistrează cu codul tău pe platformă`,
            `Ei primesc Trust Level ${friendLevel} ca punct de start`,
            `Tu câștigi puncte de recompensă pentru fiecare recomandare`,
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.875rem' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5, fontWeight: 700, color: '#fff', fontFamily: 'var(--f-mono)',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 13.5, color: 'var(--fg-1)', lineHeight: 1.6 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust levels */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>Niveluri Trust</div>
        </div>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {LEVELS.map(l => {
            const isCurrent = l.level === trustLevel;
            const isPassed = l.level < trustLevel;
            return (
              <div key={l.level} style={{
                display: 'flex', alignItems: 'center', gap: '.875rem', padding: '.75rem 1rem',
                borderRadius: 'var(--r-sm)',
                background: isCurrent ? 'var(--accent-bg)' : 'transparent',
                border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'transparent'}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: (isCurrent || isPassed) ? l.color : 'var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPassed
                    ? <Icon name="check" size={12} style={{ color: '#fff' }} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#fff' : 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{l.level}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: isCurrent ? 'var(--fg-0)' : 'var(--fg-2)' }}>{l.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{l.desc}</div>
                </div>
                <div className="trust-d">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`trust-pip ${n <= l.level ? 'on' : ''}`} />
                  ))}
                </div>
                {isCurrent && <span className="badge badge-green" style={{ fontSize: 10 }}>Nivelul tău</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
