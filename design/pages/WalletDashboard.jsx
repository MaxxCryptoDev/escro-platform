import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner } from '../components/ui';
import { fmtRON, fmtDate } from '../utils/format';
import axios from 'axios';

const STATUS_BADGE = {
  pending:    { label: 'În așteptare', color: 'var(--warning)',  bg: 'var(--warning-bg)' },
  processing: { label: 'În procesare', color: 'var(--accent)',   bg: 'var(--accent-bg)' },
  paid:       { label: 'Plătit',       color: 'var(--success)',  bg: 'var(--success-bg)' },
  failed:     { label: 'Eșuat',        color: 'var(--danger)',   bg: 'var(--danger-bg)' },
  cancelled:  { label: 'Anulat',       color: 'var(--fg-3)',     bg: 'var(--border-1)' },
};

function StatusBadgeInline({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function WalletDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [balance, setBalance] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingMsg, setOnboardingMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [balRes, earnRes, payRes, tpRes] = await Promise.all([
        axios.get('/api/wallet/balance', { headers }),
        axios.get('/api/wallet/earnings?limit=5', { headers }),
        axios.get('/api/wallet/payouts', { headers }),
        axios.get('/api/trust-profiles/my-trust-profile', { headers }).catch(() => ({ data: null })),
      ]);
      setBalance(balRes.data.balance);
      setStripe(balRes.data.stripe);
      setEarnings(earnRes.data.earnings || []);
      setPayouts((payRes.data.payouts || []).slice(0, 5));
      setTrustProfile(tpRes.data?.trust_profile || tpRes.data || null);
    } catch (e) {
      console.error('Wallet fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOnboarding = async () => {
    setOnboardingLoading(true);
    setOnboardingMsg('');
    try {
      const res = await axios.post('/api/stripe/onboarding', {}, { headers });
      if (res.data.onboarding_url) {
        if (res.data.mock) {
          setOnboardingMsg(res.data.message || 'Stripe nu este configurat (mock).');
          setOnboardingLoading(false);
          return;
        }
        // Real Stripe onboarding — redirect the user to Stripe-hosted KYC + bank flow
        window.location.assign(res.data.onboarding_url);
        return;
      }
      setOnboardingMsg(res.data.message || 'Înregistrat.');
      fetchData();
    } catch (e) {
      setOnboardingMsg(e.response?.data?.error || 'A apărut o eroare. Încearcă din nou.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Detect return from Stripe hosted onboarding and refresh status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeSetup = params.get('stripe_setup');
    if (stripeSetup === 'done') {
      fetchData();
      setOnboardingMsg('Bine ai revenit! Statusul contului Stripe se actualizează…');
      // Clean the URL so a manual refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeSetup === 'refresh') {
      setOnboardingMsg('Link-ul de onboarding a expirat. Reia procesul.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchData]);

  const handleRequestPayout = async () => {
    setPayoutError('');
    const amt = parseFloat(payoutAmount);
    if (!amt || amt <= 0) { setPayoutError('Introdu o sumă validă.'); return; }
    if (amt < 50) { setPayoutError('Suma minimă pentru retragere este 50 RON.'); return; }
    if (balance && amt > balance.available) { setPayoutError(`Suma depășește balanța disponibilă (${fmtRON(balance.available)}).`); return; }
    setPayoutSubmitting(true);
    try {
      await axios.post('/api/wallet/payout', { amount_ron: amt }, { headers });
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchData();
    } catch (e) {
      setPayoutError(e.response?.data?.error || 'Eroare la trimiterea cererii.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  if (loading) return <div className="escro-page"><Spinner /></div>;

  const available = balance?.available ?? 0;
  const pending_payout = balance?.pending_payout ?? 0;
  const total_earned = balance?.total_earned ?? 0;
  const isOnboarded = stripe?.onboarding_complete;
  const hasPendingStripe = stripe?.account_id === 'pending_stripe_integration';
  const hasVerificationCall = !!trustProfile?.has_verification_call;

  return (
    <div className="escro-page fade-up">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', margin: 0 }}>Portofel</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '4px 0 0' }}>Câștiguri, retrageri și statusul contului bancar</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPayoutModal(true)} disabled={available <= 0}>
            <Icon name="arrow-up-circle" size={14} /> Solicită retragere
          </button>
        </div>

        {/* Balance cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Disponibil', value: available, color: 'var(--success)', desc: 'Poate fi retras' },
            { label: 'În procesare', value: pending_payout, color: 'var(--warning)', desc: 'Cereri active' },
            { label: 'Total câștigat', value: total_earned, color: 'var(--accent)', desc: 'Din toate proiectele' },
          ].map(({ label, value, color, desc }) => (
            <div key={label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '20px 22px' }}>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: 'var(--f-mono)', marginBottom: 4 }}>{fmtRON(value)}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Stripe Connect status — three states: needs verification call → can connect → connected */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '18px 22px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="credit-card" size={18} style={{ color: isOnboarded ? 'var(--success)' : (!hasVerificationCall ? 'var(--fg-3)' : 'var(--warning)') }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>Cont bancar</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                  {isOnboarded
                    ? 'Cont Stripe conectat și verificat'
                    : !hasVerificationCall
                      ? 'Așteaptă apelul de verificare cu administratorul'
                      : hasPendingStripe
                        ? 'Conectare în așteptare — Stripe în curs de integrare'
                        : 'Niciun cont bancar conectat'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isOnboarded
                ? <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--success-bg)', color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>Conectat</span>
                : !hasVerificationCall
                  ? <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-2)', color: 'var(--fg-3)', fontSize: 12, fontWeight: 600 }}>Blocat până la verificare</span>
                  : <button className="btn btn-secondary btn-sm" onClick={handleOnboarding} disabled={onboardingLoading || hasPendingStripe}>
                      {onboardingLoading ? <Spinner size={12} inline /> : <Icon name="link" size={12} />}
                      {hasPendingStripe ? 'În așteptare' : 'Conectează cont bancar'}
                    </button>
              }
            </div>
          </div>
          {onboardingMsg && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--fg-2)', background: 'var(--bg-2)', borderRadius: 6, padding: '8px 12px' }}>{onboardingMsg}</div>}
          {!isOnboarded && hasVerificationCall && <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={11} /> Retragerile sunt procesate manual până la integrarea completă Stripe Connect.
          </div>}
          {!hasVerificationCall && <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={11} /> Adminul programează un apel scurt de verificare. După aprobare, butonul „Conectează cont bancar" devine activ.
          </div>}
        </div>

        {/* Recent earnings */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Câștiguri recente</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/wallet/earnings')}>Vezi toate →</button>
          </div>
          {earnings.length === 0
            ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>Nicio câștig înregistrat încă.</div>
            : <table className="tbl tbl-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                    {['Proiect', 'Milestone', 'Net RON', 'Data', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {earnings.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                      <td data-primary style={{ padding: '10px 20px', color: 'var(--fg-1)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.project_title}</td>
                      <td data-label="Milestone" style={{ padding: '10px 20px', color: 'var(--fg-2)' }}>{e.milestone_title || '—'}</td>
                      <td data-label="Net RON" style={{ padding: '10px 20px', color: 'var(--success)', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>{fmtRON(e.expert_amount_ron)}</td>
                      <td data-label="Data" style={{ padding: '10px 20px', color: 'var(--fg-3)' }}>{fmtDate(e.released_at)}</td>
                      <td data-label="Status" style={{ padding: '10px 20px' }}><StatusBadgeInline status={e.stripe_payout_status} /></td>
                      <td data-actions style={{ padding: '10px 20px' }}>
                        {e.milestone_id && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Descarcă factură"
                            onClick={async () => {
                              const token = localStorage.getItem('token');
                              try {
                                const r = await axios.get(`/api/milestones/${e.milestone_id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
                                if (r.data.invoice_url) window.open(r.data.invoice_url, '_blank');
                              } catch { alert('Factura nu a putut fi generată.'); }
                            }}
                          >
                            <Icon name="download" size={12} /> Factură
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>

        {/* Recent payouts */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Retrageri recente</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/wallet/payouts')}>Istoric complet →</button>
          </div>
          {payouts.length === 0
            ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>Nicio cerere de retragere.</div>
            : <table className="tbl tbl-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                    {['Sumă', 'Status', 'Solicitat', 'Procesat'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                      <td data-primary style={{ padding: '10px 20px', fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--fg-0)' }}>{fmtRON(p.amount_ron)}</td>
                      <td data-label="Status" style={{ padding: '10px 20px' }}><StatusBadgeInline status={p.status} /></td>
                      <td data-label="Solicitat" style={{ padding: '10px 20px', color: 'var(--fg-3)' }}>{fmtDate(p.requested_at)}</td>
                      <td data-label="Procesat" style={{ padding: '10px 20px', color: 'var(--fg-3)' }}>{p.processed_at ? fmtDate(p.processed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-md" style={{ background: 'var(--bg-0)', borderRadius: 12, padding: 28, maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--fg-0)' }}>Solicită retragere</h3>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 16 }}>
              Disponibil: <strong style={{ color: 'var(--success)' }}>{fmtRON(available)}</strong>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>· minim 50 RON</span>
            </div>
            <label style={{ fontSize: 12, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>Sumă (RON)</label>
            <input
              type="number" min="50" step="0.01" max={available}
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              placeholder="ex: 500.00"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-0)', fontSize: 14, boxSizing: 'border-box' }}
            />
            {payoutError && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{payoutError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowPayoutModal(false); setPayoutError(''); setPayoutAmount(''); }}>Anulează</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestPayout} disabled={payoutSubmitting}>
                {payoutSubmitting ? <Spinner size={12} inline /> : 'Solicită'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
