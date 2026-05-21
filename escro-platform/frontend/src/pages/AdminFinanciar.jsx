import { useState, useEffect, useCallback } from 'react';
import { Icon, Spinner } from '../components/ui';
import { fmtRON, fmtDate } from '../utils/format';
import axios from 'axios';

const STATUS_BADGE = {
  pending:    { label: 'În așteptare', color: 'var(--warning)',  bg: 'var(--warning-bg)' },
  processing: { label: 'În procesare', color: 'var(--accent)',   bg: 'var(--accent-bg)' },
  paid:       { label: 'Plătit',       color: 'var(--success)',  bg: 'var(--success-bg)' },
  failed:     { label: 'Eșuat',        color: 'var(--danger)',   bg: 'var(--danger-bg)' },
  cancelled:  { label: 'Respins',      color: 'var(--fg-3)',     bg: 'var(--border-1)' },
};

function StatusBadgeInline({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function AdminFinanciar() {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [report, setReport] = useState(null);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { id, type: 'approve'|'reject'|'mark-paid', userName, amount }
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, payRes] = await Promise.all([
        axios.get('/api/admin/financiar/report', { headers }),
        axios.get(`/api/admin/payouts${payoutFilter ? `?status=${payoutFilter}` : ''}`, { headers }),
      ]);
      setReport(repRes.data);
      setPayoutRequests(payRes.data.payout_requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, payoutFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const url = `/api/admin/payouts/${actionModal.id}/${actionModal.type}`;
      await axios.put(url, { admin_note: adminNote || undefined }, { headers });
      setActionModal(null);
      setAdminNote('');
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (id, userName, amount) => {
    if (!confirm(`Marchezi retragerea de ${fmtRON(amount)} a lui ${userName} ca PLĂTITĂ?\nAcest lucru va notifica utilizatorul că banii au fost trimiși.`)) return;
    setMarkPaidLoading(id);
    try {
      await axios.put(`/api/admin/payouts/${id}/mark-paid`, {}, { headers });
      fetchData();
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare.');
    } finally {
      setMarkPaidLoading(null);
    }
  };

  if (loading && !report) return <div className="escro-page"><Spinner /></div>;

  const sum = report?.summary || {};
  const paySum = report?.payout_summary || {};

  return (
    <div className="escro-page fade-up">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', marginBottom: 24 }}>Financiar</h1>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Comision câștigat', value: sum.total_commission, color: 'var(--success)', icon: 'trending-up' },
            { label: 'Distribuit experți', value: sum.total_disbursed, color: 'var(--accent)', icon: 'users' },
            { label: 'În escrow', value: sum.currently_held, color: 'var(--warning)', icon: 'lock' },
            { label: 'Retrageri pending', value: paySum.pending_amount, color: 'var(--danger)', icon: 'arrow-up-circle', sub: `${paySum.pending_count || 0} cereri` },
          ].map(({ label, value, color, icon, sub }) => (
            <div key={label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon} size={14} style={{ color }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--f-mono)' }}>{fmtRON(parseFloat(value) || 0)}</div>
              {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Payout requests */}
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-1)', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Cereri de retragere</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 'pending', l: 'În așteptare' }, { v: 'processing', l: 'În procesare' }, { v: 'paid', l: 'Plătite' }, { v: 'cancelled', l: 'Respinse' }, { v: '', l: 'Toate' }].map(opt => (
                <button key={opt.v} className={`btn btn-sm ${payoutFilter === opt.v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPayoutFilter(opt.v)}>{opt.l}</button>
              ))}
            </div>
          </div>

          {loading
            ? <div style={{ padding: 30, textAlign: 'center' }}><Spinner /></div>
            : payoutRequests.length === 0
              ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>Nicio cerere de retragere.</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                      {['Utilizator', 'Email', 'Sumă', 'Status', 'Solicitat', 'Stripe Account', 'Acțiuni'].map(h => (
                        <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payoutRequests.map(pr => (
                      <tr key={pr.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--fg-0)' }}>{pr.user_name}</td>
                        <td style={{ padding: '12px 18px', color: 'var(--fg-2)', fontSize: 12 }}>{pr.user_email}</td>
                        <td style={{ padding: '12px 18px', fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{fmtRON(pr.amount_ron)}</td>
                        <td style={{ padding: '12px 18px' }}><StatusBadgeInline status={pr.status} /></td>
                        <td style={{ padding: '12px 18px', color: 'var(--fg-3)' }}>{fmtDate(pr.requested_at)}</td>
                        <td style={{ padding: '12px 18px', fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
                          {pr.stripe_account_id
                            ? <span style={{ color: pr.stripe_onboarding_complete ? 'var(--success)' : 'var(--warning)' }}>{pr.stripe_onboarding_complete ? '✓ Conectat' : '⏳ Pending'}</span>
                            : <span style={{ color: 'var(--fg-3)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {pr.status === 'pending' && (<>
                              <button
                                className="btn btn-sm btn-success"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => setActionModal({ id: pr.id, type: 'approve', userName: pr.user_name, amount: pr.amount_ron })}
                              >Aprobă</button>
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: 11, padding: '4px 10px', color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent' }}
                                onClick={() => setActionModal({ id: pr.id, type: 'reject', userName: pr.user_name, amount: pr.amount_ron })}
                              >Respinge</button>
                            </>)}
                            {pr.status === 'processing' && (
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => handleMarkPaid(pr.id, pr.user_name, pr.amount_ron)}
                                disabled={markPaidLoading === pr.id}
                              >
                                {markPaidLoading === pr.id ? <Spinner size={10} inline /> : 'Marcat plătit'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>

        {/* Monthly evolution */}
        {report?.monthly?.length > 0 && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Evoluție comision (ultimele 6 luni)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                  {['Lună', 'Comision', 'Distribuit', 'Nr. eliberări'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.monthly.map(m => (
                  <tr key={m.month} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--fg-0)' }}>{m.month}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'var(--f-mono)', color: 'var(--success)', fontWeight: 600 }}>{fmtRON(m.commission)}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'var(--f-mono)', color: 'var(--accent)' }}>{fmtRON(m.disbursed)}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--fg-2)' }}>{m.release_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent releases */}
        {report?.recent_releases?.length > 0 && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>Ultimele eliberări milestone</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>
                  {['Proiect', 'Milestone', 'Prestator', 'Client', 'Brut', 'Comision', 'Net', 'Data', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, borderBottom: '1px solid var(--border-1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.recent_releases.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-1)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project_title}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.milestone_title || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-1)' }}>{r.provider_name || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-2)' }}>{r.client_name || '—'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--f-mono)', color: 'var(--fg-1)' }}>{fmtRON(r.release_amount_ron)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--f-mono)', color: 'var(--danger)' }}>{fmtRON(r.claudiu_commission_amount_ron)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtRON(r.expert_amount_ron)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-3)' }}>{fmtDate(r.released_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {(() => { const s = STATUS_BADGE[r.stripe_payout_status] || STATUS_BADGE.pending; return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>; })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-0)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--fg-0)' }}>
              {actionModal.type === 'approve' ? 'Aprobă retragere' : 'Respinge retragere'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '0 0 16px' }}>
              {actionModal.userName} — <strong>{fmtRON(actionModal.amount)}</strong>
            </p>
            <label style={{ fontSize: 12, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
              {actionModal.type === 'approve' ? 'Notă (opțional)' : 'Motiv respingere (opțional)'}
            </label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={3}
              placeholder="..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--bg-1)', color: 'var(--fg-0)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setActionModal(null); setAdminNote(''); }}>Anulează</button>
              <button
                className={`btn ${actionModal.type === 'approve' ? 'btn-success' : 'btn-danger'}`}
                style={{ flex: 1 }}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? <Spinner size={12} inline /> : actionModal.type === 'approve' ? 'Aprobă' : 'Respinge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
