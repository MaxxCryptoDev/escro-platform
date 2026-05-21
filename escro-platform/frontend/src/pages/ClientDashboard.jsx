import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Avatar, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { fmtRON, fmtDate, avatarColor } from '../utils/format';
import PostTaskModal from '../components/PostTaskModal';
import ReviewModal from '../components/ReviewModal';
import ActionBanner from '../components/ActionBanner';
import axios from 'axios';

const ACTION_META = {
  dispute: {
    priority: 1, tone: 'critical', icon: 'alert-triangle',
    title: (n) => n === 1 ? 'Ai o dispută activă' : `${n} dispute active`,
    cta: 'Vezi disputa',
  },
  funding: {
    priority: 2, tone: 'critical', icon: 'lock',
    title: (n) => n === 1 ? 'Continuă proiectul' : `${n} proiecte așteaptă atenție`,
    cta: 'Deschide proiectul',
  },
  task_approval: {
    priority: 3, tone: 'critical', icon: 'inbox',
    title: (n) => n === 1 ? 'Un task creat de admin așteaptă decizia ta' : `${n} taskuri create de admin așteaptă decizia ta`,
    cta: 'Aprobă pentru a căuta prestator',
  },
  approval: {
    priority: 3, tone: 'critical', icon: 'flag',
    title: (n) => n === 1 ? 'Un livrabil așteaptă decizia ta' : `${n} livrabile așteaptă decizia ta`,
    cta: 'Aprobă sau respinge',
  },
  contract: {
    priority: 4, tone: 'warning', icon: 'file-text',
    title: (n) => n === 1 ? 'Ai un contract de semnat' : `${n} contracte de semnat`,
    cta: 'Semnează',
  },
  modification: {
    priority: 5, tone: 'warning', icon: 'edit',
    title: (n) => n === 1 ? 'O modificare așteaptă decizia ta' : `${n} modificări de aprobat`,
    cta: 'Vezi modificarea',
  },
  delivery: {
    priority: 6, tone: 'info', icon: 'upload',
    title: (n) => n === 1 ? 'Ai un milestone de livrat' : `${n} milestone-uri de livrat`,
    cta: 'Livrează',
  },
  review: {
    priority: 7, tone: 'neutral', icon: 'star',
    title: (n) => n === 1 ? 'Recenzie de lăsat' : `${n} recenzii de lăsat`,
    cta: 'Lasă recenzie',
  },
  kyc: {
    priority: 8, tone: 'warning', icon: 'shield',
    title: () => 'Verifică-ți identitatea (KYC)',
    cta: 'Începe KYC',
  },
  kyc_pending: {
    priority: 9, tone: 'neutral', icon: 'clock',
    title: () => 'Verificare KYC în procesare',
    cta: null,
  },
  verification_call: {
    priority: 10, tone: 'neutral', icon: 'phone',
    title: () => 'Așteaptă apelul de verificare cu administratorul',
    cta: null,
  },
};

const TONE_STYLES = {
  critical: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)', dot: 'var(--warning)' },
  warning:  { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)', dot: 'var(--warning)' },
  info:     { bg: 'var(--accent-bg)',  border: 'var(--accent-border)',  color: 'var(--accent-hi)', dot: 'var(--accent)' },
  neutral:  { bg: 'var(--bg-2)',       border: 'var(--border-2)',       color: 'var(--fg-1)', dot: 'var(--fg-3)' },
};

