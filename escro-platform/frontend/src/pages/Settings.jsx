import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Settings() {
  const { token } = useAuth();

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

  const [notifPrefs, setNotifPrefs] = useState({ email_notifications: true, in_app_notifications: true });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get('/api/users/profile', { headers: { Authorization: `Bearer ${token}` } });
        const u = r.data.user;
        setNotifPrefs({
          email_notifications: u.email_notifications !== false,
          in_app_notifications: u.in_app_notifications !== false,
        });
      } catch (e) { /* silent */ }
    })();
  }, [token]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return setPwMessage({ type: 'error', text: 'Parolele nu se potrivesc.' });
    }
    if (pwForm.newPassword.length < 6) {
      return setPwMessage({ type: 'error', text: 'Parola trebuie să aibă cel puțin 6 caractere.' });
    }
    setPwSaving(true);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMessage({ type: 'success', text: 'Parola a fost schimbată cu succes!' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMessage({ type: 'error', text: err.response?.data?.message || 'Eroare la schimbarea parolei.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveNotifPrefs = async () => {
    setNotifSaving(true);
    setNotifMessage({ type: '', text: '' });
    try {
      await axios.put('/api/users/notification-preferences', notifPrefs, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifMessage({ type: 'success', text: 'Preferințe salvate!' });
    } catch {
      setNotifMessage({ type: 'error', text: 'Eroare la salvare.' });
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="page-eyebrow">Cont</div>
          <h1 className="page-title">Setări cont</h1>
          <p className="page-subtitle">Securitate, notificări și date personale.</p>
        </div>
      </div>

      {/* Security — change password */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <div className="card-title">Securitate cont</div>
        </div>
        <div className="card-body">
          {pwMessage.text && (
            <div style={{
              padding: '.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--r-sm)', fontSize: 13,
              background: pwMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${pwMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              color: pwMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {pwMessage.text}
            </div>
          )}
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.875rem', marginBottom: '1rem' }}>
              <div>
                <label className="label">Parola curentă</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Parolă nouă</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Minim 6 caractere"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Confirmă parola</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repetă parola"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary" disabled={pwSaving}>
              {pwSaving ? 'Se salvează...' : 'Schimbă parola'}
            </button>
          </form>
        </div>
      </div>

      {/* Notification preferences card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <div className="card-title">Preferințe notificări</div>
        </div>
        <div className="card-body">
          {notifMessage.text && (
            <div style={{
              padding: '.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--r-sm)', fontSize: 13,
              background: notifMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${notifMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              color: notifMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {notifMessage.text}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { key: 'email_notifications', label: 'Notificări prin email', desc: 'Primești email la contracte, milestone-uri, plăți și dispute.' },
              { key: 'in_app_notifications', label: 'Notificări în aplicație', desc: 'Alertele apar în clopotel din bara superioară.' },
            ].map(({ key, label, desc }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={e => setNotifPrefs(p => ({ ...p, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={handleSaveNotifPrefs} disabled={notifSaving}>
            {notifSaving ? 'Se salvează...' : 'Salvează preferințele'}
          </button>
        </div>
      </div>

      {/* GDPR */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Date personale (GDPR)</div>
        </div>
        <div className="card-body col" style={{ gap: '1rem' }}>
          <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>
            Conform GDPR, ai dreptul să descarci toate datele tale sau să îți ștergi contul definitiv.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <a
              href="/api/users/me/export-data"
              download
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ↓ Descarcă datele mele (JSON)
            </a>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
              onClick={async () => {
                if (!window.confirm('Ești sigur? Contul tău va fi anonimizat imediat și nu vei mai putea accesa platforma. Acțiunea este ireversibilă.')) return;
                try {
                  const tok = localStorage.getItem('token');
                  await fetch('/api/users/me/account', { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } });
                  localStorage.clear();
                  window.location.href = '/';
                } catch {
                  alert('Eroare la ștergerea contului. Încearcă din nou.');
                }
              }}
            >
              ✕ Șterge contul meu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
