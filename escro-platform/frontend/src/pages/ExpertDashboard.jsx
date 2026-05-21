import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Avatar, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { fmtRON, fmtDate, avatarColor, serviceLabel } from '../utils/format';
import axios from 'axios';

function Sparkline({ data, width = 320, height = 70, color }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => (typeof d === 'object' ? d.v : d));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  const stroke = color || 'var(--accent-hi)';
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, overflow: 'visible' }}>
      <defs>
        <linearGradient id="expert-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#expert-spark-grad)" />
      <path d={linePath} stroke={stroke} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="6" fill="none" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}

function UrgentBanner({ items, kind, onClick }) {
  if (!items || items.length === 0) return null;
  const isOne = items.length === 1;
  const title = kind === 'deliveries'
    ? (isOne ? 'Un milestone așteaptă livrarea ta urgent' : `${items.length} milestone-uri așteaptă livrarea ta urgent`)
    : (isOne ? 'O acțiune urgentă' : `${items.length} acțiuni urgente`);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        background: 'linear-gradient(135deg, var(--warning-bg) 0%, var(--accent-bg) 100%)',
        border: '2px solid var(--warning)',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        transition: 'all .15s',
        boxShadow: '0 4px 16px rgba(245, 158, 11, .25)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{
        width: 12, height: 12, borderRadius: '50%',
        background: 'var(--warning)',
        animation: 'urgent-pulse 1.6s infinite',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {items.slice(0, 3).map(p => p.title).join(' · ')}
          {items.length > 3 ? ` +${items.length - 3} alte` : ''}
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
        Livrează acum →
      </button>
    </div>
  );
}

