import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner } from '../components/ui';
import { fmtRON, fmtRONsplit, fmtDate, fmtDateTime } from '../utils/format';
import axios from 'axios';

const TX_TYPES = {
  milestone_payment: { label: 'Câștig milestone', icon: 'arrow-down-circle', sign: '+' },
  referral:          { label: 'Bonus recomandare', icon: 'gift',             sign: '+' },
  payout:            { label: 'Retragere',         icon: 'arrow-up-circle',  sign: '−' },
  refund:            { label: 'Restituire',        icon: 'refresh',          sign: '−' },
};

const STATUS_PILL = {
  pending:    { label: 'În așteptare',  cls: 'badge-amber' },
  processing: { label: 'În procesare',  cls: 'badge-blue' },
  paid:       { label: 'Plătit',        cls: 'badge-green' },
  failed:     { label: 'Eșuat',         cls: 'badge-red' },
  cancelled:  { label: 'Anulat',        cls: 'badge-grey' },
};

function buildDays(earnings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bucket = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    bucket.set(d.toISOString().slice(0, 10), 0);
  }
  earnings.forEach(e => {
    if (!e.released_at) return;
    const k = new Date(e.released_at).toISOString().slice(0, 10);
    if (bucket.has(k)) bucket.set(k, bucket.get(k) + parseFloat(e.expert_amount_ron || 0));
  });
  return Array.from(bucket.values()).map((v, i) => ({ d: i, v }));
}

function buildTransactions(earnings, payouts) {
  const txs = [];
  earnings.forEach(e => {
    const status =
      e.stripe_payout_status === 'failed' ? 'failed' :
      e.stripe_payout_status === 'paid' ? 'paid' :
      e.stripe_payout_status === 'processing' ? 'processing' : 'pending';
    txs.push({
      id: `e_${e.id}`,
      type: 'milestone_payment',
      amount: parseFloat(e.expert_amount_ron || 0),
      date: e.released_at,
      desc: `${e.project_title || 'Proiect'}${e.milestone_title ? ' · ' + e.milestone_title : ''}`,
      status,
      milestone_id: e.milestone_id,
    });
  });
  payouts.forEach(p => {
    txs.push({
      id: `p_${p.id}`,
      type: 'payout',
      amount: parseFloat(p.amount_ron || 0),
      date: p.requested_at,
      desc: 'Retragere către cont bancar',
      status: p.status,
    });
  });
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return txs;
}

