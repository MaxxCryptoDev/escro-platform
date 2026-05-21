/* UI primitives — icons, avatars, badges, etc. */

const I = ({ name, size = 16, stroke = 1.6, ...rest }) => {
  const s = size, sw = stroke;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest };
  switch (name) {
    case 'home':       return <svg {...common}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>;
    case 'folder':     return <svg {...common}><path d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>;
    case 'briefcase':  return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>;
    case 'users':      return <svg {...common}><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="8" r="2.6"/><path d="M21 19a5 5 0 0 0-3.5-4.7"/></svg>;
    case 'user':       return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
    case 'kanban':     return <svg {...common}><rect x="3" y="4" width="6" height="16" rx="1"/><rect x="11" y="4" width="6" height="9" rx="1"/><rect x="19" y="4" width="2" height="6" rx="1"/></svg>;
    case 'plus':       return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'gift':       return <svg {...common}><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M12 9v11M8 9a2.5 2.5 0 1 1 0-5c2 0 4 5 4 5S10 9 8 9zM16 9a2.5 2.5 0 1 0 0-5c-2 0-4 5-4 5s2 0 4 0z"/></svg>;
    case 'gear':       return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h0a1 1 0 0 0 .6-.9V5a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v0a1 1 0 0 0 .9.6H19a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z"/></svg>;
    case 'shield':     return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>;
    case 'logout':     return <svg {...common}><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H10"/></svg>;
    case 'search':     return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>;
    case 'bell':       return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/></svg>;
    case 'help':       return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4M12 17h.01"/></svg>;
    case 'chevron-r':  return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-d':  return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'arrow-r':    return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-up':   return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down': return <svg {...common}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case 'check':      return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case 'lock':       return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'unlock':     return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 7-2.6"/></svg>;
    case 'send':       return <svg {...common}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case 'paper':      return <svg {...common}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
    case 'hash':       return <svg {...common}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>;
    case 'building':   return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>;
    case 'sparkle':    return <svg {...common}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>;
    case 'dot':        return <svg {...common}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case 'menu':       return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'globe':      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case 'flag':       return <svg {...common}><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>;
    case 'doc':        return <svg {...common}><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/></svg>;
    case 'star':       return <svg {...common}><path d="M12 3l2.6 5.5L20 9.3l-4 4 1 5.7-5-2.7L7 19l1-5.7-4-4 5.4-.8z"/></svg>;
    case 'spark':      return <svg {...common}><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>;
    case 'pin':        return <svg {...common}><path d="M12 21v-7M8 14h8l-2-9 3-3H7l3 3z"/></svg>;
    case 'play':       return <svg {...common}><path d="M6 4l13 8-13 8z"/></svg>;
    case 'wallet':     return <svg {...common}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/></svg>;
    case 'scale':      return <svg {...common}><path d="M12 3v18M5 8h14M5 8l-2 6h4zM19 8l2 6h-4z"/></svg>;
    default: return null;
  }
};

const Avatar = ({ name = '', size = 'md', color, online, src }) => {
  const initials = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const cls = ['av', size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : '', color ? `av-c${color}` : '', online ? 'av-pulse' : ''].filter(Boolean).join(' ');
  return <span className={cls}>{src ? <img src={src} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} alt="" /> : initials}</span>;
};

const Badge = ({ children, tone = 'grey', noDot, ...rest }) => {
  const map = { ok: 'b-ok', warn: 'b-warn', err: 'b-err', info: 'b-info', acc: 'b-acc', grey: '' };
  return <span className={`badge ${map[tone] || ''} ${noDot ? 'no-dot' : ''}`} {...rest}>{children}</span>;
};

const Trust = ({ level = 4, max = 5 }) => (
  <div className="trust" title={`Trust nivel ${level}/${max}`}>
    <div className="trust-bars">
      {Array.from({ length: max }).map((_, i) => <span key={i} className={i < level ? 'on' : ''} />)}
    </div>
    <span>L{level}</span>
  </div>
);

const Bar = ({ value, max = 100 }) => (
  <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
);

const Stat = ({ label, value, unit, sublabel, delta, deltaDir = 'up', icon }) => (
  <div className="stat">
    <div className="stat-l">{icon && <I name={icon} size={11} />} {label}</div>
    <div className="stat-v">{value}{unit && <span className="sm">{unit}</span>}</div>
    {(sublabel || delta) && (
      <div className="stat-m">
        {delta && <span className={deltaDir}>{deltaDir === 'up' ? '↑' : '↓'} {delta}</span>}
        {sublabel && <span>{sublabel}</span>}
      </div>
    )}
  </div>
);

Object.assign(window, { I, Avatar, Badge, Trust, Bar, Stat });
