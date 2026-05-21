/* ESCRO — Shared UI component library */
import { useState, useEffect, useRef } from 'react';

// ——— Icon ———
export function Icon({ name, size = 16, style, className, ...rest }) {
  const sw = 1.7;
  const c = 'currentColor';
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: c, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
    style, className, ...rest,
  };
  switch (name) {
    case 'home': return <svg {...common}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5"/></svg>;
    case 'briefcase': return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/><path d="M3 13h18"/></svg>;
    case 'layers': return <svg {...common}><path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 12l10 6 10-6"/><path d="M2 16l10 6 10-6"/></svg>;
    case 'tag': return <svg {...common}><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1"/></svg>;
    case 'folder': return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>;
    case 'users':
    case 'people': return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.5"/><path d="M14 14.5a4.5 4.5 0 017.5 3.5"/></svg>;
    case 'scale': return <svg {...common}><path d="M12 3v18M5 7h14M5 7l-2 7a4 4 0 008 0L9 7M19 7l-2 7a4 4 0 008 0l-2-7"/></svg>;
    case 'pick': return <svg {...common}><path d="M9 11l3 3 8-8M5 5l6 6M5 19l6-6M19 19l-6-6"/></svg>;
    case 'doc': return <svg {...common}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M9 14h6M9 18h4"/></svg>;
    case 'chat': return <svg {...common}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>;
    case 'restart': return <svg {...common}><path d="M3 12a9 9 0 1015-6.7L21 8M21 3v5h-5"/></svg>;
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>;
    case 'shield': return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>;
    case 'lock': return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
    case 'check': return <svg {...common}><path d="M5 12l4 4L19 6"/></svg>;
    case 'x': return <svg {...common}><path d="M6 6l12 12M6 18L18 6"/></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'arrow-right': return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-left': return <svg {...common}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>;
    case 'arrow-up-right': return <svg {...common}><path d="M7 17L17 7M9 7h8v8"/></svg>;
    case 'arrow-down': return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case 'arrow-up': return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-up-circle': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8 12l4-4 4 4"/></svg>;
    case 'arrow-down-circle': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12l4 4 4-4"/></svg>;
    case 'check-circle': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>;
    case 'alert-circle': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/></svg>;
    case 'alert-triangle': return <svg {...common}><path d="M12 3l11 18H1L12 3z"/><path d="M12 10v5M12 18h.01"/></svg>;
    case 'info': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>;
    case 'refresh': return <svg {...common}><path d="M3 12a9 9 0 0115-6.7L21 8M21 4v4h-4M21 12a9 9 0 01-15 6.7L3 16M3 20v-4h4"/></svg>;
    case 'reload': return <svg {...common}><path d="M3 12a9 9 0 0115-6.7L21 8M21 4v4h-4M21 12a9 9 0 01-15 6.7L3 16M3 20v-4h4"/></svg>;
    case 'hash': return <svg {...common}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>;
    case 'list': return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case 'user-plus': return <svg {...common}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><path d="M19 8v6M16 11h6"/></svg>;
    case 'download': return <svg {...common}><path d="M12 3v12M8 11l4 4 4-4"/><path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2"/></svg>;
    case 'credit-card': return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></svg>;
    case 'upload': return <svg {...common}><path d="M12 15V3M8 7l4-4 4 4"/><path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2"/></svg>;
    case 'chevron-down': return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-up': return <svg {...common}><path d="M18 15l-6-6-6 6"/></svg>;
    case 'external-link': return <svg {...common}><path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"/></svg>;
    case 'award': return <svg {...common}><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11"/></svg>;
    case 'check-square': return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 6-6"/></svg>;
    case 'chevron-right': return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>;
    case 'bell': return <svg {...common}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></svg>;
    case 'gear': return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 114.3 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 117 4.3l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case 'logout': return <svg {...common}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case 'message': return <svg {...common}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>;
    case 'message-circle': return <svg {...common}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/></svg>;
    case 'document': return <svg {...common}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>;
    case 'file': return <svg {...common}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M9 14h6M9 18h4"/></svg>;
    case 'file-text': return <svg {...common}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M9 14h6M9 18h4"/></svg>;
    case 'trending-up': return <svg {...common}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'user-check': return <svg {...common}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><path d="M16 11l2 2 4-4"/></svg>;
    case 'wallet': return <svg {...common}><path d="M3 8a2 2 0 012-2h13a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><path d="M16 14h2"/><path d="M3 10h17"/></svg>;
    case 'gift': return <svg {...common}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 13h18M12 8v13M9 8a2.5 2.5 0 010-5c2 0 3 2 3 5M15 8a2.5 2.5 0 000-5c-2 0-3 2-3 5"/></svg>;
    case 'inbox': return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3 7v6a2 2 0 01-2 2h-15a2 2 0 01-2-2v-6l3-7z"/></svg>;
    case 'sparkle': return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'spark': return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'target': return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
    case 'flag': return <svg {...common}><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></svg>;
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'star': return <svg {...common} fill="currentColor" stroke="none"><path d="M12 3l2.6 6 6.4.5-4.9 4.4 1.6 6.3L12 17l-5.7 3.2 1.6-6.3L3 9.5 9.4 9z"/></svg>;
    case 'star-outline': return <svg {...common}><path d="M12 3l2.6 6 6.4.5-4.9 4.4 1.6 6.3L12 17l-5.7 3.2 1.6-6.3L3 9.5 9.4 9z"/></svg>;
    case 'video': return <svg {...common}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l5-3v12l-5-3z"/></svg>;
    case 'share': return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case 'shield-check': return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'pin': return <svg {...common}><path d="M12 2L8 7v6l-4 4h16l-4-4V7l-4-5z"/><path d="M12 17v5"/></svg>;
    case 'menu': return <svg {...common}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'filter': return <svg {...common}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></svg>;
    case 'globe': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
    case 'phone': return <svg {...common}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.7.6 2.5a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.8.3 1.6.5 2.5.6a2 2 0 011.7 2z"/></svg>;
    case 'mail': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>;
    case 'edit': return <svg {...common}><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6M18.4 2.6a2 2 0 113 3L12 15l-4 1 1-4 9.4-9.4z"/></svg>;
    case 'pen': return <svg {...common}><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6M18.4 2.6a2 2 0 113 3L12 15l-4 1 1-4 9.4-9.4z"/></svg>;
    case 'alert': return <svg {...common}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86L1.82 18a2 2 0 001.7 3h16.94a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>;
    case 'more': return <svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'rotate': return <svg {...common}><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case 'check-double': return <svg {...common}><path d="M2 12l5 5L18 6"/><path d="M9 17L12 20 22 10"/></svg>;
    case 'trash': return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg>;
    case 'eye': return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off': return <svg {...common}><path d="M17 17a10 10 0 01-5 1.5c-6.5 0-10-7-10-7a18 18 0 014.3-5M9.9 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-2.2 3.2M2 2l20 20"/><path d="M14.1 14.1A3 3 0 019.9 9.9"/></svg>;
    case 'zap': return <svg {...common}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>;
    case 'trend': return <svg {...common}><path d="M3 17l6-6 4 4 8-8M14 7h7v7"/></svg>;
    case 'paperclip': return <svg {...common}><path d="M21 12.5l-8.5 8.5a5 5 0 11-7-7L14 5.5a3.5 3.5 0 015 5L9.5 20"/></svg>;
    case 'send': return <svg {...common}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>;
    case 'link': return <svg {...common}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>;
    case 'copy': return <svg {...common}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case 'play': return <svg {...common}><path d="M6 4l14 8-14 8V4z"/></svg>;
    case 'help': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 17h.01"/></svg>;
    case 'building': return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01"/></svg>;
    case 'image': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>;
    case 'camera': return <svg {...common}><path d="M3 7h3l2-3h8l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'drag': return <svg {...common}><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>;
    case 'verify': return <svg {...common}><path d="M12 2l2.4 2L17.5 4l1 3 3 1L21 11l1.5 3-2.4 2-.6 3.1L16 19l-2 2.5-2-2.5-3.5.1-.6-3.1L5.4 14 6.5 11 5 8l3-1 1-3 3.1.1L12 2z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'idea': return <svg {...common}><path d="M9 18h6M10 22h4M9 14a4 4 0 116 0c0 1.5-1 2-1 4H10c0-2-1-2.5-1-4z"/></svg>;
    case 'pulse': return <svg {...common}><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>;
    case 'kanban': return <svg {...common}><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="11" y="3" width="6" height="9" rx="1"/><rect x="19" y="3" width="2" height="6" rx="1"/></svg>;
    default: return null;
  }
}