function MiniChart({ days, accent = 'var(--accent)' }) {
  const max = Math.max(1, ...days.map(d => d.v));
  const total = days.reduce((s, d) => s + d.v, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 240 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Câștiguri · ultimele 30 zile
        </div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
          {fmtRON(total)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56, padding: '4px 0' }}>
        {days.map((d, i) => {
          const h = max > 0 ? (d.v / max) * 100 : 0;
          return (
            <div key={i}
              title={`Ziua ${i + 1}: ${fmtRON(d.v)}`}
              style={{
                flex: 1,
                minWidth: 4,
                height: `${Math.max(h, d.v > 0 ? 6 : 2)}%`,
                background: d.v > 0 ? accent : 'var(--border-1)',
                borderRadius: '2px 2px 0 0',
                opacity: d.v > 0 ? (0.55 + (d.v / max) * 0.45) : 0.6,
                transition: 'height 0.4s, opacity 0.2s',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--fg-4)', letterSpacing: '0.05em' }}>
        <span>acum 30 zile</span>
        <span>azi</span>
      </div>
    </div>
  );
}

function BreakdownChip({ label, value, tone }) {
  const tones = {
    success: { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
    warning: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
    accent:  { color: 'var(--accent-hi)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    muted:   { color: 'var(--fg-2)', bg: 'var(--border-1)', border: 'var(--border-2)' },
  };
  const t = tones[tone] || tones.muted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px 4px 10px', borderRadius: 999,
      background: t.bg, border: `1px solid ${t.border}`,
      fontSize: 11.5, color: 'var(--fg-2)', fontWeight: 500,
    }}>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--f-mono)', color: t.color, fontWeight: 600 }}>{fmtRON(value)}</span>
    </span>
  );
}

function SoldHero({ balance, days, onPayoutClick, canPayout }) {
  const [intP, decP] = fmtRONsplit(balance.available);
  return (
    <div className="vault" style={{ marginBottom: 24 }}>
      <div className="vault-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.4fr) 1px minmax(220px, 1fr)', gap: 28, alignItems: 'stretch' }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 12 }}>
            <span className="pulse ok" style={{ width: 6, height: 6 }} />
            Disponibil pentru retragere
          </div>
          <div className="vault-num" style={{ fontSize: 'clamp(56px, 9vw, 88px)', display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--f-mono)', fontWeight: 500 }}>
            <span>{intP}</span>
            <span style={{ fontSize: '0.42em', color: 'var(--fg-3)', fontWeight: 400 }}>,{decP}</span>
            <span className="vault-cur" style={{ marginLeft: 14 }}>RON</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
            <BreakdownChip label="Câștigat" value={balance.total_earned} tone="success" />
            <BreakdownChip label="Plătit" value={balance.paid_out} tone="muted" />
            <BreakdownChip label="În procesare" value={balance.pending_payout + balance.pending_transfer} tone="warning" />
            {balance.referral_balance > 0 && <BreakdownChip label="Recomandări" value={balance.referral_balance} tone="accent" />}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={onPayoutClick}
              disabled={!canPayout || balance.available < 50}
              style={{ minHeight: 38 }}
            >
              <Icon name="arrow-up-circle" size={14} />
              Cere retragere
            </button>
            <button className="btn btn-secondary" style={{ minHeight: 38 }} disabled>
              <Icon name="download" size={14} /> Extras lunar
            </button>
          </div>
          {!canPayout && balance.available >= 50 && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={11} /> Conectează contul bancar pentru a putea cere o retragere.
            </div>
          )}
          {balance.available < 50 && balance.available > 0 && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={11} /> Suma minimă pentru retragere este 50 RON.
            </div>
          )}
        </div>

        <div className="v-divider" />

        <MiniChart days={days} />
      </div>
    </div>
  );
}

function FailedTransferAlert({ amount, onContact }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--danger-bg), rgba(239,68,68,0.06))',
      border: '1px solid var(--danger-border)',
      borderRadius: 'var(--r-lg)',
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex', alignItems: 'flex-start', gap: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(400px 100px at 90% 50%, rgba(239,68,68,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(239,68,68,0.18)',
        color: 'var(--danger)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '1px solid var(--danger-border)',
        position: 'relative', zIndex: 1,
      }}>
        <Icon name="alert-triangle" size={16} />
      </div>
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)', margin: 0, fontWeight: 500, letterSpacing: '-0.01em' }}>
            Transfer eșuat: <em style={{ fontStyle: 'italic', color: 'var(--danger)' }}>{fmtRON(amount)}</em>
          </h3>
          <span className="badge badge-red" style={{ fontSize: 10 }}>Necesită intervenție</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5, maxWidth: 540 }}>
          Una sau mai multe retrageri au eșuat la nivelul băncii (cont închis, IBAN invalid sau respins de procesator).
          Contactează echipa de suport ca să recuperăm suma și să retrimitem transferul.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-danger btn-sm" onClick={onContact}>
            <Icon name="phone" size={11} /> Contactează admin
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerShell({ tone, icon, eyebrow, title, desc, actionLabel, actionIcon, onAction, loading, chips }) {
  const tones = {
    accent:  { border: 'var(--accent-border)', bg: 'var(--accent-bg)', glow: 'rgba(59,130,246,0.10)', color: 'var(--accent-hi)', btn: 'btn-primary' },
    warning: { border: 'var(--warning-border)', bg: 'var(--warning-bg)', glow: 'rgba(245,158,11,0.10)', color: 'var(--warning)', btn: 'btn-secondary' },
    muted:   { border: 'var(--border-2)', bg: 'var(--bg-1)', glow: 'rgba(255,255,255,0.02)', color: 'var(--fg-2)', btn: 'btn-secondary' },
  };
  const t = tones[tone] || tones.muted;
  return (
    <div style={{
      background: `linear-gradient(180deg, ${t.bg}, var(--bg-1))`,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--r-lg)',
      padding: '20px 22px',
      marginBottom: 20,
      display: 'flex', alignItems: 'flex-start', gap: 16,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(500px 200px at 90% 0%, ${t.glow}, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: t.bg, color: t.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: `1px solid ${t.border}`,
        position: 'relative', zIndex: 1,
      }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div className="h-eyebrow" style={{ marginBottom: 6, color: t.color, fontSize: 10.5 }}>{eyebrow}</div>
        <h3 style={{
          fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--fg-0)',
          margin: 0, fontWeight: 400, letterSpacing: '-0.015em', lineHeight: 1.25,
        }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6, lineHeight: 1.55, maxWidth: 560 }}>{desc}</p>

        {chips && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {chips.map(c => (
              <span key={c.label} className="chip" style={{ fontSize: 11 }}>
                <Icon name={c.icon} size={10} style={{ marginRight: 5, color: 'var(--fg-3)' }} />
                {c.label}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className={`btn ${t.btn} btn-sm`} onClick={onAction} disabled={loading}>
            {loading ? <Spinner size={11} inline /> : <Icon name={actionIcon} size={12} />}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function KYCBanner({ stripe, trustProfile, role, onConnect, onboardingLoading }) {
  if (role === 'individual') return null;

  const isOnboarded = stripe?.onboarding_complete;
  const hasCall = !!trustProfile?.has_verification_call;
  const hasPending = stripe?.account_id === 'pending_stripe_integration';

  if (isOnboarded) {
    return (
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--success-border)',
        borderRadius: 'var(--r-md)',
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--success-bg)', color: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="check-circle" size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
            Cont bancar conectat și verificat
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
            Retragerile sunt procesate automat în 1–3 zile lucrătoare.
          </div>
        </div>
      </div>
    );
  }

  if (!hasCall) {
    return (
      <BannerShell
        tone="muted"
        icon="phone"
        eyebrow="Pas 1 din 2 · Verificare KYC"
        title="Așteaptă apelul de verificare cu administratorul"
        desc="Înainte de a-ți conecta contul bancar, un administrator ESCRO face un scurt apel video de verificare KYC (5–10 minute). De obicei se rezolvă în 24h."
        actionLabel="Vezi statusul verificării"
        actionIcon="eye"
        onAction={onConnect}
        loading={onboardingLoading}
      />
    );
  }

  if (hasCall && !isOnboarded && !hasPending) {
    return (
      <BannerShell
        tone="accent"
        icon="credit-card"
        eyebrow="Pas 2 din 2 · Cont bancar"
        title="Conectează-ți contul bancar pentru a primi plăți"
        desc="Verificarea KYC e completă. Pasul următor: introduci datele de identitate la Stripe și conectezi un IBAN românesc. Procesul durează ~5 minute."
        actionLabel="Începe conectarea Stripe"
        actionIcon="link"
        onAction={onConnect}
        loading={onboardingLoading}
        chips={[
          { label: 'Securizat de Stripe', icon: 'lock' },
          { label: 'Datele tale nu pleacă din UE', icon: 'shield' },
          { label: '5 minute', icon: 'clock' },
        ]}
      />
    );
  }

  return (
    <BannerShell
      tone="warning"
      icon="clock"
      eyebrow="În procesare"
      title="Conectarea Stripe e în curs de finalizare"
      desc="Procesatorul tău este în curs de aprobare. Vei putea cere retrageri imediat ce conexiunea e activă. De obicei durează maxim 24h."
      actionLabel="Verifică statusul"
      actionIcon="refresh"
      onAction={onConnect}
      loading={onboardingLoading}
    />
  );
}

function SegmentControl({ value, onChange, options }) {
  return (
    <div className="tabs-v3" style={{ flexShrink: 0 }}>
      {options.map(opt => (
        <div key={opt.value}
          className={`tab-v3 ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {opt.count != null && <span className="count">{opt.count}</span>}
        </div>
      ))}
    </div>
  );
}

function TransactionRow({ tx, last, onInvoice }) {
  const meta = TX_TYPES[tx.type] || TX_TYPES.milestone_payment;
  const pos = meta.sign === '+';
  const status = STATUS_PILL[tx.status] || STATUS_PILL.paid;
  const amountColor = pos ? 'var(--success)' : 'var(--fg-1)';
  const iconColor = pos ? 'var(--success)' : 'var(--fg-3)';
  const iconBg = pos ? 'var(--success-bg)' : 'var(--border-1)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px minmax(0,1fr) auto auto auto',
      gap: 14, alignItems: 'center',
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border-1)',
      transition: 'background 120ms',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--border-1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={meta.icon} size={14} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: 'var(--fg-0)', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{tx.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)' }}>
            {fmtDateTime(tx.date)}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-4)' }} />
          <span style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{meta.label}</span>
        </div>
      </div>
      <span className={`badge ${status.cls}`} style={{ fontSize: 10.5 }}>{status.label}</span>
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 600,
        color: amountColor, textAlign: 'right', whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {meta.sign}{fmtRON(tx.amount)}
      </div>
      <div style={{ width: 32, textAlign: 'right' }}>
        {tx.type === 'milestone_payment' && tx.milestone_id && (
          <button
            className="icon-btn"
            title="Descarcă factura"
            onClick={() => onInvoice?.(tx.milestone_id)}
            style={{ width: 28, height: 28 }}
          >
            <Icon name="download" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyTransactions({ onCTA }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
        background: 'var(--accent-bg)', color: 'var(--accent-hi)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--accent-border)',
      }}>
        <Icon name="wallet" size={22} />
      </div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--fg-0)', marginBottom: 6 }}>
        Niciun <em style={{ color: 'var(--accent-hi)' }}>câștig</em> încă
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', maxWidth: 360, margin: '0 auto 18px' }}>
        Prima ta tranzacție apare aici imediat după ce un milestone e aprobat și suma e eliberată din escrow.
      </div>
      <button className="btn btn-primary" onClick={onCTA}>
        <Icon name="search" size={14} /> Vezi proiecte
      </button>
    </div>
  );
}

function TransactionsCard({ transactions, onCTA, onInvoice }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState('30');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const cutoff = period === 'all' ? 0 : Date.now() - parseInt(period, 10) * 86400000;
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (cutoff && new Date(t.date).getTime() < cutoff) return false;
      return true;
    });
  }, [transactions, typeFilter, period]);

  const counts = useMemo(() => {
    const cutoff = period === 'all' ? 0 : Date.now() - parseInt(period, 10) * 86400000;
    const inP = transactions.filter(t => !cutoff || new Date(t.date).getTime() >= cutoff);
    return {
      all: inP.length,
      milestone_payment: inP.filter(t => t.type === 'milestone_payment').length,
      payout: inP.filter(t => t.type === 'payout').length,
      referral: inP.filter(t => t.type === 'referral').length,
      refund: inP.filter(t => t.type === 'refund').length,
    };
  }, [transactions, period]);

  const totalNet = useMemo(
    () => filtered.reduce((sum, t) => sum + (TX_TYPES[t.type]?.sign === '+' ? t.amount : -t.amount), 0),
    [filtered]
  );

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-1)', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 className="s-title" style={{ fontSize: 18 }}>Tranzacții</h2>
          {transactions.length > 0 && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              {filtered.length} {filtered.length === 1 ? 'tranzacție' : 'tranzacții'}
              {filtered.length > 0 && (
                <> · net <span style={{ color: totalNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {totalNet >= 0 ? '+' : '−'}{fmtRON(Math.abs(totalNet))}
                </span></>
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SegmentControl
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7',   label: '7z' },
              { value: '30',  label: '30z' },
              { value: '90',  label: '90z' },
              { value: 'all', label: 'Tot' },
            ]}
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFilters(v => !v)}
            style={{ border: '1px solid var(--border-1)' }}
          >
            <Icon name="filter" size={12} /> Tip
            {typeFilter !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border-1)',
          background: 'var(--bg-1)', display: 'flex', gap: 6, flexWrap: 'wrap',
        }}>
          {[
            { v: 'all',               l: 'Toate',            c: counts.all },
            { v: 'milestone_payment', l: 'Câștiguri',        c: counts.milestone_payment },
            { v: 'payout',            l: 'Retrageri',        c: counts.payout },
            { v: 'referral',          l: 'Recomandări',      c: counts.referral },
            { v: 'refund',            l: 'Restituiri',       c: counts.refund },
          ].map(f => (
            <button key={f.v}
              onClick={() => setTypeFilter(f.v)}
              className={`tab-v3 ${typeFilter === f.v ? 'active' : ''}`}
              style={{ cursor: 'pointer', border: 0, padding: '4px 10px' }}
            >
              {f.l} <span className="count">{f.c}</span>
            </button>
          ))}
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyTransactions onCTA={onCTA} />
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
          Nicio tranzacție pentru filtrele selectate.
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setTypeFilter('all'); setPeriod('all'); }}>
              Resetează filtre
            </button>
          </div>
        </div>
      ) : (
        <div>
          {filtered.map((t, i) => (
            <TransactionRow key={t.id} tx={t} last={i === filtered.length - 1} onInvoice={onInvoice} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyPayouts({ onCTA, disabled }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
        background: 'var(--bg-1)', color: 'var(--fg-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-2)',
      }}>
        <Icon name="arrow-up-circle" size={22} />
      </div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: 'var(--fg-0)', marginBottom: 6 }}>
        Niciun <em style={{ color: 'var(--accent-hi)' }}>payout</em> cerut
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', maxWidth: 360, margin: '0 auto 18px' }}>
        Când ai sold disponibil, cere o retragere către contul tău bancar. Procesare 1–3 zile lucrătoare.
      </div>
      <button className="btn btn-primary" onClick={onCTA} disabled={disabled}>
        <Icon name="arrow-up-circle" size={14} /> Cere primul payout
      </button>
    </div>
  );
}

function PayoutsCard({ payouts, onCancel, onRequestNew, canPayout }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = payouts.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const counts = {
    all: payouts.length,
    pending: payouts.filter(p => p.status === 'pending').length,
    paid: payouts.filter(p => p.status === 'paid').length,
    failed: payouts.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="card">
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-1)', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 className="s-title" style={{ fontSize: 18 }}>Retrageri</h2>
          {payouts.length > 0 && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              {filtered.length} cereri
            </span>
          )}
        </div>
        {payouts.length > 0 && (
          <SegmentControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',     label: 'Toate',    count: counts.all },
              { value: 'pending', label: 'Pending',  count: counts.pending },
              { value: 'paid',    label: 'Plătite',  count: counts.paid },
              ...(counts.failed > 0 ? [{ value: 'failed', label: 'Eșuate', count: counts.failed }] : []),
            ]}
          />
        )}
      </div>

      {payouts.length === 0 ? (
        <EmptyPayouts onCTA={onRequestNew} disabled={!canPayout} />
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
          Nicio retragere pentru filtrul selectat.
        </div>
      ) : (
        <table className="tbl tbl-stack" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Solicitat</th>
              <th>Sumă</th>
              <th>Status</th>
              <th>Procesat</th>
              <th style={{ textAlign: 'right' }}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const status = STATUS_PILL[p.status] || STATUS_PILL.pending;
              return (
                <tr key={p.id}>
                  <td data-primary data-label="Solicitat">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--fg-0)', fontWeight: 500, fontSize: 13 }}>{fmtDate(p.requested_at)}</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-4)' }}>
                        #{String(p.id).slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td data-label="Sumă" style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtRON(p.amount_ron)}
                  </td>
                  <td data-label="Status"><span className={`badge ${status.cls}`}>{status.label}</span></td>
                  <td data-label="Procesat" style={{ color: 'var(--fg-3)' }}>{p.processed_at ? fmtDate(p.processed_at) : '—'}</td>
                  <td data-actions style={{ textAlign: 'right' }}>
                    {p.status === 'pending' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onCancel?.(p)} style={{ color: 'var(--danger)' }}>
                        <Icon name="x" size={11} /> Anulează
                      </button>
                    )}
                    {p.status === 'failed' && (
                      <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                        <Icon name="phone" size={10} /> Contactează admin
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PayoutModal({ open, onClose, available, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const amtNum = parseFloat((amount || '').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  const amtValid = amtNum >= 50 && amtNum <= available && Number.isFinite(amtNum);
  const canSubmit = amtValid && !submitting;

  const fmtAmount = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(n));

  const handleQuick = (frac) => {
    const val = Math.floor(available * frac);
    setAmount(String(val));
  };

  const handleSubmit = async () => {
    setError('');
    if (!amtValid) { setError(`Suma trebuie să fie între 50 și ${fmtRON(available)}.`); return; }
    setSubmitting(true);
    try {
      await onSubmit({ amount: amtNum });
    } catch (e) {
      setError(e?.message || 'Eroare la trimiterea cererii.');
    } finally {
      setSubmitting(false);
    }
  };

  const fee = 0;
  const net = amtNum - fee;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      backdropFilter: 'blur(6px)',
      animation: 'fade-up 200ms ease-out',
    }}
      onClick={onClose}
    >
      <div className="modal-md" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-1)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border-2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        maxWidth: 480, overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              color: 'var(--accent-hi)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="arrow-up-circle" size={16} />
            </div>
            <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--fg-0)', margin: 0, fontWeight: 400, letterSpacing: '-0.015em' }}>
              Cere <em style={{ color: 'var(--accent-hi)' }}>retragere</em>
            </h3>
            <button className="icon-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>
            Disponibil: <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)', fontWeight: 600 }}>{fmtRON(available)}</span>
            <span style={{ color: 'var(--fg-4)', marginLeft: 8 }}>· minim 50 RON</span>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <label className="label" style={{ marginBottom: 6 }}>Sumă de retras</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={amount ? fmtAmount(amtNum) : ''}
              onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              style={{
                fontFamily: 'var(--f-mono)', fontSize: 22, padding: '14px 60px 14px 16px',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
              }}
            />
            <span style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--fg-3)',
              letterSpacing: '0.05em',
            }}>RON</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { l: '1/4', f: 0.25 },
              { l: '1/2', f: 0.5 },
              { l: 'Tot disponibilul', f: 1 },
            ].map(q => (
              <button key={q.l}
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuick(q.f)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5 }}
              >
                {q.l}
              </button>
            ))}
          </div>

          {amtNum > available && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert-circle" size={11} /> Suma depășește disponibilul ({fmtRON(available)}).
            </div>
          )}
          {amtNum > 0 && amtNum < 50 && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={11} /> Suma minimă: 50 RON.
            </div>
          )}

          <div style={{
            marginTop: 18, padding: '12px 14px',
            background: 'var(--accent-bg)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Icon name="info" size={13} style={{ color: 'var(--accent-hi)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.5 }}>
              Plata se face automat în contul IBAN configurat în <strong>Stripe Connect</strong> (din onboarding).
              Nu trebuie să-l reintroduci aici.
            </div>
          </div>

          <div style={{
            marginTop: 18, padding: '12px 14px',
            background: 'var(--bg-2)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border-1)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-2)' }}>Sumă cerută</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fg-1)' }}>{fmtRON(amtNum)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-2)' }}>Comision platformă</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fg-1)' }}>{fmtRON(fee)}</span>
            </div>
            <div style={{ height: 1, background: 'var(--border-1)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--fg-0)' }}>Primești în cont</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)', fontSize: 15 }}>{fmtRON(Math.max(0, net))}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11.5, color: 'var(--fg-3)' }}>
            <Icon name="clock" size={11} />
            <span>Procesare estimată: <strong style={{ color: 'var(--fg-2)' }}>1–3 zile lucrătoare</strong></span>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              borderRadius: 6, fontSize: 12, color: 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="alert-circle" size={12} /> {error}
            </div>
          )}
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border-1)',
          background: 'var(--bg-0)',
          display: 'flex', gap: 10,
        }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: '0 0 auto' }}>
            Anulează
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{ flex: 1 }}
          >
            {submitting ? <Spinner size={12} inline /> : <Icon name="arrow-up-circle" size={13} />}
            Cere payout {amtNum > 0 ? fmtRON(amtNum) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tones = {
    success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success)', icon: 'check-circle' },
    error:   { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)', icon: 'alert-circle' },
    info:    { bg: 'var(--accent-bg)', border: 'var(--accent-border)', color: 'var(--accent-hi)', icon: 'info' },
  };
  const t = tones[toast.tone] || tones.info;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 2000, animation: 'fade-up 200ms ease-out',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px 12px 14px',
        background: 'var(--bg-2)',
        border: `1px solid ${t.border}`,
        borderRadius: 999,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        minWidth: 280,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: t.bg, color: t.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={t.icon} size={12} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--fg-0)' }}>{toast.message}</span>
        <button className="icon-btn" onClick={onClose} style={{ width: 24, height: 24, marginLeft: 4 }}>
          <Icon name="x" size={11} />
        </button>
      </div>
    </div>
  );
}

export default function WalletDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [balance, setBalance] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [balRes, earnRes, payRes, tpRes] = await Promise.all([
        axios.get('/api/wallet/balance', { headers }),
        axios.get('/api/wallet/earnings?limit=100', { headers }),
        axios.get('/api/wallet/payouts', { headers }),
        axios.get('/api/trust-profiles/my-trust-profile', { headers }).catch(() => ({ data: null })),
      ]);
      setBalance(balRes.data.balance);
      setStripe(balRes.data.stripe);
      setEarnings(earnRes.data.earnings || []);
      setPayouts(payRes.data.payouts || []);
      setTrustProfile(tpRes.data?.trust_profile || tpRes.data || null);
    } catch (e) {
      console.error('Wallet fetch error:', e);
      if (!silent) setToast({ tone: 'error', message: 'Eroare la încărcarea portofelului.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeSetup = params.get('stripe_setup');
    if (stripeSetup === 'done') {
      fetchData(true);
      setToast({ tone: 'info', message: 'Bine ai revenit! Statusul contului Stripe se actualizează…' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeSetup === 'refresh') {
      setToast({ tone: 'error', message: 'Link-ul de onboarding a expirat. Reia procesul.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchData]);

  const handleOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const res = await axios.post('/api/stripe/onboarding', {}, { headers });
      if (res.data.onboarding_url) {
        if (res.data.mock) {
          setToast({ tone: 'info', message: res.data.message || 'Stripe nu este configurat (mock).' });
          setOnboardingLoading(false);
          return;
        }
        window.location.assign(res.data.onboarding_url);
        return;
      }
      setToast({ tone: 'success', message: res.data.message || 'Înregistrat.' });
      fetchData(true);
    } catch (e) {
      setToast({ tone: 'error', message: e.response?.data?.error || 'A apărut o eroare. Încearcă din nou.' });
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handlePayoutSubmit = async ({ amount }) => {
    try {
      await axios.post('/api/wallet/payout', { amount_ron: amount }, { headers });
      setShowPayoutModal(false);
      setToast({ tone: 'success', message: `Cerere de retragere ${fmtRON(amount)} înregistrată.` });
      fetchData(true);
    } catch (e) {
      const msg = e.response?.data?.error || 'Eroare la trimiterea cererii.';
      throw new Error(msg);
    }
  };

  const handleCancelPayout = async (p) => {
    if (!window.confirm(`Anulează cererea de retragere de ${fmtRON(p.amount_ron)}?`)) return;
    try {
      await axios.delete(`/api/wallet/payout/${p.id}`, { headers });
      setToast({ tone: 'info', message: `Cererea de retragere ${fmtRON(p.amount_ron)} a fost anulată.` });
      fetchData(true);
    } catch (e) {
      setToast({ tone: 'error', message: e.response?.data?.error || 'Eroare la anularea cererii.' });
    }
  };

  const handleContactAdmin = () => {
    setToast({ tone: 'info', message: 'Contactează echipa de suport prin chat sau email pentru recuperarea transferului.' });
  };

  const handleNoTransactionsCTA = () => {
    navigate(user?.role === 'expert' ? '/marketplace' : '/projects');
  };

  const handleInvoice = async (milestoneId) => {
    try {
      const r = await axios.get(`/api/milestones/${milestoneId}/invoice`, { headers });
      if (r.data.invoice_url) window.open(r.data.invoice_url, '_blank');
    } catch {
      setToast({ tone: 'error', message: 'Factura nu a putut fi generată.' });
    }
  };

  if (loading) return <div className="escro-page"><Spinner /></div>;

  const transactions = buildTransactions(earnings, payouts);
  const days = buildDays(earnings);
  const canPayout = stripe?.onboarding_complete && balance.available >= 50;

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 1100 }}>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="h-eyebrow">
            <Icon name="wallet" size={11} style={{ color: 'var(--accent-hi)' }} />
            Portofel · {user?.name}
          </div>
          <h1 className="h-title" style={{ fontSize: 'clamp(28px, 4.5vw, 38px)', margin: '4px 0 4px' }}>
            Câștiguri & <em>retrageri</em>
          </h1>
          <p className="h-sub">
            Vizualizează soldul, istoricul tranzacțiilor și cere payout către contul bancar.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{ border: '1px solid var(--border-1)' }}
          >
            {refreshing ? <Spinner size={11} inline /> : <Icon name="refresh" size={12} />} Actualizează
          </button>
        </div>
      </div>

      {balance.failed_transfer > 0 && (
        <FailedTransferAlert amount={balance.failed_transfer} onContact={handleContactAdmin} />
      )}

      <KYCBanner
        stripe={stripe}
        trustProfile={trustProfile}
        role={user?.role}
        onConnect={handleOnboarding}
        onboardingLoading={onboardingLoading}
      />

      <SoldHero
        balance={balance}
        days={days}
        onPayoutClick={() => setShowPayoutModal(true)}
        canPayout={canPayout}
      />

      <TransactionsCard
        transactions={transactions}
        onCTA={handleNoTransactionsCTA}
        onInvoice={handleInvoice}
      />

      <PayoutsCard
        payouts={payouts}
        onCancel={handleCancelPayout}
        onRequestNew={() => setShowPayoutModal(true)}
        canPayout={canPayout}
      />

      <PayoutModal
        open={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        available={balance.available}
        onSubmit={handlePayoutSubmit}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