function KycBanner({ state, onboardingLoading, onStart }) {
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
  const description = waitingForCall
    ? 'După apelul de verificare cu adminul, poți începe verificarea KYC: identitate, document, IBAN.'
    : (inProgress
      ? 'Verificarea ta este în procesare la Stripe. Vei fi notificat când e completă și poți primi plăți.'
      : 'Pornește verificarea KYC prin Stripe: identitate (CNP/CUI + document), apoi IBAN pentru a primi banii din milestone-uri.');

  const stepStates = waitingForCall ? ['attention', 'pending', 'pending']
    : (ready ? ['done', 'active', 'pending']
      : (inProgress ? ['done', 'active', 'pending']
        : ['done', 'done', 'done']));
  const steps = ['Apel admin', 'KYC Stripe', 'IBAN'];

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
        {ready && (
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
              {i < 2 && <Icon name="chevron-right" size={10} style={{ color: 'var(--fg-4)' }} />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StackBanner({ tone, icon, title, items, onItemClick }) {
  if (!items || items.length === 0) return null;
  const bg = tone === 'warning' ? 'var(--warning-bg)' : tone === 'violet' ? 'var(--violet-bg)' : 'var(--accent-bg)';
  const border = tone === 'warning' ? 'var(--warning-border)' : tone === 'violet' ? 'var(--violet-border)' : 'var(--accent-border)';
  const color = tone === 'warning' ? 'var(--warning)' : tone === 'violet' ? 'var(--violet)' : 'var(--accent-hi)';
  const btnBg = tone === 'warning' ? 'var(--warning)' : tone === 'violet' ? 'var(--violet)' : 'var(--accent-hi)';
  return (
    <div style={{
      marginBottom: '1rem', padding: '0.875rem 1rem',
      background: bg, border: `1px solid ${border}`,
      borderRadius: 'var(--r-md)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
    }}>
      <Icon name={icon} size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: '0.375rem' }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {items.map((p, i) => (
            <button
              key={p.id || i}
              onClick={() => onItemClick?.(p)}
              style={{
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: btnBg, color: '#fff',
                border: 'none', borderRadius: 'var(--r-sm)', padding: '3px 10px',
              }}
            >
              {p.title} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VaultHero({ wallet, spark, completedCount, trustLevel, trustScore, monthlyLabels, onPayout, onWallet }) {
  const deltaUp = wallet.this_month >= wallet.last_month;
  const fmtNum = (v) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(v || 0));

  return (
    <div className="vault" style={{ marginBottom: '2rem' }}>
      <div className="vault-content" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'center' }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: '1rem' }}>
            <Icon name="trending-up" size={11} /> Câștiguri ESCRO · Total
          </div>
          <div className="vault-num">
            <em>{Math.round(wallet.total_earned).toLocaleString('ro-RO')}</em>
            <span className="vault-cur">RON</span>
          </div>
          <p style={{ marginTop: '1rem', maxWidth: '46ch', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
            Câștiguri din proiecte finalizate. Fondurile sunt debursate automat la aprobarea fiecărui milestone.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>
                <Icon name="check" size={9} style={{ color: 'var(--success)' }} /> Net disponibil
              </div>
              <div style={{ fontSize: 16, color: 'var(--success)', fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(wallet.net_available)} RON
              </div>
            </div>
            <div className="v-divider" />
            <div>
              <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>
                <Icon name="clock" size={9} style={{ color: 'var(--warning)' }} /> În procesare
              </div>
              <div style={{ fontSize: 16, color: 'var(--warning)', fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(wallet.in_processing)} RON
              </div>
            </div>
            <div className="v-divider" />
            <div>
              <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>
                <Icon name="x" size={9} style={{ color: 'var(--danger)' }} /> Eșuate
              </div>
              <div style={{ fontSize: 16, color: wallet.failed > 0 ? 'var(--danger)' : 'var(--fg-1)', fontFamily: 'var(--f-mono)' }}>
                {fmtNum(wallet.failed)} RON
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={onPayout} disabled={wallet.net_available < 50}>
              <Icon name="credit-card" size={12} /> Retrage net disponibil
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onWallet}>
              <Icon name="wallet" size={12} /> Portofel & istoric
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.5rem' }}>
            <div className="h-eyebrow" style={{ margin: 0 }}>Ultimele 30 zile</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 18, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(wallet.this_month)} <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>RON</span>
              </span>
              {wallet.last_month > 0 && (
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10.5,
                  color: deltaUp ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600,
                }}>
                  <Icon name={deltaUp ? 'arrow-up' : 'arrow-down'} size={9} style={{ verticalAlign: '-1px' }} /> {Math.abs(wallet.delta_pct).toFixed(1)}% vs luna trecută
                </span>
              )}
            </div>
          </div>
          <Sparkline data={spark} width={320} height={70} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--fg-4)',
            marginTop: '.25rem', marginBottom: '1rem',
          }}>
            <span>{monthlyLabels.start}</span>
            <span>azi · {monthlyLabels.end}</span>
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.5rem' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Trust profile</span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--accent-hi)', fontWeight: 600 }}>
                L{trustLevel} · {trustScore} pts
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: n <= trustLevel ? 'linear-gradient(90deg, var(--accent-lo), var(--accent-hi))' : 'var(--border-1)',
                  boxShadow: n <= trustLevel ? '0 0 8px var(--accent-glow)' : 'none',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)', marginTop: '.75rem' }}>
              <span style={{ color: 'var(--fg-3)' }}>Proiecte finalizate</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fg-0)' }}>{completedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, delta, deltaDir, sublabel, isText }) {
  return (
    <div className="stat">
      <div className="stat-h">
        <div className="stat-l">{label}</div>
        <div className="stat-i"><Icon name={icon} size={13} /></div>
      </div>
      {isText ? (
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontVariantNumeric: 'tabular-nums', color: 'var(--fg-0)', margin: '0.25rem 0 0.5rem' }}>
          {value}
        </div>
      ) : (
        <div className="stat-v"><em>{value}</em></div>
      )}
      <div className="stat-f">
        {delta && (
          <span className={`stat-delta ${deltaDir === 'down' ? 'down' : ''}`}>
            <Icon name={deltaDir === 'down' ? 'arrow-down' : 'arrow-up'} size={10} /> {delta}
          </span>
        )}
        {sublabel && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sublabel}</span>}
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

