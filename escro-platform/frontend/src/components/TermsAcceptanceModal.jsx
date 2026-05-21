import { useState, useEffect } from 'react';
import { termsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from './ui';

/**
 * Blocking modal shown when user must accept a new T&C version.
 * No close button — user either accepts or logs out.
 */
export default function TermsAcceptanceModal({ onAccepted }) {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    termsAPI.getCurrent()
      .then(r => { if (!cancelled) setTerms(r.data.terms); })
      .catch(() => { if (!cancelled) setError('Nu am putut încărca termenii.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await termsAPI.accept();
      onAccepted?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Acceptare eșuată. Încearcă din nou.');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Pentru a continua să folosești platforma trebuie să accepți termenii. Sigur vrei să te deconectezi?')) {
      logout();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: 640, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', padding: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: '.75rem',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="file-text" size={18} style={{ color: 'var(--accent-hi)' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-0)' }}>
              Termenii și Condițiile au fost actualizați
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
              Pentru a continua trebuie să accepți noua versiune.
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-3)' }}>Se încarcă termenii...</div>
          ) : !terms ? (
            <div style={{ color: 'var(--danger)' }}>Eroare la încărcarea termenilor.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '.5rem .875rem', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Versiune</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 700, color: 'var(--fg-0)' }}>{terms.version}</div>
                </div>
                <div style={{ padding: '.5rem .875rem', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Intrare în vigoare</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>
                    {new Date(terms.effective_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {terms.summary && (
                <div style={{
                  padding: '.875rem 1rem',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: '1.25rem',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-hi)', marginBottom: '.25rem' }}>
                    Ce s-a schimbat
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {terms.summary}
                  </div>
                </div>
              )}

              <div style={{
                padding: '1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                maxHeight: 280,
                overflowY: 'auto',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--fg-1)',
                whiteSpace: 'pre-wrap',
              }}>
                {terms.content}
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '.625rem' }}>
                <input
                  type="checkbox"
                  id="terms-acceptance-checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
                />
                <label htmlFor="terms-acceptance-checkbox" style={{ fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer', lineHeight: 1.5 }}>
                  Am citit și accept noua versiune ({terms.version}) a Termenilor și Condițiilor ESCRO.
                </label>
              </div>
            </>
          )}

          {error && (
            <div style={{
              padding: '.625rem .875rem', marginTop: '.75rem',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 12.5,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-1)',
          display: 'flex', gap: '.5rem', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} disabled={accepting}>
            Deconectare
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={!checked || accepting || loading || !terms}
          >
            {accepting ? 'Se acceptă...' : 'Accept termenii'}
          </button>
        </div>
      </div>
    </div>
  );
}
