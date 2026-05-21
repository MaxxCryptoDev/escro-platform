import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Blocking modal shown to non-admin users on first login.
// Asks user to confirm/edit the phone number where admin will call them for KYC verification.
// "Refuz" = full logout — they can't use the platform without confirming.
export default function VerificationAckModal({ onAcknowledged }) {
  const { user, token, logout, updateUser } = useAuth();

  // Pre-fill with the phone number entered at registration (preview).
  // User can edit it freely before confirming.
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const phoneValid = phone.trim().length >= 6;

  const handleConfirm = async () => {
    if (!phoneValid) {
      setError('Număr de telefon invalid.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/verification-calls/acknowledge',
        { phone: phone.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update user state once with both fields — keeps the auth context in sync
      // and causes VerificationAckGate to return null on the next render.
      updateUser({
        phone: phone.trim(),
        verification_call_acknowledged_at: res.data?.acknowledged_at || new Date().toISOString(),
      });
      onAcknowledged?.();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Eroare la confirmare. Reîncearcă.');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-2, #e2e8f0)',
          borderRadius: 'var(--r-lg, 14px)',
          maxWidth: 520, width: '100%',
          padding: '2rem',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent-bg, #dbeafe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
          fontSize: 28,
        }}>
          📞
        </div>

        <h2 style={{
          fontSize: 20, fontWeight: 700, color: 'var(--fg-0)',
          textAlign: 'center', margin: '0 0 0.75rem',
        }}>
          Apel de verificare a identității
        </h2>

        <p style={{ fontSize: 14, color: 'var(--fg-1)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          Pentru a folosi platforma, vei fi sunat de administrator pentru o verificare scurtă.
          Confirmă sau modifică numărul pe care vrei să fii contactat.
        </p>

        <label style={{ display: 'block', marginBottom: '1.25rem' }}>
          <span style={{
            display: 'block',
            fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 6,
          }}>
            Număr de telefon
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+40 7XX XXX XXX"
            autoFocus
            style={{
              width: '100%', padding: '0.75rem 0.875rem',
              fontSize: 18, fontWeight: 500,
              fontFamily: 'var(--f-mono, monospace)',
              background: 'var(--bg-1, #f8fafc)',
              border: '1px solid var(--border-1, #cbd5e1)',
              borderRadius: 'var(--r-md, 10px)',
              color: 'var(--fg-0)',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {user?.phone && phone !== user.phone && (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6, display: 'block' }}>
              La înregistrare ai introdus: <span className="mono">{user.phone}</span>
            </span>
          )}
        </label>

        {error && (
          <div style={{
            background: 'var(--danger-bg, #fee2e2)', border: '1px solid var(--danger-border, #fca5a5)',
            color: 'var(--danger, #b91c1c)', borderRadius: 'var(--r-sm, 8px)',
            padding: '0.625rem 0.875rem', fontSize: 13, marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            style={{
              flex: 1, padding: '0.75rem 1rem',
              background: 'var(--bg-1, #f8fafc)',
              border: '1px solid var(--border-1, #cbd5e1)',
              color: 'var(--fg-2, #475569)',
              borderRadius: 'var(--r-md, 8px)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Refuz · ieși din cont
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !phoneValid}
            style={{
              flex: 1.4, padding: '0.75rem 1rem',
              background: submitting || !phoneValid ? 'var(--border-2, #cbd5e1)' : 'var(--accent, #2563eb)',
              border: 'none', color: '#ffffff',
              borderRadius: 'var(--r-md, 8px)',
              fontSize: 14, fontWeight: 600,
              cursor: submitting || !phoneValid ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Se procesează…' : '✓ Confirm numărul'}
          </button>
        </div>

        <p style={{
          fontSize: 11, color: 'var(--fg-3)', textAlign: 'center',
          marginTop: '1.25rem', lineHeight: 1.5,
        }}>
          Apelul va fi programat de admin după confirmare.
          Dacă refuzi, vei fi delogat și nu vei putea folosi platforma.
        </p>
      </div>
    </div>
  );
}