function ProjectCard({ p, userId, onClick }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isPrestator = String(p.expert_id) === String(userId)
    || String(p.assigned_expert_id) === String(userId)
    || String(p.company_id) === String(userId);
  const isExpert = isPrestator; // back-compat alias used below
  const partnerName = isExpert
    ? (p.client_name || p.company_name || null)
    : (p.expert_name || p.assigned_expert_name || null);

  // Livrare e responsabilitatea prestatorului — afișează badge doar dacă userul curent
  // chiar este prestatorul asignat pe proiect. Pentru ceilalți (vizualizare ecosystem
  // sau client) e doar zgomot vizual.
  const needsDeliver = parseInt(p.pending_deliveries) > 0 && isPrestator;
  const needsSign = parseInt(p.pending_contracts_for_me) > 0;
  const idStr = p.id ? String(p.id).replace(/\D/g, '').slice(0, 4).padStart(4, '0') : '0000';

  return (
    <div className="proj" onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
      {(needsDeliver || needsSign) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {needsDeliver && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--warning-bg)', color: 'var(--warning)',
              border: '1px solid var(--warning-border)', letterSpacing: '.02em',
            }}>↑ LIVREAZĂ</span>
          )}
          {needsSign && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--warning-bg)', color: 'var(--warning)',
              border: '1px solid var(--warning-border)', letterSpacing: '.02em',
            }}>✍ SEMNEAZĂ</span>
          )}
        </div>
      )}
      <div className="proj-h">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="proj-id">ESC-{idStr}</div>
          <div className="proj-t" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="proj-d">{p.description || p.brief || 'Proiect în desfășurare.'}</div>
      {p.service_type && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          <span className="tag">{serviceLabel(p.service_type)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--fg-2)', minWidth: 0 }}>
          {partnerName ? (
            <>
              <Avatar user={{ name: partnerName, color: avatarColor('company') }} size="sm" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partnerName}</span>
            </>
          ) : (
            <span style={{ color: 'var(--fg-3)' }}>Client</span>
          )}
        </div>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{progress}%</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
      <div className="proj-foot">
        <div>
          <div className="proj-amt">
            <em>{Math.round(budget).toLocaleString('ro-RO')}</em>
            <span className="proj-cur">RON</span>
          </div>
        </div>
        {p.milestones_total != null && (
          <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>
            {p.milestones_done || 0}/{p.milestones_total} ms
          </span>
        )}
      </div>
    </div>
  );
}

