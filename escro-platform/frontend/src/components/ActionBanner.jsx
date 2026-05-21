import { Icon } from './ui';
import './ActionBanner.css';

export default function ActionBanner({ tone, eyebrow, title, body, primary, secondary, icon }) {
  const fallbackIcon = tone === 'success' ? 'star' : tone === 'accent' ? 'flag' : 'alert-triangle';
  return (
    <div className={`ad-action-banner ad-action-banner--${tone}`} role="region">
      <div className="ad-ab-icon" aria-hidden="true">
        <Icon name={icon || fallbackIcon} size={18} />
      </div>
      <div className="ad-ab-body">
        {eyebrow && <div className="ad-ab-eyebrow">{eyebrow}</div>}
        <div className="ad-ab-title">{title}</div>
        {body && <div className="ad-ab-text">{body}</div>}
      </div>
      <div className="ad-ab-actions">
        {primary && (
          <button className="btn btn-primary ad-ab-primary" onClick={primary.onClick}>
            {primary.icon && <Icon name={primary.icon} size={13} />} {primary.label}
          </button>
        )}
        {secondary && (
          <button className="btn btn-secondary" onClick={secondary.onClick}>
            {secondary.icon && <Icon name={secondary.icon} size={13} />} {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
