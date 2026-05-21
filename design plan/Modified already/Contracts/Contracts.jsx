import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner, EmptyState } from '../components/ui';
import { withAuthToken } from '../utils/format';

const TYPE_LABEL = {
  project:   { label: 'Contract Proiect',        icon: 'folder',      color: 'var(--accent)' },
  milestone: { label: 'Contract Predare-Primire', icon: 'check-square', color: 'var(--violet)' },
  final:     { label: 'Contract Finalizare',      icon: 'award',       color: 'var(--success)' },
};

const STATUS_LABEL = {
  pending:   { label: 'Nesemnat',  bg: 'var(--warning-bg)',  color: 'var(--warning)',  border: 'var(--warning-border)' },
  accepted:  { label: 'Semnat',    bg: 'var(--success-bg)',  color: 'var(--success)',  border: 'var(--success-border)' },
  completed: { label: 'Finalizat', bg: 'var(--success-bg)',  color: 'var(--success)',  border: 'var(--success-border)' },
  rejected:  { label: 'Respins',   bg: 'var(--danger-bg)',   color: 'var(--danger)',   border: 'var(--danger-border)'  },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const cfg = STATUS_LABEL[status] || STATUS_LABEL.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

export default function Contracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [adminContracts, setAdminContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const r = await axios.get('/api/admin/contracts', { headers });
          const data = r.data;
          setAdminContracts({
            projectContracts: data.projectContracts || [],
            userContracts: data.userContracts || [],
          });
        } else {
          const r = await axios.get('/api/contracts/mine', { headers });
          setContracts(r.data.contracts || []);
        }
      } catch {
        setError('Nu am putut încărca contractele.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  // Merge admin view
  const allAdminContracts = isAdmin && adminContracts
    ? adminContracts.projectContracts || []
    : null;

  const displayed = (isAdmin ? allAdminContracts || [] : contracts).filter(c => {
    if (filterType && c.contract_type !== filterType) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.project_title || '').toLowerCase().includes(q)
        || (c.milestone_title || '').toLowerCase().includes(q)
        || (c.party1_name || '').toLowerCase().includes(q)
        || (c.party2_name || '').toLowerCase().includes(q)
        || (c.contract_number || '').toLowerCase().includes(q);
    }
    return true;
  });

  const counts = { all: displayed.length };
  ['project','milestone','final'].forEach(t => {
    counts[t] = (isAdmin ? allAdminContracts || [] : contracts).filter(c => c.contract_type === t).length;
  });

  return (
    <div className="escro-page fade-up">
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">Cont · Documente</div>
          <h1 className="h-title" style={{ fontSize: 28 }}>
            {isAdmin ? <>Toate <em>contractele</em>.</> : <>Contractele <em>mele</em>.</>}
          </h1>
          <p className="h-sub">
            {isAdmin
              ? 'Toate contractele semnate pe platformă, cu detalii complete.'
              : 'Contractele semnate din proiectele în care ești implicat.'}
          </p>
        </div>
        <div className="page-actions">
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: '.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: '2rem', width: 220, height: 34, fontSize: 13 }}
              placeholder="Caută proiect, parte…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Type tabs + status filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-1)', alignSelf: 'flex-end' }}>
          {[
            { id: '', label: 'Toate', count: counts.all },
            { id: 'project', label: 'Proiect', count: counts.project },
            { id: 'milestone', label: 'Milestone', count: counts.milestone },
            { id: 'final', label: 'Final', count: counts.final },
          ].map(t => (
            <div key={t.id} onClick={() => setFilterType(t.id)} style={{
              padding: '0.5rem 1rem', fontSize: 13, fontWeight: 500,
              color: filterType === t.id ? 'var(--fg-0)' : 'var(--fg-2)',
              borderBottom: `2px solid ${filterType === t.id ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: -1,
            }}>
              {t.label}
              <span style={{ fontSize: 10, background: 'var(--border-1)', padding: '1px 5px', borderRadius: 3, color: 'var(--fg-3)' }}>{t.count}</span>
            </div>
          ))}
        </div>
        <select className="input" style={{ height: 32, fontSize: 13, minWidth: 160 }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Orice status</option>
          <option value="pending">Nesemnat</option>
          <option value="accepted">Semnat</option>
          <option value="completed">Finalizat</option>
          <option value="rejected">Respins</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? <Spinner /> : displayed.length === 0 ? (
        <EmptyState icon="file-text" title="Niciun contract" description={search || filterType || filterStatus ? 'Niciun rezultat pentru filtrele selectate.' : 'Nu există contracte înregistrate.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {displayed.map(c => {
            const typeInfo = TYPE_LABEL[c.contract_type] || TYPE_LABEL.project;
            return (
              <div key={c.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Type icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name={typeInfo.icon} size={16} style={{ color: typeInfo.color }} />
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>
                        {typeInfo.label}
                        {c.contract_number && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', marginLeft: 6 }}>#{c.contract_number}</span>}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--fg-1)', marginBottom: '.25rem' }}>
                      <span style={{ fontWeight: 500 }}>{c.project_title || '—'}</span>
                      {c.milestone_title && <span style={{ color: 'var(--fg-3)' }}> · {c.milestone_title}</span>}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span>
                        <Icon name="users" size={11} style={{ marginRight: 3 }} />
                        {c.party1_name || c.party1_company || '—'} &amp; {c.party2_name || c.party2_company || '—'}
                      </span>
                      <span>
                        <Icon name="calendar" size={11} style={{ marginRight: 3 }} />
                        {fmtDate(c.created_at)}
                      </span>
                      {(c.party1_accepted_at || c.party2_accepted_at) && (
                        <span style={{ color: 'var(--success)' }}>
                          <Icon name="check" size={11} style={{ marginRight: 3 }} />
                          Semnat {fmtDate(c.party1_accepted_at || c.party2_accepted_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
                    {c.pdf_url && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClick={async e => {
                          e.stopPropagation();
                          try {
                            const t = localStorage.getItem('token');
                            const blobRes = await fetch(withAuthToken(c.pdf_url), { headers: t ? { Authorization: `Bearer ${t}` } : {} });
                            const blob = await blobRes.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `contract-${c.contract_number || c.id}.pdf`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                          } catch { alert('Nu s-a putut descărca PDF-ul.'); }
                        }}
                      >
                        <Icon name="download" size={13} /> PDF
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/project/${c.project_id}`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Icon name="external-link" size={13} /> Proiect
                    </button>
                  </div>
                </div>

                {/* Signature status bar */}
                {c.status === 'pending' && (
                  <div style={{
                    marginTop: '.75rem', paddingTop: '.75rem',
                    borderTop: '1px solid var(--border-1)',
                    display: 'flex', gap: '1rem', fontSize: 12,
                  }}>
                    <span style={{ color: c.party1_accepted ? 'var(--success)' : 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.party1_accepted ? <Icon name="check" size={11} /> : <Icon name="clock" size={11} />}
                      {c.party1_name || 'Parte 1'}: {c.party1_accepted ? 'semnat' : 'în așteptare'}
                    </span>
                    <span style={{ color: c.party2_accepted ? 'var(--success)' : 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.party2_accepted ? <Icon name="check" size={11} /> : <Icon name="clock" size={11} />}
                      {c.party2_name || 'Parte 2'}: {c.party2_accepted ? 'semnat' : 'în așteptare'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin: also show user_contracts (T&C acceptances) */}
      {isAdmin && adminContracts?.userContracts?.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Termeni &amp; Condiții acceptate ({adminContracts.userContracts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem' }}>
            {adminContracts.userContracts.map(uc => (
              <div key={uc.id} style={{
                padding: '.625rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
              }}>
                <span style={{ color: 'var(--fg-1)' }}>{uc.user_name || uc.user_email || uc.user_id}</span>
                <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                  {uc.contract_type} · {fmtDate(uc.signed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
