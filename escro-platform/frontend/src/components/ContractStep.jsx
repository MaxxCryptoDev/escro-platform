import { Icon } from './ui';

export default function ContractStep({ stepNum, title, description, status, children }) {
  const statusConfig = {
    done:           { dot: 'var(--success)',  dotText: '#fff',          icon: 'check', border: 'var(--success-border)', bg: 'var(--bg-0)' },
    in_progress:    { dot: 'var(--accent)',   dotText: '#fff',          icon: null,    border: 'var(--accent)',         bg: 'var(--bg-0)' },
    pending_action: { dot: 'var(--warning)',  dotText: '#fff',          icon: null,    border: 'var(--warning-border)', bg: 'var(--warning-bg)' },
    locked:         { dot: 'var(--border-2)', dotText: 'var(--fg-4)',   icon: null,    border: 'var(--border-1)',       bg: 'var(--bg-1)' },
  };
  const cfg = statusConfig[status] || statusConfig.locked;

  return (
    <div className="card" style={{ borderColor: cfg.border, opacity: status === 'locked' ? 0.6 : 1 }}>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: cfg.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700, color: cfg.dotText }}>
            {status === 'done' ? <Icon name="check" size={15} style={{ color: '#fff' }} /> : stepNum}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: children ? '1rem' : 0 }}>{description}</div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
