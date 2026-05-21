import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Icon, Avatar } from './ui';
import { getInitials, avatarColor } from '../utils/format';
import axios from 'axios';

const CRUMBS = {
  '/company/dashboard': ['Workspace', 'Acasă'],
  '/individual/dashboard': ['Workspace', 'Acasă'],
  '/expert/dashboard':  ['Workspace', 'Acasă'],
  '/admin/dashboard':   ['Admin', 'Dashboard'],
  '/directory':         ['Workspace', 'Director experți'],
  '/create-project':    ['Acțiuni', 'Proiect nou'],
  '/profile-edit':      ['Cont', 'Editează profilul'],
  '/referral':          ['Acțiuni', 'Recomandă'],
  '/wallet':            ['Cont', 'Portofel'],
  '/wallet/earnings':   ['Cont', 'Portofel', 'Câștiguri'],
  '/wallet/payouts':    ['Cont', 'Portofel', 'Retrageri'],
  '/admin/financiar':   ['Admin', 'Financiar'],
  '/disputes':          ['Cont', 'Dispute'],
  '/my-projects':       ['Cont', 'Proiectele mele'],
  '/contracts':         ['Cont', 'Contracte'],
  '/forgot-password':   ['Cont', 'Resetare parolă'],
  '/reset-password':    ['Cont', 'Parolă nouă'],
};

function getBreadcrumbs(pathname) {
  const exact = CRUMBS[pathname];
  if (exact) return exact;
  if (pathname.startsWith('/project/') || pathname.startsWith('/company/project/') || pathname.startsWith('/expert/project/')) {
    return ['Workspace', 'Proiecte', pathname.split('/').pop()?.slice(0,10)];
  }
  if (pathname.startsWith('/profile/')) {
    return ['Cont', 'Profilul meu'];
  }
  return [];
}

