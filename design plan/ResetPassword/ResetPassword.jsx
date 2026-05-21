import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Icon } from '../components/ui';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-panel-r" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--fg-0)', marginBottom: '.5rem' }}>Link invalid</h2>
            <p style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: '1.5rem' }}>
              Acest link de resetare parolă este invalid sau a expirat.
            </p>
            <Link to="/forgot-password" className="btn btn-primary">Solicită un link nou</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Parolele nu se potrivesc.');
    if (password.length < 6) return setError('Parola trebuie să aibă cel puțin 6 caractere.');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Token invalid sau expirat. Solicită un link nou.');
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
          <div className="page-eyebrow">Securitate cont</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--fg-0)', marginBottom: '1rem' }}>
            Parolă nouă.<br />
            <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>Cont securizat.</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)' }}>
            Alege o parolă puternică cu cel puțin 6 caractere.
          </p>
        </div>
      </div>

      <div className="auth-panel-r">
        <form style={{ width: '100%', maxWidth: 380 }} onSubmit={handleSubmit}>
          <div className="page-eyebrow">Resetare parolă</div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: '-0.02em', color: 'var(--fg-0)', marginBottom: '2rem' }}>
            Setează parola nouă
          </h2>

          {error && (
            <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {done ? (
            <div style={{ padding: '1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: '.5rem' }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 15, marginBottom: '.5rem' }}>Parolă resetată!</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: '1rem' }}>
                Parola ta a fost schimbată cu succes. Te poți conecta acum.
              </div>
              <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                Conectează-te
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div>
                <label className="label">Parolă nouă</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Minim 6 caractere"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirmă parola</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repetă parola"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '.5rem' }} disabled={loading}>
                {loading ? 'Se salvează...' : 'Salvează parola nouă'}
                {!loading && <Icon name="arrow-right" size={14} />}
              </button>

              <Link to="/login" style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>
                Înapoi la conectare
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
