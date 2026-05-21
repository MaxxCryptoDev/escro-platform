import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Spinner } from '../components/ui';
import { fmtRON, fmtDate } from '../utils/format';
import axios from 'axios';

const STATUS_OPTS = [
  { value: '', label: 'Toate' },
  { value: 'pending', label: 'În așteptare' },
  { value: 'processing', label: 'În procesare' },
  { value: 'paid', label: 'Plătit' },
  { value: 'failed', label: 'Eșuat' },
];

const STATUS_BADGE = {
  pending:    { label: 'În așteptare', color: 'var(--warning)',  bg: 'var(--warning-bg)' },
  processing: { label: 'În procesare', color: 'var(--accent)',   bg: 'var(--accent-bg)' },
  paid:       { label: 'Plătit',       color: 'var(--success)',  bg: 'var(--success-bg)' },
  failed:     { label: 'Eșuat',        color: 'var(--danger)',   bg: 'var(--danger-bg)' },
};

async function downloadInvoice(milestoneId, token) {
  try {
    const res = await axios.get(`/api/milestones/${milestoneId}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.invoice_url) window.open(res.data.invoice_url, '_blank');
  } catch {
    alert('Factura nu a putut fi generată.');
  }
}

export default function EarningsHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const [invoiceLoading, setInvoiceLoading] = useState({});

  const [earnings, setEarnings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      const res = await axios.get('/api/wallet/earnings', { headers, params });
      setEarnings(res.data.earnings || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <div className="escro-page fade-up">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/wallet')}>
            <Icon name="arrow-left" size={13} /> Portofel
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-0)', margin: 0 }}>Istoric câștiguri</h1>
          <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 'auto' }}>{pagination.total} înregistrări</span>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {STATUS_OPTS.map(opt => (
            <button
              key={opt.value}
              className={`btn btn-sm ${status === opt.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            : earnings.length === 0
              ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 14 }}>Nicio câștig pentru filtrul selectat.</div>
              : <>
                  <table className="tbl tbl-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                        {['Proiect', 'Milestone', 'Brut RON', 'Comision', 'Net RON', 'Data', 'Status plată', ''].map(h => (
                          <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map(e => {
                        const badge = STATUS_BADGE[e.stripe_payout_status] || STATUS_BADGE.pending;
                        return (
                          <tr key={e.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                            <td data-primary style={{ padding: '12px 18px', color: 'var(--fg-1)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.project_title}</td>
                            <td data-label="Milestone" style={{ padding: '12px 18px', color: 'var(--fg-2)' }}>{e.milestone_title || '—'}</td>
                            <td data-label="Brut" style={{ padding: '12px 18px', fontFamily: 'var(--f-mono)', color: 'var(--fg-1)' }}>{fmtRON(e.release_amount_ron)}</td>
                            <td data-label="Comision" style={{ padding: '12px 18px', fontFamily: 'var(--f-mono)', color: 'var(--danger)' }}>-{fmtRON(e.claudiu_commission_amount_ron)}</td>
                            <td data-label="Net" style={{ padding: '12px 18px', fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtRON(e.expert_amount_ron)}</td>
                            <td data-label="Data" style={{ padding: '12px 18px', color: 'var(--fg-3)' }}>{fmtDate(e.released_at)}</td>
                            <td data-label="Status plată" style={{ padding: '12px 18px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                            </td>
                            <td data-actions style={{ padding: '12px 18px' }}>
                              {e.milestone_id && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  disabled={invoiceLoading[e.id]}
                                  onClick={async () => {
                                    setInvoiceLoading(p => ({ ...p, [e.id]: true }));
                                    await downloadInvoice(e.milestone_id, token);
                                    setInvoiceLoading(p => ({ ...p, [e.id]: false }));
                                  }}
                                  title="Descarcă factură"
                                >
                                  <Icon name="download" size={13} /> {invoiceLoading[e.id] ? '…' : 'Factură'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {pagination.pages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border-1)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                        <Icon name="chevron-left" size={13} />
                      </button>
                      <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Pagina {page} din {pagination.pages}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                        <Icon name="chevron-right" size={13} />
                      </button>
                    </div>
                  )}
                </>
          }
        </div>
      </div>
    </div>
  );
}
