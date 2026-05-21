/* Shared components: Icons, Avatar, Badge, Bar, Stat, Trust */

// Inline SVG icons
const ICONS = {
  home: 'M3 12 12 4l9 8M5 10v10h14V10',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  briefcase: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
  kanban: 'M3 4h6v16H3zM11 4h6v10h-6zM19 4h2v6h-2',
  users: 'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 19v-2a4 4 0 0 0-3-3.87M16 1.13A4 4 0 0 1 16 9',
  user: 'M20 19v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  shield: 'M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z',
  building: 'M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18M9 22V12h6v10M8 6h2M8 9h2M14 6h2M14 9h2',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v3M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3M3 7v4h17V8a1 1 0 0 0-1-1zM17 14h2',
  plus: 'M12 5v14M5 12h14',
  gift: 'M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  lock: 'M5 11h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2M7 11V7a5 5 0 0 1 10 0v4',
  check: 'M5 12l5 5L20 7',
  'arrow-r': 'M5 12h14M13 5l7 7-7 7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M5 12l7 7 7-7',
  'chevron-r': 'M9 6l6 6-6 6',
  paper: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  doc: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  flag: 'M4 22V4M4 4s2-2 6-2 6 2 10 2v12c-4 0-6-2-10-2s-6 2-6 2',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  scale: 'M12 3v18M3 7h18M7 7l-4 8a4 4 0 0 0 8 0zM17 7l-4 8a4 4 0 0 0 8 0z',
  star: 'M12 2l3 7 7 .6-5.4 4.7L18 22l-6-3.5L6 22l1.4-7.7L2 9.6 9 9z',
  play: 'M5 3l14 9-14 9z',
  sparkle: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

function I({ name, size = 16, className = '', style = {} }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0, ...style }}>
      <path d={d} />
    </svg>
  );
}

const PALETTE = [
  ['#7d8a8c', '#3a3f40'], // 0 system
  ['#c8d4e5', '#1f3855'], // 1 blue
  ['#e2c9d4', '#5a2940'], // 2 rose
  ['#d4dec5', '#3a4a26'], // 3 sage
  ['#e8d8b8', '#4f3a16'], // 4 gold
  ['#cbd6d5', '#243a37'], // 5 teal
  ['#d8c4d4', '#3d1d3a'], // 6 plum
];

function Avatar({ name = '', color = 1, size = 'md', online = false }) {
  const [bg, fg] = PALETTE[color] || PALETTE[1];
  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '·';
  const sizes = { sm: 26, md: 36, lg: 48, xl: 80 };
  const fontSize = { sm: 10, md: 13, lg: 16, xl: 26 };
  const s = sizes[size];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: s, height: s, borderRadius: '50%',
        background: bg, color: fg,
        display: 'grid', placeItems: 'center',
        fontSize: fontSize[size], fontWeight: 500,
        fontFamily: 'var(--f-display)', letterSpacing: '0.02em',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>{initials}</div>
      {online && <span style={{
        position: 'absolute', bottom: -1, right: -1,
        width: Math.max(s * 0.28, 8), height: Math.max(s * 0.28, 8), borderRadius: '50%',
        background: 'var(--ok)', border: '2px solid var(--bg-1)',
      }} />}
    </div>
  );
}

function Badge({ tone = 'neutral', children, noDot = false }) {
  return <span className={`badge b-${tone}${noDot ? ' no-dot' : ''}`}>{!noDot && <span className="dot" />}{children}</span>;
}

function Bar({ value = 0, tone = 'acc' }) {
  return (
    <div className="bar"><div className="bar-fill" style={{ width: `${value}%`, background: tone === 'acc' ? 'var(--acc)' : 'var(--info)' }} /></div>
  );
}

function Stat({ label, value, unit, delta, deltaDir, sublabel, icon }) {
  return (
    <div className="stat">
      <div className="stat-h">
        <div className="stat-l">{label}</div>
        {icon && <div className="stat-i"><I name={icon} size={13} /></div>}
      </div>
      <div className="stat-v"><em>{value}</em>{unit && <span className="stat-u">{unit}</span>}</div>
      <div className="stat-f">
        {delta && <span className={`stat-d ${deltaDir === 'down' ? 'down' : ''}`}><I name={deltaDir === 'down' ? 'arrow-down' : 'arrow-up'} size={10} /> {delta}</span>}
        {sublabel && <span className="muted-2" style={{ fontSize: 11 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

function Trust({ level = 5 }) {
  return (
    <div className="trust">
      <div className="trust-l">Trust L{level}</div>
      <div className="trust-d">
        {[1,2,3,4,5].map(n => <span key={n} className={`trust-pip ${n <= level ? 'on' : ''}`} />)}
      </div>
    </div>
  );
}

Object.assign(window, { I, Avatar, Badge, Bar, Stat, Trust });
