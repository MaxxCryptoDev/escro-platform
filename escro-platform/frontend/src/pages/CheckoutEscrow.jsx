import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Icon, Spinner } from '../components/ui';
import { fmtRON } from '../utils/format';

// One Stripe instance per page load; re-created if the publishable key changes (rare).
let stripePromise = null;
const getStripePromise = (key) => {
  if (!key) return null;
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
};

function PaymentForm({ amount, totalCharge, projectId, projectTitle }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/project/${projectId}?paid=1`,
      },
    });
    if (stripeErr) {
      setError(stripeErr.message || 'Plata a eșuat. Verifică datele cardului.');
      setSubmitting(false);
    }
    // On success, Stripe redirects to return_url; webhook marks escrow as held.
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: 'clamp(0.875rem, 3vw, 1.25rem)', marginBottom: '1rem' }}>
        <PaymentElement />
      </div>
      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '0.875rem' }}>
        Card de test Stripe: <span className="mono">4242 4242 4242 4242</span> · expiry oricare în viitor · CVC oricare
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
        disabled={!stripe || submitting}
      >
        <Icon name="lock" size={14} /> {submitting ? 'Se procesează…' : `Plătește ${fmtRON(totalCharge || amount)} RON`}
      </button>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: '0.75rem', textAlign: 'center' }}>
        Fondurile sunt blocate în escrow și eliberate automat la aprobarea fiecărui milestone.
      </div>
    </form>
  );
}

export default function CheckoutEscrow() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [project, setProject] = useState(null);
  const [amount, setAmount] = useState('');
  const [amountConfirmed, setAmountConfirmed] = useState(false);

  // Load project to know the budget and propose a default amount
  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`/api/projects/${projectId}`, { headers });
        const p = r.data.project;
        setProject(p);
        const defaultAmt = parseFloat(searchParams.get('amount')) || parseFloat(p.budget_ron) || 0;
        setAmount(String(defaultAmt));
      } catch (e) {
        setError(e.response?.data?.message || 'Proiectul nu a putut fi încărcat.');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const startCheckout = async () => {
    const amt = parseFloat(amount);
    if (!(amt > 0)) { setError('Suma trebuie să fie pozitivă.'); return; }
    setLoading(true);
    setError('');
    try {
      const milestoneId = searchParams.get('milestone_id') || undefined;
      const r = await axios.post('/api/escrow/checkout', { project_id: projectId, amount_ron: amt, milestone_id: milestoneId }, { headers });
      if (r.data.mock) {
        // Dev fallback — no Stripe key configured; escrow already marked held
        navigate(`/project/${projectId}?paid=mock`);
        return;
      }
      setSession(r.data);
      setAmountConfirmed(true);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Nu am putut iniția plata.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !session) {
    return <div className="escro-page" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>;
  }

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 560, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/project/${projectId}`)} style={{ marginBottom: '1rem' }}>
        <Icon name="arrow-left" size={12} /> Înapoi la proiect
      </button>

      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="page-eyebrow">Plată securizată · Stripe</div>
          <h1 className="page-title">Depune fonduri în escrow</h1>
          <p className="page-subtitle">{project?.title || 'Proiect'}</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!amountConfirmed && (() => {
        // When milestone_id is in URL, the milestone amount is fixed — the input is locked
        // and shows the TOTAL (milestone + 5%) since that's what the user actually pays.
        // Without milestone_id (free deposit), the input is editable and represents the milestone amount.
        const milestoneId = searchParams.get('milestone_id');
        const lockedToMilestone = !!milestoneId;
        const milestoneAmt = parseFloat(amount) || 0;
        const clientCommission = Math.round(milestoneAmt * 0.05 * 100) / 100;
        const totalCharge = milestoneAmt + clientCommission;
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <label className="label">
              {lockedToMilestone ? 'Total de plată cu comision (RON)' : 'Sumă milestone (RON)'}
            </label>
            <input
              type="number"
              className="input"
              min="1"
              step="0.01"
              value={lockedToMilestone ? totalCharge : amount}
              onChange={(e) => { if (!lockedToMilestone) setAmount(e.target.value); }}
              readOnly={lockedToMilestone}
              style={{
                fontSize: 18, padding: '0.875rem', marginBottom: '1rem',
                background: lockedToMilestone ? 'var(--bg-1)' : undefined,
                cursor: lockedToMilestone ? 'not-allowed' : 'text',
              }}
            />
            <div style={{
              padding: '0.875rem 1rem', marginBottom: '1rem',
              background: 'var(--bg-1)', border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--f-mono)', fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--fg-2)' }}>
                <span>Sumă în escrow (pentru prestator)</span>
                <span>{fmtRON(milestoneAmt)} RON</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--fg-2)' }}>
                <span>Comision platformă (5%)</span>
                <span>+{fmtRON(clientCommission)} RON</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0 2px',
                borderTop: '1px dashed var(--border-2)', marginTop: 4,
                color: 'var(--fg-0)', fontWeight: 700,
              }}>
                <span>Total de plată</span>
                <span>{fmtRON(totalCharge)} RON</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {lockedToMilestone
                ? 'Suma milestone-ului e fixă (a fost stabilită la creare proiect). Cei 5% sunt comisionul platformei, plătiți de tine peste suma milestone-ului.'
                : 'Depui suma per milestone, după ce contractul este semnat de ambele părți. Cei 5% sunt comisionul platformei, plătit de tine peste suma milestone-ului.'}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={startCheckout} disabled={loading}>
              {loading ? '…' : `Plătește ${fmtRON(totalCharge)} RON →`}
            </button>
          </div>
        );
      })()}

      {amountConfirmed && session?.client_secret && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <Elements
            stripe={getStripePromise(session.publishable_key)}
            options={{
              clientSecret: session.client_secret,
              appearance: { theme: 'night', variables: { colorPrimary: '#3b82f6' } },
            }}
          >
            <PaymentForm
              amount={parseFloat(amount)}
              totalCharge={session?.total_charge}
              projectId={projectId}
              projectTitle={project?.title}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
