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

function PaymentForm({ amount, projectId, projectTitle }) {
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
        <Icon name="lock" size={14} /> {submitting ? 'Se procesează…' : `Depune ${fmtRON(amount)} în escrow`}
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

      {!amountConfirmed && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <label className="label">Sumă de depus (RON)</label>
          <input
            type="number"
            className="input"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: 18, padding: '0.875rem', marginBottom: '1rem' }}
          />
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Suma propusă acoperă bugetul total al proiectului. Pentru proiecte PM cu mai multe milestone-uri, poți depune doar pentru milestone-ul curent.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={startCheckout} disabled={loading}>
            {loading ? '…' : 'Continuă la plată →'}
          </button>
        </div>
      )}

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
              projectId={projectId}
              projectTitle={project?.title}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
