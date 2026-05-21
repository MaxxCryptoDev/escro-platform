import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner } from '../components/ui';
import { withAuthToken } from '../utils/format';
import '../styles/Contracts.css';

const TYPE_META = {
  project: {
    label: 'Contract proiect',
    short: 'Proiect',
    icon: 'folder',
    bg: 'var(--accent-bg)',
    fg: 'var(--accent-hi)',
    border: 'var(--accent-border)',
  },
  milestone: {
    label: 'Contract predare-primire',
    short: 'Predare',
    icon: 'check-square',
    bg: 'rgba(148,163,184,0.10)',
    fg: 'var(--fg-1)',
    border: 'rgba(148,163,184,0.28)',
  },
  final: {
    label: 'Contract finalizare',
    short: 'Final',
    icon: 'award',
    bg: 'var(--success-bg)',
    fg: 'var(--success)',
    border: 'var(--success-border)',
  },
  terms_conditions: {
    label: 'T&C platformă',
    short: 'T&C',
    icon: 'shield',
    bg: 'transparent',
    fg: 'var(--fg-2)',
    border: 'var(--border-2)',
  },
};

const STATUS_META = {
  pending: {
    label: 'În așteptare semnături',
    short: 'În așteptare',
    bg: 'var(--warning-bg)',
    fg: 'var(--warning)',
    border: 'var(--warning-border)',
    dot: 'var(--warning)',
  },
  accepted: {
    label: 'Semnat de toți',
    short: 'Semnat',
    bg: 'var(--success-bg)',
    fg: 'var(--success)',
    border: 'var(--success-border)',
    dot: 'var(--success)',
  },
  completed: {
    label: 'Finalizat',
    short: 'Finalizat',
    bg: 'var(--success-bg)',
    fg: 'var(--success)',
    border: 'var(--success-border)',
    dot: 'var(--success)',
  },
  rejected: {
    label: 'Respins',
    short: 'Respins',
    bg: 'var(--danger-bg)',
    fg: 'var(--danger)',
    border: 'var(--danger-border)',
    dot: 'var(--danger)',
  },
};

function fmtDate(d) {
  if (!d) return '—';
  const dd = new Date(d);
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
  return `${dd.getDate()} ${months[dd.getMonth()]} ${dd.getFullYear()}`;
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dd = new Date(d);
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
  const hh = String(dd.getHours()).padStart(2, '0');
  const mm = String(dd.getMinutes()).padStart(2, '0');
  return `${dd.getDate()} ${months[dd.getMonth()]} ${dd.getFullYear()} · ${hh}:${mm}`;
}

function fmtRON(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n) + ' RON';
}

function TypeChip({ type, compact }) {
  const m = TYPE_META[type] || TYPE_META.project;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px 3px 7px',
      borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.fg, border: `1px solid ${m.border}`,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      <Icon name={m.icon} size={11} />
      {compact ? m.short : m.label}
    </span>
  );
}

function StatusBadge({ status, compact }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px',
      borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.fg, border: `1px solid ${m.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {compact ? m.short : m.label}
    </span>
  );
}

function TypeEdge({ type }) {
  const m = TYPE_META[type] || TYPE_META.project;
  return (
    <div style={{
      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
      borderRadius: '0 3px 3px 0',
      background: m.fg,
      opacity: 0.7,
    }} />
  );
}

function SignaturePill({ name, company, accepted, acceptedAt, role }) {
  if (!name && !company) return null;
  const initials = (name || company || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const isPending = !accepted;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: 'var(--bg-1)',
      border: `1px solid ${isPending ? 'var(--warning-border)' : 'var(--success-border)'}`,
      borderRadius: 'var(--r-md)',
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `linear-gradient(135deg, ${isPending ? 'var(--warning)' : 'var(--success)'}, ${isPending ? '#b45309' : '#047857'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 11,
        flexShrink: 0,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || '—'}</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {company || '—'}
        </div>
        <div style={{
          fontSize: 11, marginTop: 4,
          color: isPending ? 'var(--warning)' : 'var(--success)',
          display: 'flex', alignItems: 'center', gap: 4,
          fontWeight: 600,
        }}>
          <Icon name={isPending ? 'clock' : 'check-circle'} size={11} />
          {isPending ? 'Nesemnat' : `Semnat · ${fmtDateTime(acceptedAt)}`}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: 'var(--bg-card)', border: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-3)', flexShrink: 0,
      }}>
        <Icon name={icon} size={12} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{
          fontSize: 12.5, color: 'var(--fg-0)', fontWeight: 600,
          fontFamily: mono ? 'var(--f-mono)' : 'inherit',
          letterSpacing: mono ? '-0.01em' : '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{value}</div>
      </div>
    </div>
  );
}

