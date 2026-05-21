import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Icon } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(formData.email, formData.password);
      const { user, token } = res.data;
      login(user, token);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'expert') navigate('/expert/dashboard');
      else if (user.role === 'individual') navigate('/individual/dashboard');
      else navigate('/company/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Email sau parolă incorectă.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left — brand */}
      <div className="auth-panel-l">
        <div className="row" style={{ gap: '.625rem', position: 'relative', zIndex: 1 }}>
          <div className="escro-brand-mark">E</div>
          <div className="escro-brand-name" style={{ fontSize: 16 }}>ESCRO<span className="dot" /></div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div className="page-eyebrow">Infrastructură de încredere B2B</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--fg-0)', marginBottom: '1rem' }}>
            Colaborări fără risc.<br />
            <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>Plăți garantate.</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)', marginBottom: '2rem' }}>
            Banii sunt blocați în escrow până când milestone-urile sunt aprobate. Contracte cu valoare legală. Arbitraj în 48h.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { v: '850+', l: 'Experți verificați KYC' },
              { v: '12.4M', l: 'RON procesați în 2025' },
              { v: '48h', l: 'Arbitraj garantat' },
            ].map((s, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--accent-border)', paddingLeft: '0.875rem' }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>{s.v}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '.875rem' }}>
          <div className="avatar sm rose">ER</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-1)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "Am eliminat toate plățile în avans fără garanție. ESCRO ne-a salvat două proiecte."
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: '.25rem' }}>Elena Rădulescu, Product Lead</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-panel-r">
        <form style={{ width: '100%', maxWidth: 380 }} onSubmit={handleSubmit}>
          <div className="page-eyebrow">Conectare</div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: '-0.02em', color: 'var(--fg-0)', marginBottom: '.5rem' }}>
            Bun venit înapoi
          </h2>
          <p className="muted" style={{ marginBottom: '2rem', fontSize: 13.5 }}>
            Nu ai cont?{' '}
            <Link to="/register" style={{ color: 'var(--accent-hi)', fontWeight: 600 }}>Creează unul gratuit</Link>
          </p>

          {error && (
            <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="nume@firma.ro"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <div className="row-between" style={{ marginBottom: '.4rem' }}>
                <label className="label" style={{ margin: 0 }}>Parolă</label>
                <Link to="/forgot-password" style={{ fontSize: 11, color: 'var(--accent-hi)' }}>Ai uitat parola?</Link>
              </div>
              <input
                className="input"
                type="password"
                placeholder="••••••••••"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
            {loading ? 'Se conectează...' : 'Conectează-te'}
            {!loading && <Icon name="arrow-right" size={14} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '1.25rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            <span className="muted-2" style={{ fontSize: 11 }}>SAU</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
          </div>

          <p style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'center', marginTop: '1rem' }}>
            Continuând accepți{' '}
            <Link to="/terms" style={{ color: 'var(--fg-2)' }}>Termenii</Link>{' '}și{' '}
            <Link to="/terms" style={{ color: 'var(--fg-2)' }}>Politica de confidențialitate</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