// ——— Sidebar ———
function Sidebar({ pendingContractCount = 0, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role || localStorage.getItem('userRole');

  const isActive = (path) => {
    const [basePath, queryStr] = path.split('?');
    if (location.pathname !== basePath) return false;
    if (!queryStr) return !location.search;
    return location.search.includes(queryStr);
  };

  const navMain = role === 'admin' ? [
    { path: '/admin/dashboard',                 label: 'Overview',          icon: 'home' },
    { path: '/admin/dashboard?tab=users',       label: 'Utilizatori',       icon: 'users' },
    { path: '/admin/dashboard?tab=projects',    label: 'Proiecte & Task-uri', icon: 'folder' },
    { path: '/admin/dashboard?tab=tasks',       label: 'Task-uri pending',  icon: 'kanban' },
    { path: '/admin/dashboard?tab=dispute',     label: 'Dispute',           icon: 'shield' },
    { path: '/admin/dashboard?tab=calls',       label: 'Apeluri KYC',       icon: 'phone' },
    { path: '/admin/financiar',                 label: 'Financiar',         icon: 'trend' },
    { path: '/contracts',                       label: 'Contracte',         icon: 'file' },
  ] : role === 'expert' ? [
    { path: '/expert/dashboard',                label: 'Acasă',             icon: 'home' },
    { path: '/expert/dashboard?tab=lucrari',    label: 'Proiecte & Taskuri',icon: 'folder', badge: pendingContractCount || null },
    { path: '/marketplace',                     label: 'Marketplace',       icon: 'search' },
    { path: '/directory',                       label: 'Director parteneri',icon: 'users' },
    { path: '/chat',                            label: 'Chat',              icon: 'message' },
    { path: '/contracts',                       label: 'Contracte',         icon: 'file' },
    { path: '/disputes',                        label: 'Dispute',           icon: 'shield' },
  ] : (() => {
    const dashPath = role === 'individual' ? '/individual/dashboard' : '/company/dashboard';
    const items = [
      { path: dashPath,                         label: 'Acasă',             icon: 'home' },
      { path: `${dashPath}?tab=lucrari`,        label: 'Proiecte & Taskuri',icon: 'folder', badge: pendingContractCount || null },
    ];
    if (role === 'company') {
      items.push({ path: '/marketplace',        label: 'Marketplace',       icon: 'search' });
    }
    items.push(
      { path: '/directory',                     label: 'Parteneri',         icon: 'users' },
      { path: '/chat',                          label: 'Chat',              icon: 'message' },
      { path: '/contracts',                     label: 'Contracte',         icon: 'file' },
      { path: '/disputes',                      label: 'Dispute',           icon: 'shield' },
    );
    return items;
  })();

  const navSub = role === 'admin' ? [] : [
    { path: '/create-project', label: 'Proiect nou', icon: 'plus', emphasis: true },
    (role === 'expert' || role === 'company') && { path: '/referral', label: 'Recomandă', icon: 'gift' },
  ].filter(Boolean);

  const projectsPath = '/my-projects';

  // Profile & account: Portofel sits here next to "Profilul meu" (only for prestators who actually receive payouts)
  const navProfile = role === 'admin' ? [] : [
    { path: projectsPath,              label: 'Proiectele mele', icon: 'folder' },
    { path: '/profile-edit',            label: 'Profilul meu',    icon: 'user' },
    ...(role === 'expert' || role === 'company' || role === 'individual'
      ? [{ path: '/wallet', label: 'Portofel', icon: 'wallet' }]
      : []),
  ];

  const userName = user ? (user.name || user.email || '') : '';
  const userRole = role === 'company' ? 'Companie' : role === 'expert' ? 'Expert' : role === 'individual' ? 'Persoană fizică' : 'Admin';

  return (
    <aside className="escro-sidebar">
      <div className="escro-sidebar-brand" onClick={() => { navigate(role === 'admin' ? '/admin/dashboard' : role === 'expert' ? '/expert/dashboard' : role === 'individual' ? '/individual/dashboard' : '/company/dashboard'); onClose?.(); }}>
        <div className="escro-brand-mark">E</div>
        <div className="escro-brand-name">ESCRO<span className="dot" /></div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>v3.0</div>
        <button className="sidebar-close-btn" onClick={e => { e.stopPropagation(); onClose?.(); }} aria-label="Închide meniu">
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="escro-sidebar-nav">
        <div className="escro-sidebar-section">
          <div className="escro-sidebar-section-label">{role === 'admin' ? 'Administrare' : 'Workspace'}</div>
          {navMain.map(it => (
            <div
              key={it.path}
              className={`escro-sidebar-link ${isActive(it.path) ? 'active' : ''}`}
              onClick={() => { navigate(it.path); onClose?.(); }}
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label}</span>
              {it.badge != null && (
                <span style={{
                  marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px',
                  background: 'var(--warning)', color: '#fff',
                  fontSize: 10, fontWeight: 700, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>
                  {it.badge > 9 ? '9+' : it.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {navSub.length > 0 && (
          <div className="escro-sidebar-section">
            <div className="escro-sidebar-section-label">Acțiuni</div>
            {navSub.map(it => (
              <div
                key={it.path}
                className={`escro-sidebar-link ${location.pathname === it.path ? 'active' : ''}`}
                onClick={() => { navigate(it.path); onClose?.(); }}
                style={it.emphasis ? { color: 'var(--accent-hi)' } : {}}
              >
                <Icon name={it.icon} size={15} />
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="escro-sidebar-section">
          <div className="escro-sidebar-section-label">Profil & Cont</div>
          {navProfile.map(it => (
            <div
              key={it.path}
              className={`escro-sidebar-link ${location.pathname === it.path ? 'active' : ''}`}
              onClick={() => { navigate(it.path); onClose?.(); }}
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="escro-sidebar-bottom">
        <div style={{
          padding: '0.625rem 0.75rem',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-md)',
          marginBottom: '0.625rem',
          display: 'flex', alignItems: 'center', gap: '.5rem',
        }}>
          <span className="pulse-dot green" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-hi)' }}>Sistem operațional</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>Toate plățile sunt procesate</div>
          </div>
        </div>

        <div className="escro-sidebar-user" onClick={() => { navigate('/setari'); onClose?.(); }}>
          <Avatar
            user={{ name: userName, color: avatarColor(role) }}
            size="sm"
          />
          <div className="escro-sidebar-user-info">
            <div className="escro-sidebar-user-name">{userName || 'Utilizator'}</div>
            <div className="escro-sidebar-user-role">{userRole}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, marginLeft: 'auto' }}>
            <Icon name="gear" size={13} style={{ color: 'var(--fg-3)' }} />
            <span style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Setări</span>
          </div>
        </div>

        <div
          className="escro-sidebar-link"
          style={{ marginTop: 4 }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <Icon name="logout" size={15} />
          <span>Deconectare</span>
        </div>
      </div>
    </aside>
  );
}

const NOTIF_META = {
  contract_ready:              { icon: 'file-text',      color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Semnează contractele →' },
  contract_signed:             { icon: 'check-circle',   color: 'var(--success)',  bg: 'var(--success-bg)' },
  contract_awaiting_signature: { icon: 'edit',           color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Semnează acum →' },
  milestone_delivered:         { icon: 'upload',         color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Aprobă livrabilul →' },
  milestone_approved:          { icon: 'check',          color: 'var(--success)',  bg: 'var(--success-bg)' },
  milestone_disputed:          { icon: 'alert-triangle', color: 'var(--danger)',   bg: 'var(--danger-bg)',  action: 'Vezi disputa →' },
  project_ready_for_final:     { icon: 'flag',           color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Semnează contractul final →' },
  task_acceptance_required:    { icon: 'briefcase',      color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Acceptă sau refuză →' },
  task_accepted:               { icon: 'check',          color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Demarează contractul →' },
  task_rejected_by_expert:     { icon: 'x',              color: 'var(--danger)',   bg: 'var(--danger-bg)',  action: 'Vezi statusul →' },
  task_approval_required:      { icon: 'flag',           color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Aprobă sau respinge →' },
  project_approved:            { icon: 'check-circle',   color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Accesează proiectul →' },
  project_rejected:            { icon: 'x',              color: 'var(--danger)',   bg: 'var(--danger-bg)',  action: 'Vezi motivul →' },
  account_approved:            { icon: 'shield',         color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Intră pe platformă →' },
  account_rejected:            { icon: 'x',              color: 'var(--danger)',   bg: 'var(--danger-bg)' },
  points_earned:               { icon: 'star',           color: 'var(--warning)',  bg: 'var(--warning-bg)' },
  wallet_credit:               { icon: 'trending-up',    color: 'var(--success)',  bg: 'var(--success-bg)' },
  expert_assigned:             { icon: 'user-check',     color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Vezi proiectul →' },
  company_assigned:            { icon: 'building',       color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Vezi proiectul →' },
  task_assigned:               { icon: 'kanban',         color: 'var(--accent)',   bg: 'var(--accent-bg)',  action: 'Accesează task-ul →' },
  admin_edit:                  { icon: 'edit',           color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Verifică modificările →' },
  expert_accepted:             { icon: 'check-circle',   color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Semnează contractul →' },
  task_rejected_by_client:     { icon: 'x',              color: 'var(--danger)',   bg: 'var(--danger-bg)',  action: 'Vezi detalii →' },
  dispute_resolved:            { icon: 'shield',         color: 'var(--success)',  bg: 'var(--success-bg)', action: 'Vezi rezultatul →' },
  modification_proposed:       { icon: 'edit',           color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Acceptă sau respinge →' },
  modification_approved:       { icon: 'check-circle',   color: 'var(--success)',  bg: 'var(--success-bg)' },
  modification_rejected:       { icon: 'x',              color: 'var(--danger)',   bg: 'var(--danger-bg)' },
  escrow_funded:               { icon: 'lock',           color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Poți începe lucrul →' },
  payout_requested:            { icon: 'arrow-up-circle', color: 'var(--accent)',  bg: 'var(--accent-bg)',  action: 'Vezi cererea →' },
  payout_processing:           { icon: 'clock',           color: 'var(--warning)', bg: 'var(--warning-bg)', action: 'Urmărește statusul →' },
  payout_failed:               { icon: 'alert-circle',    color: 'var(--danger)',  bg: 'var(--danger-bg)',  action: 'Contactează suportul →' },
  payout_paid:                 { icon: 'check-circle',    color: 'var(--success)', bg: 'var(--success-bg)' },
  revision_requested:          { icon: 'edit',            color: 'var(--warning)',  bg: 'var(--warning-bg)', action: 'Revizuiește livrabilul →' },
  dispute_archived:            { icon: 'clock',           color: 'var(--fg-3)',    bg: 'var(--border-1)' },
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

// ——— Topbar ———
function Topbar({ notifications, setNotifications, onMenuToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const crumbs = getBreadcrumbs(location.pathname);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Search state
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  const handleSearch = (val) => {
    setSearchQ(val);
    clearTimeout(searchTimer.current);
    if (val.trim().length < 2) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true);
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(val)}`, { headers });
        setSearchResults(res.data.results || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 280);
  };

  useEffect(() => {
    if (!showSearch) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`, {}, { headers }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all', {}, { headers }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <header className="escro-topbar">
      <button className="escro-hamburger" onClick={onMenuToggle} aria-label="Meniu">
        <Icon name="menu" size={18} />
      </button>
      {crumbs.length > 0 && (
        <div className="tb-crumb" style={{ marginRight: '1rem' }}>
          {crumbs.map((c, i) => (
            <span key={i}>
              <span style={{ color: i === crumbs.length - 1 ? 'var(--fg-1)' : 'var(--fg-3)' }}>{c}</span>
              {i < crumbs.length - 1 && <span style={{ opacity: 0.4, marginLeft: 6 }}>/</span>}
            </span>
          ))}
        </div>
      )}

      <div className="escro-topbar-search" ref={searchRef} style={{ position: 'relative' }}>
        <Icon name="search" size={14} className="escro-topbar-search-icon" style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
        <input
          placeholder="Caută experți, proiecte…"
          value={searchQ}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { if (searchQ.trim().length >= 2) setShowSearch(true); }}
          style={{ paddingRight: searchQ ? '2rem' : undefined }}
        />
        {searchQ && (
          <button onClick={() => { setSearchQ(''); setSearchResults([]); setShowSearch(false); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        )}
        {!searchQ && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <span className="kbd">⌘K</span>
          </span>
        )}

        {/* Search results dropdown */}
        {showSearch && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--bg-0)', border: '1px solid var(--border-1)',
            borderRadius: 'var(--r-lg)', zIndex: 2000, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,.25)',
          }}>
            {searchLoading ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>Se caută…</div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>Niciun rezultat</div>
            ) : (
              <div>
                {searchResults.filter(r => r.type === 'user').length > 0 && (
                  <div style={{ padding: '.5rem .75rem', fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid var(--border-1)' }}>Experți & Companii</div>
                )}
                {searchResults.filter(r => r.type === 'user').map(r => (
                  <div key={r.id} onClick={() => { navigate(`/profile/${r.id}`); setShowSearch(false); setSearchQ(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.625rem .875rem', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-hi)', flexShrink: 0 }}>
                      {(r.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.expertise || r.industry || (r.role === 'expert' ? 'Expert' : 'Companie')}</div>
                    </div>
                    {r.kyc_status === 'verified' && <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>✓ KYC</span>}
                  </div>
                ))}
                {searchResults.filter(r => r.type === 'project').length > 0 && (
                  <div style={{ padding: '.5rem .75rem', fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', borderTop: '1px solid var(--border-1)', borderBottom: '1px solid var(--border-1)' }}>Proiecte</div>
                )}
                {searchResults.filter(r => r.type === 'project').map(r => (
                  <div key={r.id} onClick={() => { navigate(`/project/${r.id}`); setShowSearch(false); setSearchQ(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.625rem .875rem', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="folder" size={14} style={{ color: 'var(--fg-3)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.status} · {r.budget_ron ? `${parseFloat(r.budget_ron).toLocaleString('ro-RO')} RON` : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="escro-topbar-actions" style={{ position: 'relative' }}>
        {/* Notification bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            style={{ position: 'relative' }}
            onClick={() => setShowDropdown(v => !v)}
          >
            <Icon name="bell" size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, padding: '0 3px',
                background: 'var(--accent)', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
              width: 360, maxWidth: 'calc(100vw - 16px)', background: 'var(--bg-0)',
              border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--fg-0)' }}>
                  <Icon name="bell" size={13} />
                  Notificări
                  {unreadCount > 0 && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Toate citite
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                    Nicio notificare
                  </div>
                ) : notifications.map((n, idx) => {
                  const meta = NOTIF_META[n.type] || { icon: 'bell', color: 'var(--fg-2)', bg: 'var(--border-1)' };
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markRead(n.id);
                        if (n.link) { navigate(n.link); setShowDropdown(false); }
                      }}
                      style={{
                        display: 'flex', gap: 10, padding: '0.7rem 1rem',
                        borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-1)' : 'none',
                        cursor: n.link ? 'pointer' : 'default',
                        background: n.is_read ? 'transparent' : 'var(--accent-bg)',
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => { if (n.link) e.currentTarget.style.background = 'var(--bg-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--accent-bg)'; }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: meta.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={meta.icon} size={12} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 12.5, color: 'var(--fg-0)', marginBottom: 1 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.message}
                        </div>
                        {meta.action && n.link && (
                          <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, marginTop: 2 }}>
                            {meta.action}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{timeAgo(n.created_at)}</span>
                        {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

// ——— Shell (wrapper) ———
export default function Shell({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { socket } = useSocket();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/notifications?limit=20', { headers });
      setNotifications(res.data.notifications || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Fall back to 60s polling (socket covers real-time; polling catches missed events)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Real-time: prepend incoming notifications from socket
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications(prev => {
        if (prev.find(n => n.id === notif.id)) return prev;
        return [notif, ...prev].slice(0, 20);
      });
    };
    socket.on('new_notification', handler);
    return () => socket.off('new_notification', handler);
  }, [socket]);

  const pendingContractCount = notifications.filter(
    n => !n.is_read && (n.type === 'contract_awaiting_signature' || n.type === 'contract_ready')
  ).length;

  return (
    <div className={`escro-app${sidebarOpen ? ' sidebar-open' : ''}`}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar pendingContractCount={pendingContractCount} onClose={() => setSidebarOpen(false)} />
      <main className="escro-main">
        <Topbar notifications={notifications} setNotifications={setNotifications} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="escro-scroll">{children}</div>
      </main>
    </div>
  );
}