async function downloadPdfBlob(c) {
  const t = localStorage.getItem('token');
  try {
    const blobRes = await fetch(withAuthToken(c.pdf_url), { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    const blob = await blobRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${c.contract_number || c.id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch {
    alert('Nu s-a putut descărca PDF-ul.');
  }
}

function ContractExpanded({ c, allContracts, onOpenPDF, navigate, onCopy }) {
  const related = c.project_id ? allContracts.filter(x => x.project_id === c.project_id && x.id !== c.id) : [];
  const isTC = c.contract_type === 'terms_conditions';
  return (
    <div style={{
      borderTop: '1px solid var(--border-1)',
      padding: '1.25rem 1.5rem',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)',
      display: 'grid', gap: '1.25rem',
    }}>
      {!isTC && (
        <div>
          <div className="h-eyebrow" style={{ marginBottom: '0.625rem' }}>Părți & Semnături</div>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <SignaturePill
              name={c.party1_name}
              company={c.party1_company}
              accepted={c.party1_accepted}
              acceptedAt={c.party1_accepted_at}
              role="Beneficiar"
            />
            <SignaturePill
              name={c.party2_name}
              company={c.party2_company}
              accepted={c.party2_accepted}
              acceptedAt={c.party2_accepted_at}
              role="Prestator"
            />
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--r-md)',
      }}>
        <MetaItem icon="calendar" label="Generat la" value={fmtDateTime(c.created_at)} />
        {c.contract_number && <MetaItem icon="file-text" label="Număr contract" value={c.contract_number} mono />}
        {c.amount_ron != null && <MetaItem icon="trend" label="Valoare" value={fmtRON(c.amount_ron)} mono />}
        <MetaItem icon="lock" label="Tip" value={TYPE_META[c.contract_type]?.label || '—'} />
      </div>

      {related.length > 0 && (
        <div>
          <div className="h-eyebrow" style={{ marginBottom: '0.5rem' }}>
            Alte contracte pe acest proiect · {related.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {related.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--r-sm)',
                fontSize: 12.5,
              }}>
                <TypeChip type={r.contract_type} compact />
                <span style={{ color: 'var(--fg-1)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.milestone_title || r.contract_number}
                </span>
                <StatusBadge status={r.status} compact />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{fmtDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {c.contract_number && (
          <button className="btn btn-ghost btn-sm" onClick={() => onCopy(c.contract_number)}>
            <Icon name="copy" size={13} /> Copiază nr.
          </button>
        )}
        {c.project_id && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/project/${c.project_id}`)}>
            <Icon name="external-link" size={13} /> Vezi proiect
          </button>
        )}
        {c.pdf_url && (
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenPDF(c)}>
            <Icon name="eye" size={13} /> Preview PDF
          </button>
        )}
        {c.pdf_url && (
          <button className="btn btn-primary btn-sm" onClick={() => downloadPdfBlob(c)}>
            <Icon name="download" size={13} /> Descarcă PDF
          </button>
        )}
      </div>
    </div>
  );
}

function ContractCard({ c, allContracts, expanded, onToggle, onOpenPDF, navigate, onCopy }) {
  const typeMeta = TYPE_META[c.contract_type] || TYPE_META.project;
  const padY = '1rem';
  const padX = '1.25rem';
  const isTC = c.contract_type === 'terms_conditions';

  const bothSigned = c.party1_accepted && c.party2_accepted;
  const sigCount = (c.party1_accepted ? 1 : 0) + (c.party2_accepted ? 1 : 0);

  return (
    <div className="card" style={{
      padding: 0,
      borderColor: expanded ? 'var(--accent-border)' : 'var(--border-1)',
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: expanded ? '0 6px 24px rgba(0,0,0,0.22)' : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <TypeEdge type={c.contract_type} />

      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        style={{
          padding: `${padY} ${padX} ${padY} calc(${padX} + 4px)`,
          display: 'flex', alignItems: 'center', gap: '1rem',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r-sm)',
          background: typeMeta.bg,
          border: `1px solid ${typeMeta.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: typeMeta.fg,
          flexShrink: 0,
        }}>
          <Icon name={typeMeta.icon} size={17} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: 4 }}>
            <TypeChip type={c.contract_type} compact />
            <StatusBadge status={c.status} compact />
            {c.contract_number && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-4)', letterSpacing: '0.04em' }}>
                {c.contract_number}
              </span>
            )}
          </div>

          <div style={{
            fontFamily: 'var(--f-display)', fontSize: 17, fontWeight: 400,
            color: 'var(--fg-0)', letterSpacing: '-0.015em', lineHeight: 1.25,
            marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {c.project_title || (isTC ? (c.party1_name || c.party1_company || '—') : '—')}
            {c.milestone_title && (
              <span style={{ color: 'var(--fg-3)', fontStyle: 'italic', marginLeft: 8, fontSize: 14 }}>
                · {c.milestone_title}
              </span>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
            fontSize: 12, color: 'var(--fg-3)',
          }}>
            {!isTC && (c.party1_name || c.party2_name || c.party1_company || c.party2_company) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="users" size={11} />
                <span style={{ color: 'var(--fg-2)' }}>{c.party1_company || c.party1_name || '—'}</span>
                <span style={{ opacity: 0.5 }}>↔</span>
                <span style={{ color: 'var(--fg-2)' }}>{c.party2_company || c.party2_name || '—'}</span>
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="calendar" size={11} />
              <span style={{ fontFamily: 'var(--f-mono)' }}>{fmtDate(c.created_at)}</span>
            </span>
            {!isTC && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="edit" size={11} />
                <span style={{ color: bothSigned ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                  {sigCount}/2 semnături
                </span>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
          {c.amount_ron != null && (
            <div className="contracts-amount-cell" style={{ textAlign: 'right', marginRight: '.5rem' }}>
              <div style={{
                fontFamily: 'var(--f-display)', fontSize: 22,
                color: 'var(--fg-0)', letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {new Intl.NumberFormat('ro-RO').format(c.amount_ron)}
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.05em', marginTop: 2 }}>RON</div>
            </div>
          )}

          {c.pdf_url && (
            <button
              className="icon-btn"
              onClick={e => { e.stopPropagation(); onOpenPDF(c); }}
              aria-label="Preview PDF"
              title="Preview PDF"
              style={{ width: 40, height: 40 }}
            >
              <Icon name="eye" size={16} />
            </button>
          )}
          {c.pdf_url && (
            <button
              className="icon-btn"
              onClick={e => { e.stopPropagation(); downloadPdfBlob(c); }}
              aria-label="Descarcă PDF"
              title="Descarcă PDF"
              style={{
                width: 40, height: 40,
                background: 'var(--accent-bg)',
                color: 'var(--accent-hi)',
                border: '1px solid var(--accent-border)',
              }}
            >
              <Icon name="download" size={16} />
            </button>
          )}

          <button
            className="icon-btn"
            aria-label={expanded ? 'Restrânge' : 'Extinde'}
            style={{ width: 32, height: 32 }}
            onClick={e => { e.stopPropagation(); onToggle(); }}
          >
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
          </button>
        </div>
      </div>

      {!isTC && c.status !== 'rejected' && !expanded && (
        <div style={{
          height: 2,
          background: 'var(--border-1)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: bothSigned ? '100%' : (sigCount > 0 ? '50%' : '0%'),
            background: bothSigned ? 'var(--success)' : 'var(--warning)',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      )}

      {expanded && (
        <ContractExpanded
          c={c}
          allContracts={allContracts}
          onOpenPDF={onOpenPDF}
          navigate={navigate}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}

function PDFPreviewModal({ contract, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!contract) return null;
  const typeMeta = TYPE_META[contract.contract_type] || TYPE_META.project;
  const pdfUrl = contract.pdf_url ? withAuthToken(contract.pdf_url) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(2,6,16,0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'pdf-modal-in 200ms ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 920, height: '85vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--r-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'var(--bg-1)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--r-sm)',
            background: typeMeta.bg, color: typeMeta.fg,
            border: `1px solid ${typeMeta.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={typeMeta.icon} size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {contract.contract_number && (
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', letterSpacing: '0.05em' }}>
                {contract.contract_number}
              </div>
            )}
            <div style={{
              fontFamily: 'var(--f-display)', fontSize: 16, color: 'var(--fg-0)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '-0.015em',
            }}>
              {typeMeta.label}{contract.project_title ? ` · ${contract.project_title}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <StatusBadge status={contract.status} compact />
            {contract.pdf_url && (
              <button className="btn btn-secondary btn-sm" onClick={() => downloadPdfBlob(contract)}>
                <Icon name="download" size={13} /> Descarcă
              </button>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Închide">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1f2e' }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Contract PDF"
              style={{ width: '100%', height: '100%', border: 0, background: '#1a1f2e' }}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--fg-3)', fontSize: 13,
            }}>
              PDF indisponibil pentru acest contract.
            </div>
          )}
        </div>

        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-1)',
          background: 'var(--bg-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: 12 }}>
            {(contract.party1_name || contract.party1_company) && (
              <span style={{ color: contract.party1_accepted ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Icon name={contract.party1_accepted ? 'check-circle' : 'clock'} size={12} />
                {contract.party1_name || contract.party1_company}
              </span>
            )}
            {(contract.party2_name || contract.party2_company) && (
              <span style={{ color: contract.party2_accepted ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Icon name={contract.party2_accepted ? 'check-circle' : 'clock'} size={12} />
                {contract.party2_name || contract.party2_company}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
            ESC: închide
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, suffix, accent }) {
  return (
    <div style={{
      padding: '0.5rem 0.875rem',
      borderRight: '1px solid var(--border-1)',
      display: 'flex', flexDirection: 'column', gap: 1,
      minWidth: 70,
    }}>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: accent, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}{suffix && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--fg-3)', marginLeft: 3, letterSpacing: '0.05em' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ContractsSummary({ contracts }) {
  const total = contracts.length;
  const pending = contracts.filter(c => c.status === 'pending').length;
  const signed = contracts.filter(c => ['accepted', 'completed'].includes(c.status)).length;
  const totalAmount = contracts.reduce((s, c) => s + (parseFloat(c.amount_ron) || 0), 0);
  return (
    <div style={{
      display: 'flex', gap: 0,
      border: '1px solid var(--border-1)',
      borderRadius: 'var(--r-md)',
      background: 'var(--bg-card)',
      overflow: 'hidden',
    }}>
      <SummaryCell label="Total" value={total} accent="var(--fg-0)" />
      <SummaryCell label="Semnate" value={signed} accent="var(--success)" />
      <SummaryCell label="Așteaptă" value={pending} accent="var(--warning)" />
      <SummaryCell
        label="Valoare"
        value={new Intl.NumberFormat('ro-RO', { notation: 'compact', maximumFractionDigits: 1 }).format(totalAmount)}
        suffix="RON" accent="var(--accent-hi)"
      />
    </div>
  );
}

function ContractsEmptyState({ hasFilters, onReset, navigate }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 1.5rem',
      background: 'var(--bg-card)',
      border: '1px dashed var(--border-2)',
      borderRadius: 'var(--r-lg)',
      maxWidth: 560, margin: '2rem auto 0',
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 1.25rem',
        borderRadius: 'var(--r-md)',
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-hi)',
        position: 'relative',
      }}>
        <Icon name="file-text" size={26} />
        {!hasFilters && (
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 22, height: 22, borderRadius: 6,
            background: 'var(--bg-0)', border: '1px solid var(--border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-3)',
          }}><Icon name="plus" size={12} /></div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.02em', marginBottom: '.5rem' }}>
        {hasFilters
          ? <>Niciun contract cu aceste <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>filtre</em>.</>
          : <>Niciun contract <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>încă</em>.</>
        }
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--fg-2)', maxWidth: 380, margin: '0 auto 1.5rem', lineHeight: 1.55 }}>
        {hasFilters
          ? 'Schimbă filtrele sau resetează-le pentru a vedea toate contractele tale.'
          : 'Contractele apar automat când demarezi un proiect și sunt semnate digital de ambele părți.'}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {hasFilters ? (
          <button className="btn btn-secondary" onClick={onReset}>
            <Icon name="x" size={13} /> Resetează filtre
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
            <Icon name="plus" size={13} /> Creează un proiect
          </button>
        )}
      </div>
    </div>
  );
}

export default function Contracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allList, setAllList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState('date-desc');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [pdfContract, setPdfContract] = useState(null);
  const [toast, setToast] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        if (isAdmin) {
          const r = await axios.get('/api/admin/contracts', { headers });
          const data = r.data;
          const projectList = (data.projectContracts || []);
          const tcList = (data.userContracts || []).map(uc => ({
            id: `uc_${uc.id}`,
            contract_type: 'terms_conditions',
            status: 'accepted',
            contract_number: uc.contract_type || 'T&C',
            project_title: null,
            party1_name: uc.user_name,
            party1_company: uc.user_email,
            party1_accepted: true,
            party1_accepted_at: uc.signed_at,
            created_at: uc.signed_at,
            amount_ron: null,
            pdf_url: null,
            project_id: null,
          }));
          setAllList([...projectList, ...tcList]);
        } else {
          const r = await axios.get('/api/contracts/mine', { headers });
          setAllList(r.data.contracts || []);
        }
      } catch {
        setError('Nu am putut încărca contractele.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filterType) next.set('type', filterType);
    if (filterStatus) next.set('status', filterStatus);
    if (search) next.set('q', search);
    setSearchParams(next, { replace: true });
  }, [filterType, filterStatus, search, setSearchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    let list = allList.filter(c => {
      if (filterType && c.contract_type !== filterType) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return [
          c.project_title, c.milestone_title, c.party1_name, c.party2_name,
          c.party1_company, c.party2_company, c.contract_number,
        ].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'amount-desc') return (parseFloat(b.amount_ron) || 0) - (parseFloat(a.amount_ron) || 0);
      if (sort === 'amount-asc') return (parseFloat(a.amount_ron) || 0) - (parseFloat(b.amount_ron) || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
  }, [allList, filterType, filterStatus, search, sort]);

  const counts = useMemo(() => {
    const c = { all: allList.length };
    ['project', 'milestone', 'final', 'terms_conditions'].forEach(t => {
      c[t] = allList.filter(x => x.contract_type === t).length;
    });
    return c;
  }, [allList]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(filtered.map(c => c.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Numărul contractului a fost copiat.');
    } catch {
      setToast('Nu s-a putut copia.');
    }
  };

  const hasFilters = filterType || filterStatus || search.trim();

  const tabs = [
    { id: '', label: 'Toate', count: counts.all },
    { id: 'project', label: 'Proiect', count: counts.project, type: 'project' },
    { id: 'milestone', label: 'Predare', count: counts.milestone, type: 'milestone' },
    { id: 'final', label: 'Final', count: counts.final, type: 'final' },
    ...(isAdmin && counts.terms_conditions > 0
      ? [{ id: 'terms_conditions', label: 'T&C', count: counts.terms_conditions, type: 'terms_conditions' }]
      : []),
  ];

  return (
    <div className="escro-page fade-up">
      <div className="page-head" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div className="h-eyebrow">
            <Icon name="file-text" size={11} /> Cont · Documente legale
          </div>
          <h1 className="h-title" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>
            {isAdmin ? <>Toate <em>contractele</em>.</> : <>Contractele <em>mele</em>.</>}
          </h1>
          <p className="h-sub">
            {isAdmin
              ? 'Toate contractele semnate pe platformă, cu detalii complete. Click pe un card pentru a vedea părțile, valorile și acțiunile.'
              : 'Toate contractele semnate prin ESCRO — proiect, predare-primire și finalizare. Click pe un card pentru detalii complete.'}
          </p>
        </div>
        <div className="page-actions">
          {!loading && <ContractsSummary contracts={allList} />}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-0)',
        borderBottom: '1px solid var(--border-1)',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
      }}>
        <div style={{
          display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <Icon name="search" size={13} style={{
              position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--fg-3)', pointerEvents: 'none',
            }} />
            <input
              className="input"
              style={{ paddingLeft: '2.15rem', height: 38, fontSize: 13 }}
              placeholder="Caută după număr, proiect sau parte…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="icon-btn"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 4, top: 4, width: 30, height: 30 }}
                aria-label="Șterge"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          <select
            className="input"
            style={{ height: 38, fontSize: 13, width: 'auto', minWidth: 170, flexShrink: 0 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Orice status</option>
            <option value="pending">⏳ În așteptare</option>
            <option value="accepted">✓ Semnat</option>
            <option value="completed">✓ Finalizat</option>
            <option value="rejected">✕ Respins</option>
          </select>

          <select
            className="input"
            style={{ height: 38, fontSize: 13, width: 'auto', minWidth: 150, flexShrink: 0 }}
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="date-desc">Cele mai noi</option>
            <option value="date-asc">Cele mai vechi</option>
            <option value="amount-desc">Valoare ↓</option>
            <option value="amount-asc">Valoare ↑</option>
          </select>

          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={expandAll} title="Extinde tot">
              <Icon name="chevron-down" size={12} /> Extinde tot
            </button>
            <button className="btn btn-ghost btn-sm" onClick={collapseAll} title="Restrânge tot">
              <Icon name="chevron-up" size={12} /> Restrânge
            </button>
          </div>
        </div>

        <div className="type-pills-scroll" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {tabs.map(t => {
            const isActive = filterType === t.id;
            const meta = t.type ? TYPE_META[t.type] : null;
            return (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  borderRadius: 100,
                  fontSize: 12.5, fontWeight: 600,
                  background: isActive ? (meta?.bg || 'var(--accent-bg)') : 'transparent',
                  color: isActive ? (meta?.fg || 'var(--accent-hi)') : 'var(--fg-2)',
                  border: `1px solid ${isActive ? (meta?.border || 'var(--accent-border)') : 'var(--border-2)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.005em',
                }}
              >
                {meta && <Icon name={meta.icon} size={11} />}
                {t.label}
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10,
                  padding: '0 5px', borderRadius: 4,
                  background: isActive ? 'rgba(255,255,255,0.10)' : 'var(--bg-2)',
                  color: 'inherit', opacity: 0.85,
                }}>{t.count}</span>
              </button>
            );
          })}

          {hasFilters && (
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); setSearch(''); }}
              style={{
                marginLeft: 'auto',
                fontSize: 11.5, color: 'var(--fg-3)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <Icon name="x" size={11} /> Resetează filtre
            </button>
          )}
        </div>

        {hasFilters && (
          <div style={{ display: 'flex', gap: 6, marginTop: '0.625rem', flexWrap: 'wrap' }}>
            {search && (
              <span className="filter-chip">
                <Icon name="search" size={10} />
                "{search}"
                <button onClick={() => setSearch('')} aria-label="Șterge"><Icon name="x" size={10} /></button>
              </span>
            )}
            {filterType && (
              <span className="filter-chip">
                Tip: {TYPE_META[filterType]?.short || filterType}
                <button onClick={() => setFilterType('')} aria-label="Șterge"><Icon name="x" size={10} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="filter-chip">
                Status: {STATUS_META[filterStatus]?.short || filterStatus}
                <button onClick={() => setFilterStatus('')} aria-label="Șterge"><Icon name="x" size={10} /></button>
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-3)', alignSelf: 'center', fontFamily: 'var(--f-mono)' }}>
              · {filtered.length} {filtered.length === 1 ? 'rezultat' : 'rezultate'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <ContractsEmptyState
          hasFilters={hasFilters}
          onReset={() => { setFilterType(''); setFilterStatus(''); setSearch(''); }}
          navigate={navigate}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => (
            <ContractCard
              key={c.id}
              c={c}
              allContracts={allList}
              expanded={expandedIds.has(c.id)}
              onToggle={() => toggleExpand(c.id)}
              onOpenPDF={setPdfContract}
              navigate={navigate}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      {pdfContract && (
        <PDFPreviewModal contract={pdfContract} onClose={() => setPdfContract(null)} />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--success-border)',
          borderRadius: 'var(--r-md)', padding: '.625rem 1rem',
          fontSize: 13, color: 'var(--fg-0)', zIndex: 800,
          display: 'flex', alignItems: 'center', gap: '.625rem',
          boxShadow: '0 10px 32px rgba(0,0,0,.35)',
        }}>
          <Icon name="check" size={13} style={{ color: 'var(--success)' }} />
          {toast}
        </div>
      )}
    </div>
  );
}
