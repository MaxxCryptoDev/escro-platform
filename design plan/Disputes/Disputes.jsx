import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Icon, Spinner, EmptyState } from '../components/ui';
import { milestoneAPI } from '../services/api';
import { withAuthToken } from '../utils/format';

const STATUS = {
  pending: { label: 'În analiză', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  open:    { label: 'În analiză', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  resolved:{ label: 'Rezolvată',  color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
  rejected:{ label: 'Respinsă',   color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)'  },
};

const DECISION_LABEL = {
  full:    'Eliberare integrală',
  partial: 'Eliberare parțială',
  rejected:'Fonduri returnate',
};

function Badge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.25rem',
      padding: '2px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtRON(n) {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' RON';
}

function isImage(url = '') {
  return /\.(png|jpe?g|gif|webp)$/i.test(url);
}

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [uploading, setUploading] = useState({});
  const [uploadError, setUploadError] = useState({});
  const fileRefs = useRef({});

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const load = () => {
    setLoading(true);
    milestoneAPI.getMyDisputes()
      .then(r => setDisputes(r.data.disputes || []))
      .catch(() => setError('Nu am putut încărca disputele.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (disputeId, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [disputeId]: true }));
    setUploadError(p => ({ ...p, [disputeId]: '' }));
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post(`/api/disputes/${disputeId}/evidence`, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setDisputes(prev => prev.map(d => {
        if (d.id !== disputeId) return d;
        const existing = Array.isArray(d.evidence_files) ? d.evidence_files : [];
        return { ...d, evidence_files: [...existing, r.data.file] };
      }));
    } catch (e) {
      setUploadError(p => ({ ...p, [disputeId]: e.response?.data?.error || 'Eroare la upload.' }));
    } finally {
      setUploading(p => ({ ...p, [disputeId]: false }));
      if (fileRefs.current[disputeId]) fileRefs.current[disputeId].value = '';
    }
  };

  const isOpen = s => s === 'pending' || s === 'open';

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">Cont · Arbitraj</div>
          <h1 className="h-title" style={{ fontSize: 28 }}>Disputele <em>mele</em>.</h1>
          <p className="h-sub">Urmărește și gestionează disputele deschise pe milestone-urile tale.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? <Spinner /> : disputes.length === 0 ? (
        <EmptyState icon="shield" title="Nicio dispută" description="Nu ai dispute active sau rezolvate în acest moment." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {disputes.map(d => {
            const open = isOpen(d.status);
            const evidence = Array.isArray(d.evidence_files) ? d.evidence_files : [];
            return (
              <div key={d.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)' }}>{d.milestone_title}</span>
                      <Badge status={d.status} />
                      {evidence.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Icon name="paperclip" size={11} /> {evidence.length} dovezi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>
                      Proiect: <Link to={`/project/${d.project_id}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-hi)' }}>{d.project_title}</Link>
                      {' · '}Deschisă: {fmtDate(d.created_at)}
                      {d.resolved_at && <> · Rezolvată: {fmtDate(d.resolved_at)}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    {d.milestone_amount > 0 && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 14, color: 'var(--fg-1)' }}>
                        {fmtRON(d.milestone_amount)}
                      </span>
                    )}
                    <Icon name="chevron-down" size={16} style={{ color: 'var(--fg-3)', transform: expanded === d.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </div>
                </div>

                {expanded === d.id && (
                  <div style={{ borderTop: '1px solid var(--border-1)' }}>
                    {/* Details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 1.25rem' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Motiv dispută</div>
                        <p style={{ fontSize: 13.5, color: 'var(--fg-1)', margin: 0, lineHeight: 1.5 }}>{d.reason || '—'}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Deschisă de</div>
                        <p style={{ fontSize: 13.5, color: 'var(--fg-1)', margin: 0 }}>{d.raised_by_name || '—'}</p>
                        {d.other_party_name && <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '.25rem 0 0' }}>Cealaltă parte: {d.other_party_name}</p>}
                      </div>
                    </div>

                    {/* Pending status notice */}
                    {open && (
                      <div style={{ margin: '0 1.25rem 1rem', padding: '1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-md)' }}>
                        <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.6 }}>
                          <strong>⏳ Disputa este în curs de analiză.</strong><br />
                          Fondurile escrow sunt blocate până la decizia administratorului. Poți adăuga dovezi suplimentare mai jos.
                        </div>
                        <Link
                          to={`/project/${d.project_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', marginTop: '.75rem' }}
                        >
                          <Icon name="folder" size={13} /> Mergi la proiect
                        </Link>
                      </div>
                    )}

                    {/* Resolved decision */}
                    {d.status === 'resolved' && (
                      <div style={{ margin: '0 1.25rem 1rem', padding: '1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-md)' }}>
                        <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>
                          Decizia administratorului{d.decision_type && ` · ${DECISION_LABEL[d.decision_type] || d.decision_type}`}
                        </div>
                        <p style={{ fontSize: 13.5, color: 'var(--fg-1)', margin: '0 0 .5rem' }}>{d.claudiu_decision || 'Rezolvat'}</p>
                        {d.claudiu_release_amount_ron > 0 && (
                          <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                            Sumă eliberată: {fmtRON(d.claudiu_release_amount_ron)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Evidence section */}
                    <div style={{ padding: '0 1.25rem 1.25rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
                        <Icon name="paperclip" size={12} /> Dovezi ({evidence.length})
                      </div>

                      {evidence.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
                          {evidence.map((f, i) => (
                            <a
                              key={i}
                              href={withAuthToken(f.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '.375rem',
                                padding: '.375rem .75rem', borderRadius: 'var(--r-sm)',
                                background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                                fontSize: 12.5, color: 'var(--accent-hi)', textDecoration: 'none',
                                maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
                              {isImage(f.url) ? <Icon name="image" size={13} /> : <Icon name="file" size={13} />}
                              {f.name || `Fișier ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Upload only for open disputes */}
                      {open && (
                        <div>
                          <input
                            ref={el => fileRefs.current[d.id] = el}
                            type="file"
                            accept="image/*,application/pdf,video/mp4,video/webm"
                            style={{ display: 'none' }}
                            onChange={e => handleUpload(d.id, e.target.files[0])}
                          />
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={uploading[d.id]}
                            onClick={() => fileRefs.current[d.id]?.click()}
                          >
                            {uploading[d.id] ? <><Spinner size={13} inline /> Se încarcă…</> : <><Icon name="upload" size={13} /> Adaugă dovadă</>}
                          </button>
                          {uploadError[d.id] && (
                            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: '.5rem' }}>
                              {uploadError[d.id]}
                            </div>
                          )}
                          <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginTop: '.375rem' }}>
                            Imagini, PDF, video — max 20 MB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