// KYC progress banner — for individual it's 1 step (admin call), for company it's 3 steps
// (admin call → Stripe KYC → IBAN). Stays consistent with ExpertDashboard's KycBanner.
function KycBanner({ state, isIndividual, onboardingLoading, onStart }) {
  if (state === 'done') return null;

  const waitingForCall = state === 'awaiting_call';
  const ready = state === 'ready';
  const inProgress = state === 'in_progress';

  const bg = waitingForCall || inProgress ? 'var(--bg-1)' : 'var(--warning-bg)';
  const borderColor = waitingForCall || inProgress ? 'var(--border-1)' : 'var(--warning-border)';
  const iconName = waitingForCall ? 'phone' : (inProgress ? 'clock' : 'shield');
  const iconColor = waitingForCall || inProgress ? 'var(--fg-3)' : 'var(--warning)';
  const iconBg = waitingForCall || inProgress ? 'var(--border-2)' : '#f59e0b22';

  const title = waitingForCall
    ? 'Așteaptă apelul de verificare cu administratorul'
    : (inProgress ? 'Verificare KYC — în procesare' : 'Verifică-ți identitatea (KYC)');
  const description = isIndividual
    ? (waitingForCall
        ? 'După apelul de verificare cu adminul, plățile se fac direct cu cardul — fără Stripe onboarding suplimentar.'
        : 'Contul tău este verificat. Poți plăti direct cu cardul.')
    : (waitingForCall
        ? 'După apelul de verificare cu adminul, poți începe verificarea KYC: identitate, document, IBAN.'
        : (inProgress
            ? 'Verificarea ta este în procesare la Stripe. Vei fi notificat când e completă.'
            : 'Pornește verificarea KYC prin Stripe: identitate (CNP/CUI + document), apoi IBAN.'));

  const steps = isIndividual ? ['Apel admin'] : ['Apel admin', 'KYC Stripe', 'IBAN'];
  const stepStates = isIndividual
    ? (waitingForCall ? ['attention'] : ['done'])
    : (waitingForCall ? ['attention', 'pending', 'pending']
      : (ready ? ['done', 'active', 'pending']
        : (inProgress ? ['done', 'active', 'pending']
          : ['done', 'done', 'done'])));

  return (
    <div style={{
      marginBottom: '1.25rem', padding: '1rem 1.25rem',
      background: bg, border: `1px solid ${borderColor}`,
      borderRadius: 'var(--r-md)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: iconBg, border: `1px solid ${borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={iconName} size={16} style={{ color: iconColor }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{description}</div>
          </div>
        </div>
        {ready && !isIndividual && (
          <button
            className="btn btn-sm"
            style={{ whiteSpace: 'nowrap', gap: 6, background: 'var(--warning)', color: '#fff', border: 'none', flexShrink: 0 }}
            onClick={onStart}
            disabled={onboardingLoading}
          >
            {onboardingLoading ? <Spinner size={12} inline /> : <Icon name="shield" size={13} />}
            {onboardingLoading ? 'Se procesează...' : 'Începe verificarea KYC'}
          </button>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: '.875rem', paddingTop: '.875rem',
        borderTop: `1px dashed ${borderColor}`,
        flexWrap: 'wrap',
      }}>
        {steps.map((label, i) => {
          const st = stepStates[i];
          const stBg = st === 'done' ? 'var(--success-bg)'
            : st === 'active' ? 'var(--accent-bg)'
              : st === 'attention' ? 'var(--warning-bg)'
                : 'var(--bg-2)';
          const stColor = st === 'done' ? 'var(--success)'
            : st === 'active' ? 'var(--accent-hi)'
              : st === 'attention' ? 'var(--warning)'
                : 'var(--fg-4)';
          return (
            <Fragment key={i}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                background: stBg,
                color: stColor,
                borderRadius: 99,
                fontSize: 11,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '.02em',
                fontWeight: 600,
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  display: 'inline-grid', placeItems: 'center',
                  background: st === 'done' ? 'var(--success)' : st === 'active' ? 'var(--accent)' : st === 'attention' ? 'var(--warning)' : 'var(--border-2)',
                  color: '#fff',
                  fontSize: 8, fontWeight: 700,
                }}>
                  {st === 'done' ? <Icon name="check" size={7} /> : (i + 1)}
                </span>
                {label}
              </div>
              {i < steps.length - 1 && <Icon name="chevron-right" size={10} style={{ color: 'var(--fg-4)' }} />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ActionCenter({ actions, onAction }) {
  if (actions.length === 0) return null;
  const sorted = [...actions].sort((a, b) => ACTION_META[a.type].priority - ACTION_META[b.type].priority);
  const criticalCount = sorted.filter(a => ACTION_META[a.type].tone === 'critical').length;
  const hasCritical = criticalCount > 0;

  return (
    <div style={{
      marginBottom: '1.75rem',
      background: 'var(--bg-card)',
      border: `1px solid ${hasCritical ? 'var(--warning-border)' : 'var(--border-1)'}`,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {hasCritical && (
        <span style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--warning), transparent)',
          animation: 'shimmer 2.8s ease-in-out infinite',
        }} />
      )}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        background: hasCritical ? 'linear-gradient(180deg, var(--warning-bg), transparent)' : 'var(--bg-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasCritical
            ? <span className="urgent-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} />
            : <Icon name="inbox" size={14} style={{ color: 'var(--fg-2)' }} />
          }
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Centru de acțiuni
          </div>
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: 10.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 100,
            background: hasCritical ? 'var(--warning)' : 'var(--border-2)',
            color: hasCritical ? '#fff' : 'var(--fg-2)',
            letterSpacing: '0.04em',
          }}>{sorted.length} {sorted.length === 1 ? 'acțiune' : 'acțiuni'}</span>
        </div>
        {hasCritical && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>
            decizie urgentă
          </span>
        )}
      </div>
      <div>
        {sorted.map((a, i) => <ActionRow key={a.type + i} action={a} isLast={i === sorted.length - 1} onAction={onAction} />)}
      </div>
    </div>
  );
}

function ActionRow({ action, isLast, onAction }) {
  const meta = ACTION_META[action.type];
  const tone = TONE_STYLES[meta.tone];
  const count = action.items?.length || 0;
  const previewNames = (action.items || []).slice(0, 2).map(i => i.title || i.name).filter(Boolean);
  const moreCount = Math.max(0, count - 2);

  return (
    <div
      onClick={() => onAction && onAction(action)}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '0.875rem',
        alignItems: 'center',
        padding: '0.875rem 1.25rem',
        borderBottom: isLast ? 'none' : '1px solid var(--border-1)',
        cursor: meta.cta ? 'pointer' : 'default',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (meta.cta) e.currentTarget.style.background = 'var(--bg-1)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: tone.bg, border: `1px solid ${tone.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tone.color, flexShrink: 0,
      }}>
        <Icon name={meta.icon} size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--fg-0)', marginBottom: 2 }}>
          {meta.title(count)}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--fg-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {action.description || (previewNames.length
            ? `${previewNames.join(' · ')}${moreCount ? ` · +${moreCount} încă` : ''}`
            : '—')}
        </div>
      </div>
      {meta.cta && (
        <button
          className="btn btn-sm"
          style={{
            background: meta.tone === 'critical' || meta.tone === 'warning' ? 'var(--warning)' : 'var(--accent)',
            color: '#fff', border: 'none', flexShrink: 0,
          }}
          onClick={e => { e.stopPropagation(); onAction && onAction(action); }}
        >
          {meta.cta} <Icon name="arrow-right" size={11} />
        </button>
      )}
    </div>
  );
}

function PipelineRow({ color, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, background: color, borderRadius: 2, flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'var(--fg-1)' }}>{value}</span>
    </div>
  );
}

