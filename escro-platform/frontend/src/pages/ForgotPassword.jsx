import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Icon } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'A apărut o eroare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel-l">
        <div className="row" style={{ gap: '.625rem', position: 'relative', zIndex: 1 }}>
          <div className="escro-brand-mark">E</div>
          <div className="escro-brand-name" style={{ fontSize: 16 }}>ESCRO<span className="dot" /></div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div className="page-eyebrow">Recuperare cont</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--fg-0)', marginBottom: '1rem' }}>
            Ai uitat parola?<br />
            <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>Te ajutăm.</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)' }}>
            Introdu adresa de email și îți trimitem un link de resetare. Link-ul e valabil 1 oră.
          </p>
        </div>
      </div>

      <div className="auth-panel-r">
        <form style={{ width: '100%', maxWidth: 380 }} onSubmit={handleSubmit}>
          <div className="page-eyebrow">Resetare parolă</div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: '-0.02em', color: 'var(--fg-0)', marginBottom: '.5rem' }}>
            Trimite link de resetare
          </h2>
          <p className="muted" style={{ marginBottom: '2rem', fontSize: 13.5 }}>
            <Link to="/login" style={{ color: 'var(--accent-hi)', fontWeight: 600 }}>Înapoi la conectare</Link>
          </p>

          {error && (
            <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {sent ? (
            <div style={{ padding: '1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: '.5rem' }}>📧</div>
              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 15, marginBottom: '.5rem' }}>Email trimis!</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Dacă există un cont cu adresa <strong>{email}</strong>, vei primi un email cu instrucțiuni de resetare în câteva minute.
              </div>
              <Link to="/login" style={{ display: 'inline-block', marginTop: '1rem', fontSize: 13, color: 'var(--accent-hi)', fontWeight: 600 }}>
                Înapoi la conectare
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Adresa de email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="nume@firma.ro"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Se trimite...' : 'Trimite link de resetare'}
                {!loading && <Icon name="arrow-right" size={14} />}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