// ——— Animated number ———
export function AnimatedNumber({ value, duration = 800, format = (v) => Math.round(v).toString() }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{format(display)}</span>;
}

// ——— Avatar ———
export function Avatar({ user, size = 'md', className = '' }) {
  if (!user) return null;
  const sizeClass = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : '';
  const initials = user.initials || user.name?.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className={`avatar ${sizeClass} ${user.color || ''} ${className}`} title={user.name}>
      {user.profile_image_url
        ? <img src={user.profile_image_url} alt={user.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : initials
      }
    </div>
  );
}

// ——— Badge ———
export function StatusBadge({ status, children, className = '' }) {
  const map = {
    active: 'badge-blue', review: 'badge-amber', completed: 'badge-green',
    dispute: 'badge-red', draft: 'badge-grey', pending_signature: 'badge-violet',
    approved: 'badge-green', in_progress: 'badge-blue', submitted: 'badge-amber',
    pending: 'badge-grey', disputed: 'badge-red', todo: 'badge-grey',
    pending_approval: 'badge-amber', rejected: 'badge-red', open: 'badge-amber',
    closed: 'badge-grey', verified: 'badge-green', unverified: 'badge-grey',
    assigned: 'badge-violet', pending_admin_approval: 'badge-grey',
    delivered: 'badge-blue', released: 'badge-violet',
  };
  const labels = {
    active: 'Activ', review: 'În revizuire', completed: 'Finalizat',
    dispute: 'În dispută', draft: 'Draft', pending_signature: 'Semnătură',
    approved: 'Aprobat', in_progress: 'În progres', submitted: 'Livrat',
    pending: 'În așteptare', disputed: 'În dispută', todo: 'De făcut',
    pending_approval: 'Spre aprobare', rejected: 'Respins', open: 'Așteptare prestator',
    closed: 'Închis', verified: 'Verificat', unverified: 'Neverificat',
    assigned: 'Asignat', pending_admin_approval: 'Fără task configurat',
    delivered: 'Livrat', released: 'Eliberat',
  };
  const cls = map[status] || 'badge-grey';
  return <span className={`badge ${cls} ${className}`}>{children || labels[status] || status}</span>;
}

