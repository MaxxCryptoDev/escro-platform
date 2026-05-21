import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function PayoutHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/wallet/payouts', { headers });
      setPayouts(res.data.payouts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleCancel = async (id) => {
    if (!confirm('Ești sigur că vrei să anulezi această cerere?')) return;
    setCancelling(id);
    try {
      await axios.delete(`/api/wallet/payout/${id}`, { headers });
      fetchPayouts();
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare la anulare.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="escro-page fade-up">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/wallet')}>
            <Icon name="arrow-left" size={13} /> Portofel
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-0)', margin: 0 }}>Istoric retrageri</h1>
        </div>

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            : payouts.length === 0
              ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 14 }}>Nicio cerere de retragere.</div>
              : <table className="tbl tbl-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                      {['Sumă', 'Status', 'Solicitat la', 'Procesat la', 'Notă admin', ''].map(h => (
                        <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => {
                      const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                          <td data-primary style={{ padding: '12px 18px', fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{fmtRON(p.amount_ron)}</td>
                          <td data-label="Status" style={{ padding: '12px 18px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </td>
                          <td data-label="Solicitat" style={{ padding: '12px 18px', color: 'var(--fg-3)' }}>{fmtDate(p.requested_at)}</td>
                          <td data-label="Procesat" style={{ padding: '12px 18px', color: 'var(--fg-3)' }}>{p.processed_at ? fmtDate(p.processed_at) : '—'}</td>
                          <td data-label="Notă admin" style={{ padding: '12px 18px', color: 'var(--fg-2)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.admin_note || '—'}</td>
                          <td data-actions style={{ padding: '12px 18px' }}>
                            {p.status === 'pending' && (
                              <button
                                className="btn btn-sm"
                                style={{ color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                                onClick={() => handleCancel(p.id)}
                                disabled={cancelling === p.id}
                              >
                                {cancelling === p.id ? <Spinner size={10} inline /> : 'Anulează'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
          }
        </div>
      </div>
    </div>
  );
}