function WalletHero({ totalEscrow, totalReleased, projects, role, onWallet }) {
  const activeCount = projects.filter(p => ['active', 'in_progress', 'assigned', 'review'].includes(p.status)).length;
  const reviewCount = projects.filter(p => p.status === 'review' || p.status === 'pending_client_approval').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const escrowTotal = totalEscrow + totalReleased;
  const releasedPct = escrowTotal > 0 ? (totalReleased / escrowTotal) * 100 : 0;

  return (
    <div className="vault" style={{ marginBottom: '2rem' }}>
      <div className="vault-content" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
        gap: '2rem', alignItems: 'stretch',
      }}>
        <div style={{ minWidth: 0 }}>
          <div className="h-eyebrow" style={{ marginBottom: '1rem' }}>
            <Icon name="lock" size={11} /> Escrow vault · În custodie
          </div>
          <div className="vault-num">
            <em>{Math.round(escrowTotal).toLocaleString('ro-RO')}</em>
            <span className="vault-cur">RON</span>
          </div>
          <p style={{ marginTop: '0.875rem', maxWidth: '52ch', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
            Fonduri blocate în escrow și debursate exclusiv la confirmarea milestone-urilor.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            marginTop: '1.5rem',
          }}>
            <div style={{
              padding: '1rem 1.125rem',
              background: 'var(--bg-1)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-md)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--warning)',
              }}>
                <Icon name="lock" size={13} />
              </div>
              <div className="h-eyebrow" style={{ marginBottom: 6, fontSize: 9.5 }}>În escrow</div>
              <div style={{
                fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1,
                color: 'var(--fg-0)', letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {Math.round(totalEscrow).toLocaleString('ro-RO')}
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)', marginTop: 4, letterSpacing: '0.05em' }}>
                RON · neaprobat
              </div>
            </div>

            <div style={{
              padding: '1rem 1.125rem',
              background: 'var(--bg-1)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--r-md)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--success)',
              }}>
                <Icon name="check" size={14} />
              </div>
              <div className="h-eyebrow" style={{ marginBottom: 6, fontSize: 9.5 }}>Total cheltuit</div>
              <div style={{
                fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1,
                color: 'var(--fg-0)', letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {Math.round(totalReleased).toLocaleString('ro-RO')}
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-3)', marginTop: 4, letterSpacing: '0.05em' }}>
                RON · debursat experților
              </div>
            </div>
          </div>

          {role === 'company' && (
            <div style={{ marginTop: '1.25rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={onWallet} style={{ gap: 6 }}>
                <Icon name="credit-card" size={12} /> Portofel & retrageri
              </button>
            </div>
          )}
        </div>

        <div style={{
          padding: '1.25rem 1.25rem',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--r-md)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '0.75rem' }}>Pipeline · pe stadiu</div>
            <div className="bar-stack" style={{ marginBottom: '1rem', height: 8 }}>
              {activeCount > 0 && <div style={{ flex: activeCount, background: 'var(--accent)' }} />}
              {reviewCount > 0 && <div style={{ flex: reviewCount, background: 'var(--warning)' }} />}
              {completedCount > 0 && <div style={{ flex: completedCount, background: 'var(--success)' }} />}
              {(activeCount + reviewCount + completedCount) === 0 && (
                <div style={{ flex: 1, background: 'var(--border-2)' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--fg-1)' }}>
              <PipelineRow color="var(--accent)" label="În progres" value={activeCount} />
              <PipelineRow color="var(--warning)" label="Așteaptă aprobare" value={reviewCount} />
              <PipelineRow color="var(--success)" label="Finalizate" value={completedCount} />
            </div>
          </div>
          <div style={{
            marginTop: '1.25rem', paddingTop: '0.875rem',
            borderTop: '1px solid var(--border-1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Rata debursare
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--success)', letterSpacing: '-0.01em' }}>
              {Math.round(releasedPct)}<span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 2 }}>%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p, userId, onClick }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isClient = String(p.client_id) === String(userId);
  const isPrestator = String(p.expert_id) === String(userId) || String(p.company_id) === String(userId);
  const isCreator = isClient || String(p.company_id) === String(userId);
  const partnerName = isCreator
    ? (p.expert_name || p.company_name || p.assigned_expert_name || null)
    : (p.client_name || null);

  // Per-role actions: only show what the current user can actually act on.
  // Aprobare milestone = doar beneficiar; Livrare = doar prestator; Contract = backend deja
  // filtrează pe pending_contracts_for_me; status badges generic vizibile la toți.
  const nextAction = (() => {
    if (parseInt(p.pending_approvals) > 0 && isClient) return { label: 'Aprobă milestone', tone: 'critical', icon: 'check' };
    if (parseInt(p.pending_contracts_for_me) > 0) return { label: 'Semnează contract', tone: 'warning', icon: 'edit' };
    if (parseInt(p.pending_deliveries) > 0 && isPrestator) return { label: 'Livrează milestone', tone: 'info', icon: 'upload' };
    if (p.status === 'open') return { label: 'Așteaptă prestator', tone: 'neutral', icon: 'clock' };
    if (p.status === 'pending_admin_approval') return { label: 'La admin', tone: 'neutral', icon: 'clock' };
    if (p.status === 'completed') return { label: 'Finalizat', tone: 'done', icon: 'check-circle' };
    return null;
  })();

  const toneMap = {
    critical: { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
    warning:  { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
    info:     { bg: 'var(--accent-bg)',  color: 'var(--accent-hi)', border: 'var(--accent-border)' },
    neutral:  { bg: 'var(--bg-2)',       color: 'var(--fg-2)',  border: 'var(--border-2)' },
    done:     { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
  };
  const tone = nextAction ? toneMap[nextAction.tone] : null;
  const idStr = p.id ? String(p.id).replace(/\D/g, '').slice(0, 4).padStart(4, '0') : '0000';

  return (
    <div className="proj" onClick={onClick}>
      {nextAction && (nextAction.tone === 'critical' || nextAction.tone === 'warning' || nextAction.tone === 'info') && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 9px', borderRadius: 100,
          background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
          fontSize: 11, fontWeight: 700, marginBottom: '0.75rem',
          letterSpacing: '0.02em',
        }}>
          <Icon name={nextAction.icon} size={11} />
          {nextAction.label}
        </div>
      )}

      <div className="proj-h">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="proj-id">ESC-{idStr}</div>
          <div className="proj-t" style={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{p.title}</div>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="proj-d">{p.description || p.brief || 'Proiect în desfășurare.'}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--fg-2)', minWidth: 0 }}>
          {partnerName ? (
            <>
              <Avatar user={{ name: partnerName, color: avatarColor('expert') }} size="sm" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partnerName}</span>
            </>
          ) : (
            <span style={{ color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="search" size={12} /> Fără partener
            </span>
          )}
        </div>
        {p.milestones_total != null && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            {p.milestones_done || 0}/{p.milestones_total} ms
          </span>
        )}
      </div>

      <div className="bar"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>

      <div className="proj-foot">
        <div className="proj-amt">
          <em>{Math.round(budget).toLocaleString('ro-RO')}</em>
          <span className="proj-cur">RON</span>
        </div>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)' }}>
          {progress}% · {fmtDate(p.deadline || p.created_at)}
        </span>
      </div>
    </div>
  );
}

function PmGroupCard({ pm, subTasks, onClick, onSubClick }) {
  const budget = parseFloat(pm.budget_ron) || 0;
  const completed = subTasks.filter(st => st.status === 'completed').length;
  const idStr = pm.id ? String(pm.id).replace(/\D/g, '').slice(0, 4).padStart(4, '0') : '0000';

  return (
    <div className="proj" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10.5, fontFamily: 'var(--f-mono)', fontWeight: 600,
        color: 'var(--accent-hi)', background: 'var(--accent-bg)',
        border: '1px solid var(--accent-border)', borderRadius: 4,
        padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 10,
      }}>
        <Icon name="layers" size={10} /> Proiect PM · {subTasks.length} task{subTasks.length === 1 ? '' : 'uri'}
        {pm.synthetic && (
          <span style={{ marginLeft: 8, color: 'var(--fg-3)', fontWeight: 500 }}>
            · context client
          </span>
        )}
      </div>

      <div className="proj-h">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="proj-id">PM-{idStr}</div>
          <div className="proj-t" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {pm.title}
          </div>
        </div>
        <StatusBadge status={pm.status} />
      </div>

      <div className="proj-d">{pm.description || pm.brief || 'Proiect Project Management.'}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subTasks.length > 0 ? 12 : 0 }}>
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          {completed}/{subTasks.length} task{subTasks.length === 1 ? '' : '-uri'} finalizate
        </span>
        <div className="proj-amt">
          <em>{Math.round(budget).toLocaleString('ro-RO')}</em>
          <span className="proj-cur">RON</span>
        </div>
      </div>

      {subTasks.length > 0 && (
        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-1)',
          borderRadius: 'var(--r-sm)',
          padding: '0.5rem 0.75rem',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Task-uri în proiect
          </div>
          {subTasks.map((st, i) => {
            const partner = st.expert_name || st.company_name || st.assigned_expert_name;
            return (
              <div
                key={st.id}
                onClick={(e) => { e.stopPropagation(); onSubClick?.(st); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 8, padding: '6px 0',
                  borderTop: i > 0 ? '1px solid var(--border-1)' : 'none',
                  cursor: 'pointer', fontSize: 12.5,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <Icon name="flag" size={11} style={{ color: 'var(--accent-hi)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-1)', fontWeight: 500 }}>
                    {st.title || `Task ${i + 1}`}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {partner && (
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Avatar user={{ name: partner, color: avatarColor('expert') }} size="sm" />
                      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner}</span>
                    </span>
                  )}
                  <StatusBadge status={st.status} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-2)', minWidth: 70, textAlign: 'right' }}>
                    {fmtRON(st.budget_ron)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingApprovalCard({ assignment, onApprove, onReject, onOpen }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const idStr = assignment.id ? String(assignment.id).replace(/\D/g, '').slice(0, 4).padStart(4, '0') : '0000';

  return (
    <div className="card" style={{ borderColor: 'var(--warning-border)' }}>
      <div className="card-body" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10.5, fontFamily: 'var(--f-mono)', fontWeight: 700,
                background: 'var(--warning-bg)', color: 'var(--warning)',
                padding: '2px 8px', borderRadius: 4, border: '1px solid var(--warning-border)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Decizie necesară
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)' }}>
                ESC-{idStr}
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--fg-0)',
              letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6,
            }}>{assignment.title}</div>
            {assignment.description && (
              <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, maxWidth: '55ch' }}>
                {assignment.description.length > 180 ? assignment.description.slice(0, 180) + '…' : assignment.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: 12, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
              {assignment.budget_ron && (
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--success)' }}>
                  {Math.round(assignment.budget_ron).toLocaleString('ro-RO')} RON
                </span>
              )}
              {assignment.timeline_days && <span>{assignment.timeline_days} zile</span>}
              {(assignment.expert_name || assignment.company_name) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Avatar user={{ name: assignment.expert_name || assignment.company_name, color: avatarColor('expert') }} size="sm" />
                  {assignment.expert_name || assignment.company_name}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexDirection: 'column', minWidth: 160 }}>
            <button
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => act(onApprove)}
              style={{ fontWeight: 700 }}
            >
              <Icon name="check" size={13} /> Aprobă
            </button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() => act(onReject)}
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
            >
              <Icon name="x" size={13} /> Respinge
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onOpen}>
              Vezi detalii <Icon name="arrow-right" size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_META = {
  milestone_delivered: { icon: 'upload',        color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a livrat milestone-ul' },
  milestone_approved:  { icon: 'check',         color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat milestone-ul' },
  funds_released:      { icon: 'trending-up',   color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a eliberat fondurile' },
  escrow_deposit:      { icon: 'lock',          color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow' },
  escrow_funded:       { icon: 'lock',          color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow pentru' },
  project_completed:   { icon: 'flag',          color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a finalizat proiectul' },
  message_sent:        { icon: 'message',       color: 'var(--fg-2)',      bg: 'var(--border-1)',   label: 'a trimis un mesaj pe' },
  project_created:     { icon: 'plus',          color: 'var(--fg-2)',      bg: 'var(--border-1)',   label: 'Proiect nou creat:' },
  expert_assigned:     { icon: 'user-check',    color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  company_assigned:    { icon: 'building',      color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a asignat compania pe' },
  task_assigned:       { icon: 'briefcase',     color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a asignat pe' },
  project_approved:    { icon: 'check',         color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat proiectul' },
  project_rejected:    { icon: 'x',             color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a respins proiectul' },
  account_approved:    { icon: 'shield',        color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat contul tău' },
  account_rejected:    { icon: 'x',             color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a respins contul tău' },
  contract_ready:      { icon: 'file-text',     color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'Contract de semnat pe' },
  contract_signed:     { icon: 'check-circle',  color: 'var(--success)',   bg: 'var(--success-bg)', label: 'Contract semnat pe' },
  task_acceptance_required: { icon: 'briefcase', color: 'var(--accent-hi)', bg: 'var(--accent-bg)', label: 'te-a invitat pe' },
  task_approval_required:   { icon: 'flag',     color: 'var(--warning)',    bg: 'var(--warning-bg)', label: 'Task de aprobat pe' },
  modification_proposed: { icon: 'edit',        color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a propus modificări pe' },
  dispute_resolved:      { icon: 'shield',      color: 'var(--success)',   bg: 'var(--success-bg)', label: 'Dispută rezolvată pe' },
  milestone_disputed:    { icon: 'alert-triangle', color: 'var(--danger)', bg: 'var(--danger-bg)',  label: 'a deschis o dispută pe' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days}z`;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function ActivityPanel({ activity, navigate }) {
  return (
    <div className="card">
      <div style={{ padding: '0.25rem 0' }}>
        {activity.length === 0 ? (
          <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
            Nicio activitate recentă
          </div>
        ) : activity.slice(0, 8).map((ev, i) => {
          const meta = ACTIVITY_META[ev.event_type] || ACTIVITY_META.project_created;
          const isLast = i === Math.min(activity.length, 8) - 1;
          const clickable = !!ev.project_id;
          return (
            <div
              key={i}
              onClick={() => {
                if (!ev.project_id) return;
                if (ev.task_id) navigate(`/project/${ev.task_id}/assignment/${ev.project_id}`);
                else navigate(`/project/${ev.project_id}`);
              }}
              className="activity-row"
              style={{
                borderBottom: isLast ? 'none' : '1px solid var(--border-1)',
                padding: '0.75rem 1.125rem',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: meta.color, flexShrink: 0,
              }}>
                <Icon name={meta.icon} size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>
                  {ev.actor_name && <b style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{ev.actor_name} </b>}
                  <span style={{ color: 'var(--fg-2)' }}>{meta.label}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.milestone_title ? `${ev.milestone_title} · ` : ''}{ev.project_title}
                  {ev.amount ? ` · ${parseFloat(ev.amount).toLocaleString('ro-RO')} RON` : ''}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>
                {timeAgo(ev.event_time)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card-foot">
        <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Ultimele 24 ore</span>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPropuneTask, setShowPropuneTask] = useState(false);
  const [trustProfile, setTrustProfile] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'overview');
  }, [searchParams]);

  const setTab = useCallback((id) => {
    setActiveTab(id);
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('tab'); else next.set('tab', id);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchProjects = useCallback(async () => {
    try {
      const requests = [
        axios.get('/api/projects', { headers }),
        axios.get('/api/activity', { headers }).catch(() => ({ data: { activity: [] } })),
      ];
      if (user?.role && user.role !== 'admin') {
        requests.push(axios.get('/api/trust-profiles/my-trust-profile', { headers }).catch(() => ({ data: null })));
        requests.push(axios.get('/api/stripe/status', { headers }).catch(() => ({ data: null })));
      }
      const [projRes, actRes, trustRes, stripeRes] = await Promise.all(requests);
      setProjects(projRes.data.projects || projRes.data || []);
      setActivity(actRes.data.activity || []);
      if (trustRes) setTrustProfile(trustRes.data?.trust_profile || trustRes.data || null);
      if (stripeRes) setStripeStatus(stripeRes.data?.stripe || null);
    } catch {
      setError('Nu s-au putut încărca proiectele.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, headers]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    axios.get('/api/reviews/pending', { headers })
      .then(r => setPendingReviews(r.data.pending_reviews || []))
      .catch(() => {});
  }, [headers]);

  useEffect(() => {
    axios.get('/api/disputes', { headers })
      .then(r => setDisputes((r.data.disputes || []).filter(d => ['open', 'pending'].includes(d.status))))
      .catch(() => {});
  }, [headers]);

  const isIndividual = user?.role === 'individual';
  const isCompany = user?.role === 'company';
  const accountVerified = !!user?.verification_date;
  const kycVerified = user?.kyc_status === 'verified';
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'utilizator';
  const companyName = user?.company || null;

  const stripeConnected = !!stripeStatus?.onboarding_complete;
  const stripePending = stripeStatus?.account_id === 'pending_stripe_integration';
  const hasVerificationCall = !!trustProfile?.has_verification_call;

  // KYC progress state for the banner. Individual: only the admin call matters (no Stripe).
  // Company: admin call → Stripe onboarding → IBAN.
  // For individual we gate on `has_verification_call` (trust profile flag set when admin
  // marks the call as completed), NOT on `verification_date` — the user can be "approved"
  // by admin while the actual identity call is still pending.
  const kycState = isIndividual
    ? (hasVerificationCall ? 'done' : 'awaiting_call')
    : (stripeConnected ? 'done'
        : (!hasVerificationCall ? 'awaiting_call'
            : (stripePending ? 'in_progress' : 'ready')));

  const handleStripeOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const res = await axios.post('/api/stripe/onboarding', {}, { headers });
      if (res.data.onboarding_url && !res.data.mock) {
        window.location.assign(res.data.onboarding_url);
        return;
      }
      setStripeStatus(s => ({ ...s, account_id: 'pending_stripe_integration' }));
    } catch (e) {
      setError(e.response?.data?.error || 'A apărut o eroare. Încearcă din nou.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Dashboard "Proiecte & Taskuri" bucket: all non-marketplace items (global ecosystem view).
  // `myProjects` here used to be party-scoped; now it's the full dashboard list — any
  // authenticated user sees any non-pending project. The action panels (pendingApprovals,
  // contractSign, pendingDelivery, pendingMilestoneApproval) further filter to user-specific
  // items so each user still sees only their own actionable work.
  const myProjects = useMemo(() => projects.filter(p =>
    !p.is_marketplace &&
    p.status !== 'pending_assignment'
  ), [projects]);

  // Only the actual client (PM owner) needs to act on these. These tasks now live on the
  // Marketplace bucket (is_marketplace=true) too, but the client still needs a notification
  // here — they're the one who must approve, no matter where the task is filed.
  const pendingApprovals = useMemo(() =>
    projects.filter(p => p.status === 'pending_client_approval' &&
      String(p.client_id) === String(user?.id)),
    [projects, user?.id]
  );
  const contractSign = useMemo(() =>
    myProjects.filter(p => parseInt(p.pending_contracts_for_me) > 0),
    [myProjects]
  );
  const pendingDelivery = useMemo(() =>
    myProjects.filter(p =>
      parseInt(p.pending_deliveries) > 0 &&
      (String(p.expert_id) === String(user?.id) || String(p.company_id) === String(user?.id))
    ),
    [myProjects, user?.id]
  );
  const pendingMilestoneApproval = useMemo(() =>
    myProjects.filter(p =>
      parseInt(p.pending_approvals) > 0 &&
      String(p.client_id) === String(user?.id)
    ),
    [myProjects, user?.id]
  );
  // Project assigned but escrow not yet funded — only the client/poster needs to act here.
  const pendingFunding = useMemo(() =>
    myProjects.filter(p =>
      p.status === 'assigned' &&
      String(p.client_id) === String(user?.id) &&
      (parseFloat(p.escrow_amount) || 0) < (parseFloat(p.budget_ron) || 0)
    ),
    [myProjects, user?.id]
  );
  const pendingModifications = useMemo(() =>
    myProjects.filter(p => parseInt(p.pending_modifications_for_me) > 0),
    [myProjects]
  );

  // Party-scoped slice for the Overview tab — "Proiecte active" and financial totals show only
  // projects the user is actually involved in (client, expert, company, or poster).
  const ownProjects = useMemo(() => myProjects.filter(p =>
    String(p.client_id) === String(user?.id) ||
    String(p.expert_id) === String(user?.id) ||
    String(p.company_id) === String(user?.id) ||
    String(p.posted_by_client) === String(user?.id) ||
    String(p.posted_by_expert) === String(user?.id)
  ), [myProjects, user?.id]);
  const totalEscrow = ownProjects.reduce((s, p) => s + (parseFloat(p.escrow_amount) || 0), 0);
  const totalReleased = ownProjects.reduce((s, p) => s + (parseFloat(p.released_amount) || 0), 0);
  const ACTIVE_STATUSES = ['active', 'in_progress', 'assigned', 'pending_client_approval', 'pending_expert_approval', 'pending_admin_approval', 'open', 'review'];
  const activeCount = ownProjects.filter(p => ACTIVE_STATUSES.includes(p.status)).length;

  const actions = useMemo(() => {
    const list = [];
    if (disputes.length > 0) {
      list.push({
        type: 'dispute',
        items: disputes.map(d => ({ title: d.project_title, id: d.project_id, dispute_id: d.id })),
      });
    }
    if (pendingFunding.length > 0) {
      const single = pendingFunding.length === 1;
      list.push({
        type: 'funding',
        items: pendingFunding.map(p => ({ title: p.title, id: p.id })),
        description: single
          ? `"${pendingFunding[0].title}" este în progres — semnează contractul de proiect, apoi finanțează prima etapă.`
          : `${pendingFunding.length} taskuri sunt în progres — semnează contractele și finanțează prima etapă a fiecăruia.`,
      });
    }
    if (pendingApprovals.length > 0) {
      const single = pendingApprovals.length === 1;
      list.push({
        type: 'task_approval',
        items: pendingApprovals.map(p => ({ title: p.title, id: p.id })),
        description: single
          ? `"${pendingApprovals[0].title}" — aprobă pentru a căuta prestator.`
          : pendingApprovals.map(p => p.title).slice(0, 2).join(' · '),
      });
    }
    if (pendingMilestoneApproval.length > 0) {
      list.push({
        type: 'approval',
        items: pendingMilestoneApproval.map(p => ({ title: p.title, id: p.id })),
        description: pendingMilestoneApproval.map(p => p.title).slice(0, 2).join(' · '),
      });
    }
    if (contractSign.length > 0) {
      list.push({ type: 'contract', items: contractSign.map(p => ({ title: p.title, id: p.id })) });
    }
    if (pendingModifications.length > 0) {
      list.push({ type: 'modification', items: pendingModifications.map(p => ({ title: p.title, id: p.id })) });
    }
    if (pendingDelivery.length > 0) {
      list.push({ type: 'delivery', items: pendingDelivery.map(p => ({ title: p.title, id: p.id })) });
    }
    // Pending reviews are rendered by <ActionBanner> at the top of the overview instead
    // of an ActionCenter row — banner is more prominent and matches the AssignmentDetail style.
    // KYC/verification chain is rendered by <KycBanner> at the top of the overview now,
    // not as an ActionCenter row.
    return list;
  }, [
    disputes, pendingFunding, pendingApprovals, pendingMilestoneApproval,
    contractSign, pendingModifications, pendingDelivery, pendingReviews,
  ]);

  const handleAction = async (a) => {
    if (a.type === 'task_approval') {
      setTab('approvals');
    } else if (a.type === 'approval') {
      // Milestone deliverable approval — route to first project's contracts tab
      if (pendingMilestoneApproval.length > 0) navigate(`/project/${pendingMilestoneApproval[0].id}?tab=contracts`);
    } else if (a.type === 'contract') {
      if (contractSign.length === 1) navigate(`/project/${contractSign[0].id}?tab=contracts`);
      else setTab('lucrari');
    } else if (a.type === 'delivery') {
      if (pendingDelivery.length === 1) navigate(`/project/${pendingDelivery[0].id}?tab=contracts`);
      else setTab('lucrari');
    } else if (a.type === 'review') {
      const first = pendingReviews[0];
      if (first) navigate(`/project/${first.project_id}?tab=contracts`);
    } else if (a.type === 'dispute') {
      if (disputes.length === 1) navigate(`/project/${disputes[0].project_id}?tab=contracts`);
      else navigate('/disputes');
    } else if (a.type === 'funding') {
      // Don't auto-route to /escrow/<id>/checkout (would fund whole budget).
      // Project detail shows correct context: contract signing first, then per-milestone funding.
      if (pendingFunding.length === 1) navigate(`/project/${pendingFunding[0].id}`);
      else setTab('lucrari');
    } else if (a.type === 'modification') {
      if (pendingModifications.length === 1) navigate(`/project/${pendingModifications[0].id}?tab=contracts`);
      else setTab('lucrari');
    }
  };

  const handleApproveAssignment = async (p) => {
    await axios.put(`/api/tasks/${p.task_id}/assignments/${p.id}/client-approve`, {}, { headers });
    fetchProjects();
  };
  const handleRejectAssignment = async (p) => {
    if (!window.confirm('Respingi acest task?')) return;
    await axios.put(`/api/tasks/${p.task_id}/assignments/${p.id}/client-reject`, {}, { headers });
    fetchProjects();
  };

  const tabs = [
    { id: 'overview', label: 'Acasă', icon: 'home' },
    { id: 'lucrari', label: 'Proiecte & Taskuri', icon: 'folder', count: myProjects.length || undefined },
    ...(pendingApprovals.length > 0 ? [{ id: 'approvals', label: 'De aprobat', icon: 'flag', count: pendingApprovals.length, urgent: true }] : []),
  ];

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return myProjects;
    if (statusFilter === 'active') return myProjects.filter(p => ['active', 'in_progress', 'assigned'].includes(p.status));
    if (statusFilter === 'review') return myProjects.filter(p => p.status === 'review' || parseInt(p.pending_approvals) > 0);
    if (statusFilter === 'completed') return myProjects.filter(p => p.status === 'completed');
    if (statusFilter === 'waiting') return myProjects.filter(p => ['open', 'pending_admin_approval', 'pending_client_approval', 'pending_expert_approval'].includes(p.status));
    return myProjects;
  }, [myProjects, statusFilter]);

  // Group projects: PM tasks gather their sub-tasks; standalone shows individually.
  // Sub-tasks whose parent PM is NOT in myProjects (e.g., user is only prestator on a
  // sub-task created by admin on behalf of another client) get a synthetic parent card
  // built from the task_title/task_budget/etc. fields the backend joins from `tasks`.
  // Build from full `myProjects` so sub-tasks always nest under their PM regardless of
  // statusFilter; apply the filter to whole groups (group passes if PM OR any sub-task
  // matches), so e.g. an in_progress PM still shows its completed sub-tasks.
  const groupedLucrari = useMemo(() => {
    const pmMap = new Map();
    const standalone = [];
    myProjects.forEach(p => {
      if (p.is_pm_task || p.assignment_type === 'pm_task') {
        pmMap.set(p.id, { ...p, sub_tasks: [], synthetic: false });
      }
    });
    myProjects.forEach(p => {
      const isSubTask = p.task_id && p.assignment_type === 'task_assignment';
      if (isSubTask) {
        if (!pmMap.has(p.task_id)) {
          pmMap.set(p.task_id, {
            id: p.task_id,
            title: p.task_title || 'Proiect PM',
            description: p.task_description || '',
            budget_ron: parseFloat(p.task_budget) || 0,
            timeline_days: p.task_timeline,
            status: 'in_progress',
            is_pm_task: true,
            assignment_type: 'pm_task',
            client_id: p.client_id,
            client_name: p.client_name,
            synthetic: true,
            sub_tasks: [],
          });
        }
        pmMap.get(p.task_id).sub_tasks.push(p);
      } else if (!(p.is_pm_task || p.assignment_type === 'pm_task')) {
        standalone.push(p);
      }
    });

    // PMs whose sub-tasks are ALL in pending_assignment (no prestator yet) belong on the
    // Marketplace only — not on "Proiecte & Taskuri". A PM appears here only after at least
    // one of its sub-tasks has been assigned to a prestator (i.e., shows up in `sub_tasks`,
    // since pending_assignment items are excluded from `myProjects`).
    let pmGroups = [...pmMap.values()].filter(g => g.sub_tasks.length > 0);
    let filteredStandalone = standalone;
    if (statusFilter !== 'all') {
      const matches = (p) => {
        if (statusFilter === 'active') return ['active', 'in_progress', 'assigned'].includes(p.status);
        if (statusFilter === 'review') return p.status === 'review' || parseInt(p.pending_approvals) > 0;
        if (statusFilter === 'completed') return p.status === 'completed';
        if (statusFilter === 'waiting') return ['open', 'pending_admin_approval', 'pending_client_approval', 'pending_expert_approval'].includes(p.status);
        return true;
      };
      pmGroups = pmGroups.filter(g => matches(g) || g.sub_tasks.some(matches));
      filteredStandalone = filteredStandalone.filter(matches);
    }
    return { pmGroups, standalone: filteredStandalone };
  }, [myProjects, statusFilter]);

  if (loading) return <div className="escro-page"><Spinner /></div>;

  return (
    <div className="escro-page fade-up">
      <style>{`
        @keyframes urgent-soft-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .35); }
          50%      { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        .urgent-pulse { animation: urgent-soft-pulse 2.4s ease-in-out infinite; }
        @keyframes shimmer {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
        @media (max-width: 900px) {
          .dash-2col { grid-template-columns: 1fr !important; }
          .vault-content { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .dash-projects { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-head" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div className="h-eyebrow">
            <Icon name={isIndividual ? 'user' : 'building'} size={11} />
            Dashboard · {isIndividual ? 'Persoană fizică' : 'Companie'}
            {isCompany && companyName && (
              <span style={{ color: 'var(--fg-4)', marginLeft: 6 }}>· {companyName}</span>
            )}
          </div>
          <h1 className="h-title">
            {pendingApprovals.length > 0
              ? <>{pendingApprovals.length} {pendingApprovals.length === 1 ? 'livrabil așteaptă' : 'livrabile așteaptă'} <em>decizia ta</em>.</>
              : <>Bună, <em>{firstName}</em>.</>
            }
          </h1>
          <p className="h-sub">
            {totalEscrow + totalReleased > 0
              ? `${fmtRON(totalEscrow + totalReleased)} total prin escrow · ${activeCount} ${activeCount === 1 ? 'proiect activ' : 'proiecte active'}.`
              : `Bine ai venit pe platforma Escro.`
            }
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${accountVerified ? 'badge-green' : 'badge-amber'} no-dot`}>
            <Icon name={accountVerified ? 'check' : 'clock'} size={10} />
            {accountVerified ? 'Cont verificat' : 'Cont neverificat'}
          </span>
          {!isIndividual && (
            <span className={`badge ${kycVerified ? 'badge-green' : 'badge-amber'} no-dot`}>
              <Icon name={kycVerified ? 'check' : 'alert-triangle'} size={10} />
              {kycVerified ? 'KYC verificat' : 'KYC neverificat'}
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/directory')}>
            <Icon name="users" size={14} /> Experți
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
            <Icon name="plus" size={14} /> Proiect nou
          </button>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '0.625rem 1rem', fontSize: 13, fontWeight: 500,
                color: activeTab === t.id ? 'var(--fg-0)' : 'var(--fg-2)',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                marginBottom: -1, transition: 'all .15s',
              }}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {t.count != null && (
                <span style={{
                  fontSize: 10.5, fontFamily: 'var(--f-mono)',
                  color: t.urgent ? '#fff' : 'var(--fg-3)',
                  background: t.urgent ? 'var(--warning)' : 'var(--border-1)',
                  fontWeight: t.urgent ? 700 : 500,
                  padding: '1px 6px', borderRadius: t.urgent ? 9 : 3,
                  minWidth: t.urgent ? 16 : undefined, textAlign: 'center',
                }}>{t.count}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>{error}</div>}

      {activeTab === 'overview' && (
        <>
          <KycBanner
            state={kycState}
            isIndividual={isIndividual}
            onboardingLoading={onboardingLoading}
            onStart={handleStripeOnboarding}
          />

          {pendingReviews.length > 0 && (() => {
            const first = pendingReviews[0];
            const role = first.reviewable_user?.role;
            const titleByRole = role === 'expert' || role === 'company'
              ? 'Lasă o recenzie prestatorului'
              : 'Lasă o recenzie clientului';
            const title = pendingReviews.length === 1
              ? titleByRole
              : `${pendingReviews.length} recenzii de lăsat`;
            return (
              <ActionBanner
                tone="success"
                eyebrow="Sub-task finalizat"
                title={title}
                body="Recenziile construiesc reputația pe ESCRO și ajută colaborările viitoare. Durează doar 1 minut."
                icon="star"
                primary={{
                  label: 'Lasă recenzie',
                  icon: 'star',
                  onClick: () => setReviewTarget(first),
                }}
              />
            );
          })()}

          <ActionCenter actions={actions} onAction={handleAction} />

          <WalletHero
            totalEscrow={totalEscrow}
            totalReleased={totalReleased}
            projects={myProjects}
            role={user?.role}
            onWallet={() => navigate('/wallet')}
          />

          <div className="dash-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="section-h">
                <h2 className="s-title">Proiecte <em>active</em></h2>
                <span className="section-meta">{activeCount} active · {ownProjects.length} total</span>
              </div>

              {ownProjects.length === 0 ? (
                <EmptyState
                  icon={isCompany ? 'folder' : 'search'}
                  title={isIndividual ? 'Niciun proiect deschis' : 'Niciun proiect activ'}
                  description={isIndividual
                    ? 'Caută un expert potrivit nevoii tale în Director.'
                    : isCompany
                      ? 'Postează primul tău proiect sau aplică în Marketplace.'
                      : 'Creează primul tău proiect pentru a începe.'
                  }
                  action={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {isIndividual ? (
                        <>
                          <button className="btn btn-primary" onClick={() => navigate('/directory')}>
                            <Icon name="users" size={13} /> Caută expert în Director
                          </button>
                          <button className="btn btn-secondary" onClick={() => navigate('/create-project')}>
                            <Icon name="plus" size={13} /> Postează proiect
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
                            <Icon name="plus" size={13} /> Postează primul proiect
                          </button>
                          {isCompany && (
                            <button className="btn btn-secondary" onClick={() => navigate('/marketplace')}>
                              <Icon name="search" size={13} /> Aplică în Marketplace
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  }
                />
              ) : (
                <div className="dash-projects" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                  {ownProjects
                    .filter(p => ACTIVE_STATUSES.includes(p.status))
                    .slice(0, 4)
                    .map(p => (
                      <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}`)} />
                    ))}
                </div>
              )}

              {ownProjects.length > 4 && (
                <div style={{ marginTop: '0.875rem', textAlign: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('lucrari')}>
                    Vezi toate {ownProjects.length} proiecte <Icon name="arrow-right" size={12} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="section-h">
                <h2 className="s-title">Activitate <em>live</em></h2>
                <span className="section-meta">
                  <span className="pulse ok" style={{ verticalAlign: '-1px', marginRight: 6 }} />
                  sincronizat
                </span>
              </div>
              <ActivityPanel activity={activity} navigate={navigate} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'lucrari' && (
        <div>
          <div style={{
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
            marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Toate', count: myProjects.length },
                { id: 'active', label: 'În progres', count: myProjects.filter(p => ['active', 'in_progress', 'assigned'].includes(p.status)).length },
                { id: 'review', label: 'De aprobat', count: pendingMilestoneApproval.length },
                { id: 'waiting', label: 'Așteptare', count: myProjects.filter(p => ['open', 'pending_admin_approval', 'pending_client_approval', 'pending_expert_approval'].includes(p.status)).length },
                { id: 'completed', label: 'Finalizate', count: myProjects.filter(p => p.status === 'completed').length },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className="btn btn-sm"
                  style={{
                    background: statusFilter === f.id ? 'var(--accent-bg)' : 'transparent',
                    color: statusFilter === f.id ? 'var(--accent-hi)' : 'var(--fg-2)',
                    border: `1px solid ${statusFilter === f.id ? 'var(--accent-border)' : 'var(--border-1)'}`,
                    fontWeight: statusFilter === f.id ? 600 : 500,
                  }}
                >
                  {f.label}
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--f-mono)',
                    color: statusFilter === f.id ? 'var(--accent-hi)' : 'var(--fg-4)',
                    background: statusFilter === f.id ? 'var(--accent-bg-2)' : 'var(--border-1)',
                    padding: '1px 5px', borderRadius: 3, marginLeft: 4,
                  }}>{f.count}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {isCompany && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPropuneTask(true)}>
                  <Icon name="plus" size={12} /> Propune Task
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-project')}>
                <Icon name="plus" size={12} /> Proiect nou
              </button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <EmptyState
              icon="folder"
              title="Niciun proiect în această categorie"
              description="Modifică filtrul sau creează un proiect nou."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {groupedLucrari.pmGroups.map(pm => (
                <PmGroupCard
                  key={pm.id}
                  pm={pm}
                  subTasks={pm.sub_tasks}
                  onClick={() => navigate(`/project/${pm.id}`)}
                  onSubClick={(st) => navigate(`/project/${pm.id}/assignment/${st.id}`)}
                />
              ))}
              {groupedLucrari.standalone.length > 0 && (
                <div className="dash-projects" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                  {groupedLucrari.standalone.map(p => (
                    <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}`)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <div>
              <h2 className="s-title">Decizii <em>necesare</em></h2>
              <p style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                {pendingApprovals.length} {pendingApprovals.length === 1 ? 'livrabil' : 'livrabile'} de aprobat. Plata se eliberează automat după aprobare.
              </p>
            </div>
            {pendingApprovals.length > 0 && (
              <span style={{
                padding: '6px 12px', borderRadius: 100,
                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                color: 'var(--warning)', fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '0.04em',
              }}>
                <span className="urgent-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
                URGENT
              </span>
            )}
          </div>
          {pendingApprovals.length === 0 ? (
            <EmptyState icon="check" title="Totul aprobat" description="Nu există taskuri în așteptarea aprobării tale." />
          ) : (
            pendingApprovals.map(p => (
              <PendingApprovalCard
                key={p.id}
                assignment={p}
                onApprove={() => handleApproveAssignment(p)}
                onReject={() => handleRejectAssignment(p)}
                onOpen={() => navigate(`/project/${p.task_id}/assignment/${p.id}`)}
              />
            ))
          )}
        </div>
      )}

      {showPropuneTask && (
        <PostTaskModal
          userType={user?.role === 'company' ? 'client' : 'expert'}
          onClose={() => setShowPropuneTask(false)}
          onSubmit={() => { setShowPropuneTask(false); fetchProjects(); }}
        />
      )}

      <ReviewModal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        reviewableUser={reviewTarget?.reviewable_user}
        projectTitle={reviewTarget?.project_title}
        projectId={reviewTarget?.project_id}
        onReviewSubmitted={() => {
          setReviewTarget(null);
          // Refresh pending reviews so the banner disappears.
          axios.get('/api/reviews/pending', { headers })
            .then(r => setPendingReviews(r.data.pending_reviews || []))
            .catch(() => {});
        }}
      />
    </div>
  );
}