const EVENT_META = {
  milestone_delivered: { icon: 'upload',        color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a livrat milestone-ul' },
  milestone_approved:  { icon: 'check',         color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat milestone-ul' },
  funds_released:      { icon: 'trending-up',   color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a eliberat fondurile' },
  escrow_deposit:      { icon: 'lock',          color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow' },
  escrow_funded:       { icon: 'lock',          color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow pentru' },
  project_completed:   { icon: 'flag',          color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'a finalizat proiectul' },
  message_sent:        { icon: 'message-circle',color: 'var(--fg-2)',      bg: 'var(--border-1)',   label: 'a trimis un mesaj pe' },
  project_created:     { icon: 'plus',          color: 'var(--fg-2)',      bg: 'var(--border-1)',   label: 'Proiect nou creat:' },
  expert_assigned:     { icon: 'user-check',    color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  company_assigned:    { icon: 'building',      color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  task_assigned:       { icon: 'briefcase',     color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  project_approved:    { icon: 'check',         color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat proiectul' },
  project_rejected:    { icon: 'x',             color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a respins proiectul' },
  account_approved:    { icon: 'shield',        color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a aprobat contul tău' },
  account_rejected:    { icon: 'x',             color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a respins contul tău' },
  admin_edit:          { icon: 'edit',          color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a modificat proiectul' },
  contract_ready:      { icon: 'file-text',     color: 'var(--accent-hi)', bg: 'var(--accent-bg)',  label: 'Contract de semnat pe' },
  contract_signed:     { icon: 'check-circle',  color: 'var(--success)',   bg: 'var(--success-bg)', label: 'Contract semnat pe' },
  task_acceptance_required: { icon: 'briefcase', color: 'var(--accent-hi)', bg: 'var(--accent-bg)', label: 'te-a invitat pe' },
  task_accepted:       { icon: 'check-circle',  color: 'var(--success)',   bg: 'var(--success-bg)', label: 'a acceptat task-ul' },
  task_rejected_by_expert: { icon: 'x',         color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a refuzat task-ul' },
  task_rejected_by_client: { icon: 'x',         color: 'var(--danger)',    bg: 'var(--danger-bg)',  label: 'a respins task-ul' },
  task_approval_required:  { icon: 'flag',      color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'Task de aprobat pe' },
  milestone_disputed:  { icon: 'alert-triangle', color: 'var(--danger)',   bg: 'var(--danger-bg)',  label: 'a deschis o dispută pe' },
  modification_proposed: { icon: 'edit',        color: 'var(--warning)',   bg: 'var(--warning-bg)', label: 'a propus modificări pe' },
  dispute_resolved:    { icon: 'shield',        color: 'var(--success)',   bg: 'var(--success-bg)', label: 'Dispută rezolvată pe' },
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
      <div style={{ padding: '0.5rem 0' }}>
        {activity.length === 0 ? (
          <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
            Nicio activitate recentă
          </div>
        ) : activity.slice(0, 10).map((ev, i) => {
          const meta = EVENT_META[ev.event_type] || EVENT_META.message_sent;
          const isLast = i === Math.min(activity.length, 10) - 1;
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
                borderBottom: isLast ? 'none' : undefined,
                cursor: clickable ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={meta.icon} size={14} style={{ color: meta.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>
                  {ev.actor_name
                    ? <><b style={{ fontWeight: 600 }}>{ev.actor_name}</b>{' '}<span style={{ color: 'var(--fg-2)' }}>{meta.label}</span></>
                    : <span style={{ color: 'var(--fg-2)' }}>{meta.label}</span>
                  }
                </div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)',
                  marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.milestone_title ? `${ev.milestone_title} · ` : ''}{ev.project_title}
                  {ev.amount ? ` · ${parseFloat(ev.amount).toLocaleString('ro-RO')} RON` : ''}
                </div>
              </div>
              <div style={{ flexShrink: 0, fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-4)' }}>
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

function buildEarningsStats(earnings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayBucket = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayBucket.set(d.toISOString().slice(0, 10), 0);
  }

  let thisMonth = 0;
  let lastMonth = 0;
  const tm = today.getMonth();
  const ty = today.getFullYear();
  const lm = tm === 0 ? 11 : tm - 1;
  const ly = tm === 0 ? ty - 1 : ty;

  earnings.forEach(e => {
    if (!e.released_at) return;
    const d = new Date(e.released_at);
    const amount = parseFloat(e.expert_amount_ron) || 0;
    const k = d.toISOString().slice(0, 10);
    if (dayBucket.has(k)) dayBucket.set(k, dayBucket.get(k) + amount);
    if (d.getMonth() === tm && d.getFullYear() === ty) thisMonth += amount;
    else if (d.getMonth() === lm && d.getFullYear() === ly) lastMonth += amount;
  });

  const spark = Array.from(dayBucket.values());
  const deltaPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0);

  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);
  const monthlyLabels = {
    start: `${startDate.getDate()} ${months[startDate.getMonth()]}`,
    end: `${today.getDate()} ${months[today.getMonth()]}`,
  };

  return { spark, thisMonth, lastMonth, deltaPct, monthlyLabels };
}

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [projects, setProjects] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingReviews, setPendingReviews] = useState([]);

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

  const fetchData = useCallback(async () => {
    try {
      const [projRes, trustRes, actRes, walletRes, earnRes] = await Promise.allSettled([
        axios.get('/api/projects', { headers }),
        axios.get('/api/trust-profiles/my-trust-profile', { headers }),
        axios.get('/api/activity', { headers }),
        axios.get('/api/wallet/balance', { headers }),
        axios.get('/api/wallet/earnings?limit=100', { headers }),
      ]);
      if (projRes.status === 'fulfilled') {
        const data = projRes.value.data;
        setProjects(data.projects || data || []);
      }
      if (trustRes.status === 'fulfilled') setTrustProfile(trustRes.value.data);
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data.activity || []);
      if (walletRes.status === 'fulfilled') {
        setWalletBalance(walletRes.value.data.balance);
        setStripeStatus(walletRes.value.data.stripe);
      }
      if (earnRes.status === 'fulfilled') setEarnings(earnRes.value.data.earnings || []);
    } catch {
      setError('Nu s-au putut încărca datele.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    axios.get('/api/reviews/pending', { headers })
      .then(r => setPendingReviews(r.data.pending_reviews || []))
      .catch(() => {});
  }, [headers]);

  // Dashboard "Proiecte & Taskuri" bucket: all non-marketplace items (global ecosystem view).
  // Action panels below still filter to user-specific items (pending deliveries / approvals
  // / contracts to sign), so each user sees only their own actionable work in the action lists.
  const myProjects = useMemo(() => projects.filter(p =>
    !p.is_marketplace &&
    p.status !== 'pending_assignment'
  ), [projects]);

  // Party-scoped slice for the Overview tab — "Proiecte active", trust stats, completion
  // counts show only projects the user is involved in (expert, client, company, or poster).
  const ownProjects = useMemo(() => myProjects.filter(p =>
    String(p.expert_id) === String(user?.id) ||
    String(p.assigned_expert_id) === String(user?.id) ||
    String(p.client_id) === String(user?.id) ||
    String(p.company_id) === String(user?.id) ||
    String(p.posted_by_expert) === String(user?.id) ||
    String(p.posted_by_client) === String(user?.id)
  ), [myProjects, user?.id]);
  const ACTIVE_STATUSES = ['active', 'in_progress', 'assigned', 'pending_expert_approval', 'pending_client_approval', 'pending_admin_approval', 'open', 'review'];
  const activeProjects = ownProjects.filter(p => ACTIVE_STATUSES.includes(p.status));
  const reviewProjects = ownProjects.filter(p => p.status === 'review');
  const completedCount = ownProjects.filter(p => p.status === 'completed').length;
  const activeCount = activeProjects.length;

  // Group projects for Lucrari tab: PM tasks gather their sub-tasks; standalone shows individually.
  // For sub-tasks whose parent PM is NOT in myProjects (e.g., admin assigned the user as
  // prestator on a task under another client's PM), we build a synthetic parent group
  // from the joined task_* fields so the sub-task still appears nested under its PM context.
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
    // PMs with NO worked-on sub-tasks (only pending_assignment ones) belong on the Marketplace
    // until a prestator is assigned. Once at least one sub-task is in worked-on state
    // (assigned / in_progress / completed / etc.), the PM appears here.
    const pmGroups = [...pmMap.values()].filter(g => g.sub_tasks.length > 0);
    return { pmGroups, standalone };
  }, [myProjects]);

  const pendingDeliveryProjects = useMemo(() =>
    myProjects.filter(p =>
      parseInt(p.pending_deliveries) > 0 &&
      (String(p.expert_id) === String(user?.id) || String(p.company_id) === String(user?.id))
    ),
    [myProjects, user?.id]
  );
  const pendingApprovalProjects = useMemo(() =>
    myProjects.filter(p =>
      parseInt(p.pending_approvals) > 0 &&
      String(p.client_id) === String(user?.id)
    ),
    [myProjects, user?.id]
  );
  const contractSignProjects = useMemo(() =>
    myProjects.filter(p => parseInt(p.pending_contracts_for_me) > 0),
    [myProjects]
  );
  // Tasks waiting for THIS user's approval as the PM owner / client. Admin or expert poster
  // created a task on a PM and the PM client (which can also be an expert who created their
  // own PM as buyer of services) must approve. Includes both prestator-side (assigned expert
  // confirms admin edits) and client-side (PM owner confirms admin-created task).
  const adminEditProjects = useMemo(() =>
    projects.filter(p => p.status === 'pending_client_approval' &&
      (String(p.expert_id) === String(user?.id) ||
       String(p.assigned_expert_id) === String(user?.id) ||
       String(p.client_id) === String(user?.id))),
    [projects, user?.id]
  );

  const { spark, thisMonth, lastMonth, deltaPct, monthlyLabels } = useMemo(
    () => buildEarningsStats(earnings),
    [earnings]
  );

  const wallet = {
    total_earned: walletBalance?.total_earned ?? 0,
    net_available: walletBalance?.available ?? 0,
    in_processing: (walletBalance?.pending_transfer ?? 0) + (walletBalance?.pending_payout ?? 0),
    failed: walletBalance?.failed_transfer ?? 0,
    this_month: thisMonth,
    last_month: lastMonth,
    delta_pct: deltaPct,
  };

  const trustScore = trustProfile?.trust_score || trustProfile?.score || 0;
  const trustLevel = trustProfile?.trust_level || 1;
  const kycStatus = user?.kyc_status || 'pending';
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'utilizator';

  const stripeConnected = !!stripeStatus?.onboarding_complete;
  const stripePending = stripeStatus?.account_id === 'pending_stripe_integration';
  const hasVerificationCall = !!trustProfile?.has_verification_call;

  const kycState = stripeConnected
    ? 'done'
    : (!hasVerificationCall ? 'awaiting_call'
      : (stripePending ? 'in_progress' : 'ready'));

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

  const handleAcceptAdminEdit = async (p) => {
    try {
      await axios.post(`/api/projects/${p.id}/accept-admin-edit`, {}, { headers });
      fetchData();
    } catch {
      setError('Eroare la confirmarea modificării.');
    }
  };
  const handleRejectAdminEdit = async (p) => {
    try {
      await axios.post(`/api/projects/${p.id}/reject-admin-edit`, {}, { headers });
      fetchData();
    } catch {
      setError('Eroare la respingerea modificării.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Acasă', icon: 'home' },
    { id: 'lucrari', label: 'Proiecte & Taskuri', icon: 'folder', count: myProjects.length || undefined },
    ...(pendingDeliveryProjects.length > 0
      ? [{ id: 'deliveries', label: 'De livrat', icon: 'upload', count: pendingDeliveryProjects.length, urgent: true }]
      : []),
  ];

  const urgentTitle = pendingDeliveryProjects.length > 0
    ? <>{pendingDeliveryProjects.length} {pendingDeliveryProjects.length === 1 ? 'milestone așteaptă' : 'milestone-uri așteaptă'} <em>livrarea ta</em>.</>
    : (reviewProjects.length > 0
        ? <>{reviewProjects.length} {reviewProjects.length === 1 ? 'proiect e' : 'proiecte sunt'} <em>în review</em>.</>
        : <>Bună, <em>{firstName}</em>.</>);

  if (loading) return <div className="escro-page"><Spinner /></div>;

  return (
    <div className="escro-page fade-up">
      <style>{`
        @keyframes urgent-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, .65); }
          70%  { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        @media (max-width: 900px) {
          .dash-2col { grid-template-columns: 1fr !important; }
          .vault-content { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
        }
        @media (max-width: 640px) {
          .dash-projects { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {pendingDeliveryProjects.length > 0 && (
        <UrgentBanner
          items={pendingDeliveryProjects}
          kind="deliveries"
          onClick={() => setTab('deliveries')}
        />
      )}

      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">
            <Icon name="user" size={11} /> Dashboard · Expert
          </div>
          <h1 className="h-title">{urgentTitle}</h1>
          <p className="h-sub">
            {activeCount} proiecte active · {completedCount} finalizate · Trust L{trustLevel}
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${user?.verification_date ? 'badge-green' : 'badge-amber'} no-dot`}>
            <Icon name={user?.verification_date ? 'check' : 'clock'} size={10} />
            {user?.verification_date ? 'Cont verificat' : 'Cont neverificat'}
          </span>
          <span className={`badge ${kycStatus === 'verified' ? 'badge-green' : 'badge-amber'} no-dot`}>
            <Icon name={kycStatus === 'verified' ? 'check' : 'alert-triangle'} size={10} />
            KYC {kycStatus === 'verified' ? 'verificat' : 'neverificat'}
          </span>
          <button className="btn btn-secondary" onClick={() => navigate(`/profile/${user?.id}`)}>
            <Icon name="user" size={14} /> Profil public
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/directory')}>
            <Icon name="search" size={14} /> Găsește proiecte
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
            onboardingLoading={onboardingLoading}
            onStart={handleStripeOnboarding}
          />

          {pendingReviews.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2, marginBottom: '1.25rem', background: 'var(--accent-bg)' }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: 22 }}>★</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-0)' }}>
                        {pendingReviews.length === 1 ? 'Ai o recenzie de lăsat' : `Ai ${pendingReviews.length} recenzii de lăsat`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                        {pendingReviews.slice(0, 2).map(r => r.reviewable_user?.name).filter(Boolean).join(', ')}
                        {pendingReviews.length > 2 ? ` și încă ${pendingReviews.length - 2}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/project/${pendingReviews[0].project_id}?tab=contracts`)}
                  >
                    Lasă recenzie →
                  </button>
                </div>
              </div>
            </div>
          )}

          <StackBanner
            tone="warning"
            icon="flag"
            title={adminEditProjects.length === 1
              ? 'Un task așteaptă aprobarea ta'
              : `${adminEditProjects.length} task-uri așteaptă aprobarea ta`}
            items={adminEditProjects}
            onItemClick={(p) => navigate(`/project/${p.task_id || p.id}`)}
          />

          <StackBanner
            tone="accent"
            icon="upload"
            title={pendingDeliveryProjects.length === 1
              ? 'Ai un milestone de livrat'
              : `Ai milestone-uri de livrat în ${pendingDeliveryProjects.length} proiecte`}
            items={pendingDeliveryProjects}
            onItemClick={(p) => navigate(`/project/${p.id}?tab=contracts`)}
          />

          <StackBanner
            tone="accent"
            icon="check"
            title={pendingApprovalProjects.length === 1
              ? 'Ai un livrabil de aprobat'
              : `Ai livrabile de aprobat în ${pendingApprovalProjects.length} proiecte`}
            items={pendingApprovalProjects}
            onItemClick={(p) => navigate(`/project/${p.id}?tab=contracts`)}
          />

          <StackBanner
            tone="warning"
            icon="alert-triangle"
            title={contractSignProjects.length === 1
              ? 'Ai un contract de semnat'
              : `Ai ${contractSignProjects.length} contracte de semnat`}
            items={contractSignProjects}
            onItemClick={(p) => navigate(`/project/${p.id}?tab=contracts`)}
          />

          <VaultHero
            wallet={wallet}
            spark={spark}
            completedCount={completedCount}
            trustLevel={trustLevel}
            trustScore={trustScore}
            monthlyLabels={monthlyLabels}
            onPayout={() => navigate('/wallet')}
            onWallet={() => navigate('/wallet')}
          />

          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <StatCard label="Proiecte active" value={activeCount} icon="folder" sublabel="workspace" />
            <StatCard
              label="În review"
              value={reviewProjects.length}
              icon="flag"
              sublabel={reviewProjects.length > 0 ? 'livrabile' : 'nicio livrare'}
              delta={reviewProjects.length > 0 ? 'Livrabile' : null}
            />
            <StatCard label="Trust Level" value={`L${trustLevel}`} icon="shield" sublabel={`${trustScore} pts`} isText />
            <StatCard
              label="Câștig luna"
              value={fmtRON(thisMonth)}
              icon="trending-up"
              sublabel={lastMonth > 0 ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs luna trecută` : 'din escrow'}
              isText
            />
          </div>

          <div className="dash-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="section-h">
                <h2 className="s-title">Proiecte <em>active</em></h2>
                <span className="section-meta">{activeProjects.length} asignate</span>
              </div>

              {activeProjects.length === 0 ? (
                <EmptyState
                  icon="briefcase"
                  title="Niciun proiect activ"
                  description="Postează propriul tău proiect sau aplică la cele din Marketplace publicate de alte companii/persoane. Toate plățile sunt protejate prin escrow."
                  action={
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-project')}>
                        <Icon name="plus" size={13} /> Postează proiect
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/marketplace')}>
                        <Icon name="search" size={13} /> Aplică în Marketplace
                      </button>
                    </div>
                  }
                />
              ) : (
                <>
                  <div className="dash-projects" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                    {activeProjects.slice(0, 4).map(p => (
                      <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}`)} />
                    ))}
                  </div>
                  {activeProjects.length > 4 && (
                    <div style={{ marginTop: '.75rem', textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTab('lucrari')}>
                        Vezi toate {activeProjects.length} proiecte <Icon name="arrow-right" size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="section-h">
                <h2 className="s-title">Activitate <em>live</em></h2>
                <span className="section-meta">
                  <span className="pulse ok" style={{ verticalAlign: '-1px', marginRight: 6 }} /> sincronizat
                </span>
              </div>
              <ActivityPanel activity={activity} navigate={navigate} />

              {pendingDeliveryProjects.length > 0 && (
                <div className="card" style={{ marginTop: '1rem', padding: '1.25rem', background: 'linear-gradient(180deg, var(--bg-2), var(--bg-1))' }}>
                  <div className="h-eyebrow"><Icon name="zap" size={11} /> Acțiune necesară</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, lineHeight: 1.3, color: 'var(--fg-0)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                    Ai <em style={{ color: 'var(--warning)', fontStyle: 'italic' }}>{pendingDeliveryProjects.length}</em> milestone{pendingDeliveryProjects.length > 1 ? '-uri' : ''} de livrat.
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--fg-2)', marginBottom: '0.875rem' }}>
                    Livrarea la timp îți crește Trust Level-ul și te face vizibil pentru proiecte cu buget mai mare.
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={() => setTab('deliveries')}>
                    Vezi ce ai de livrat <Icon name="arrow-right" size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'lucrari' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {adminEditProjects.map(p => (
            <div key={`confirm-${p.id}`} style={{
              background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
              borderRadius: 10, padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--fg-0)', marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--warning)' }}>
                  Adminul a modificat acest task. Verifică detaliile și confirmă sau respinge modificarea.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--warning)', color: '#000', padding: '2px 8px', borderRadius: 99, marginRight: 4 }}>
                  Necesită confirmare
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/project/${p.id}`)}>
                  <Icon name="eye" size={12} /> Detalii
                </button>
                <button className="btn btn-success btn-sm" onClick={() => handleAcceptAdminEdit(p)}>Acceptă</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRejectAdminEdit(p)}>Respinge</button>
              </div>
            </div>
          ))}

          <div className="card">
            <div className="card-head">
              <div className="card-title">Proiecte & Task-uri ({myProjects.length})</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-project')}>
                <Icon name="plus" size={12} /> Proiect nou
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              {myProjects.length === 0 ? (
                <EmptyState
                  icon="folder"
                  title="Niciun proiect"
                  description="Nu ești asignat la niciun proiect sau task momentan."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/marketplace')}>
                      <Icon name="search" size={13} /> Vezi Marketplace
                    </button>
                  }
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
          </div>
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-head" style={{ marginBottom: '.5rem' }}>
            <div className="card-title">Milestone-uri de livrat ({pendingDeliveryProjects.length})</div>
          </div>
          {pendingDeliveryProjects.length === 0 ? (
            <EmptyState icon="check" title="Totul livrat" description="Nu ai nicio livrare în așteptare." />
          ) : (
            <div className="dash-projects" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              {pendingDeliveryProjects.map(p => (
                <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}?tab=contracts`)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