// ——— Stat ———
export function Stat({ label, value, delta, deltaTone, suffix, prefix, format }) {
  const f = format || ((v) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(v)));
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {prefix}<AnimatedNumber value={value || 0} format={f} />{suffix}
      </div>
      {delta && (
        <div className="stat-meta">
          <span className={`delta-${deltaTone || 'up'}`}>{delta}</span>
          <span>vs luna trecută</span>
        </div>
      )}
    </div>
  );
}

// ——— Escrow bar ———
export function EscrowBar({ released, total }) {
  const pct = total > 0 ? Math.min(100, (released / total) * 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 80); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="escrow-bar">
      <div className="escrow-bar-fill" style={{ width: `${w}%` }} />
    </div>
  );
}

// ——— Escrow Vault ———
export function EscrowVault({ project }) {
  const { fmtRON, fmt } = useFormat();
  const released = project.released || 0;
  const escrow = project.escrow || 0;
  const total = project.budget || 0;
  const releasedPct = total ? (released / total) * 100 : 0;
  const escrowPct = total ? (escrow / total) * 100 : 0;
  return (
    <div className="escrow-vault">
      <div className="row-between" style={{ marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Buget total</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>
            <AnimatedNumber value={total} format={fmt} /> RON
          </div>
        </div>
        <div className="row" style={{ gap: '.5rem' }}>
          <Icon name="lock" size={14} />
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Conturi escrow separate</span>
        </div>
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--border-1)', marginBottom: '0.875rem' }}>
        <div style={{ width: `${releasedPct}%`, background: 'linear-gradient(90deg, var(--success), #34d399)', transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
        <div style={{ width: `${escrowPct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-hi))', transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1) .15s', boxShadow: '0 0 12px var(--accent-glow)' }} />
      </div>
      <div className="row" style={{ gap: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--success)', label: 'Eliberat expert', value: fmtRON(released) },
          { color: 'var(--accent)', label: 'Blocat în escrow', value: fmtRON(escrow) },
          { color: 'var(--border-2)', label: 'Restant nedepus', value: fmtRON(total - released - escrow) },
        ].map((it, i) => (
          <div key={i} className="row" style={{ gap: '.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: it.color }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{it.label}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{it.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ——— Milestone Timeline ———
export function MilestoneTimeline({ milestones = [], onClick }) {
  const { fmtRON, fmtDate } = useFormat();
  return (
    <div className="ms-timeline">
      {milestones.map((m, i) => {
        const cls = m.status === 'approved' ? 'done' : (m.status === 'in_progress' || m.status === 'submitted') ? 'active' : '';
        return (
          <div key={m.id || i} className={`ms-row ${cls}`} onClick={() => onClick && onClick(m)}>
            <div className="ms-dot">
              {m.status === 'approved' ? <Icon name="check" size={12} /> : String(i + 1).padStart(2, '0')}
            </div>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 4 }}>{m.title}</div>
                <div className="row" style={{ gap: '.75rem' }}>
                  <StatusBadge status={m.status} />
                  {m.deliveryDate && (
                    <span className="muted-2" style={{ fontSize: 11.5 }}>
                      <Icon name="calendar" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                      {fmtDate(m.deliveryDate || m.delivery_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: cls === 'done' ? 'var(--success)' : 'var(--fg-0)' }}>
                {fmtRON(m.amount || m.amount_ron || 0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ——— Page header ———
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-head fade-up">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

// ——— Loading spinner ———
export function Spinner({ size = 20, inline = false }) {
  const circle = (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: '2px solid var(--border-2)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
  if (inline) return <>{circle}<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {circle}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ——— Empty state ———
export function EmptyState({ icon = 'folder', title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-hi)' }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', marginBottom: '.375rem' }}>{title}</div>
      {description && <div className="muted-2" style={{ fontSize: 13 }}>{description}</div>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}

// ——— useFormat hook (format helpers) ———
export function useFormat() {
  return {
    fmt: (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n || 0),
    fmtRON: (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n || 0) + ' RON',
    fmtDate: (s) => {
      if (!s) return '—';
      const d = new Date(s);
      const months = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    },
  };
}
