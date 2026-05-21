/* Sidebar + Topbar */

function Sidebar({ route, go, role, setRole }) {
  const navMain = [
    { path: 'dashboard',  label: 'Acasă',           icon: 'home',      count: null },
    { path: 'projects',   label: 'Proiecte',        icon: 'folder',    count: 12 },
    { path: 'mine',       label: 'Proiectele mele', icon: 'briefcase', count: 6 },
    { path: 'tasks',      label: 'Task-uri',        icon: 'kanban',    count: 4 },
    { path: 'directory',  label: 'Director experți',icon: 'users',     count: null },
    { path: 'vault',      label: 'Vault & plăți',   icon: 'wallet',    count: null },
  ];
  const navSub = [
    { path: 'create',     label: 'Proiect nou',     icon: 'plus' },
    { path: 'referral',   label: 'Recomandă',       icon: 'gift' },
    { path: 'settings',   label: 'Setări',          icon: 'gear' },
  ];

  return (
    <aside className="sb">
      <div className="sb-brand" onClick={() => go('dashboard')}>
        <div className="sb-mark">E</div>
        <div className="sb-name">ESCRO</div>
        <div className="sb-ver">v3.0</div>
      </div>

      <nav className="sb-nav">
        <div className="sb-section">
          <div className="sb-section-label">Workspace</div>
          {navMain.map(it => (
            <div key={it.path} className={`sb-link ${route === it.path ? 'active' : ''}`} onClick={() => go(it.path)}>
              <I name={it.icon} size={15} />
              <span>{it.label}</span>
              {it.count != null && <span className="count">{String(it.count).padStart(2,'0')}</span>}
            </div>
          ))}
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Acțiuni</div>
          {navSub.map(it => (
            <div key={it.path} className={`sb-link ${route === it.path ? 'active' : ''}`} onClick={() => go(it.path)}>
              <I name={it.icon} size={15} />
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="sb-bottom">
        <div className="sb-card">
          <div className="sb-card-title"><span className="pulse ok" /> Vault operațional</div>
          <div className="sb-card-meta">3 plăți în escrow · 96.700 RON</div>
          <div className="sb-card-bar"><div className="sb-card-bar-fill" style={{ width: '78%' }} /></div>
        </div>
        <div className="sb-user" onClick={() => go('settings')}>
          <Avatar name="Maria Ionescu" color={3} size="sm" online />
          <div className="sb-user-info">
            <div className="sb-user-name">Maria Ionescu</div>
            <div className="sb-user-role">
              <select value={role} onChange={e => setRole(e.target.value)} style={{ background:'transparent', border:0, color:'var(--fg-3)', fontSize:11, cursor:'pointer', padding:0, fontFamily:'var(--f-mono)' }}>
                <option value="company">Companie · Notar BUC</option>
                <option value="expert">Expert · Consultant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <I name="chevron-r" size={13} style={{ color:'var(--fg-3)' }} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, go }) {
  const crumbs = {
    dashboard: ['Workspace','Acasă'],
    projects:  ['Workspace','Proiecte'],
    mine:      ['Workspace','Proiectele mele'],
    tasks:     ['Workspace','Task-uri'],
    directory: ['Workspace','Director experți'],
    vault:     ['Workspace','Vault & plăți'],
    create:    ['Acțiuni','Proiect nou'],
    referral:  ['Acțiuni','Recomandă'],
    settings:  ['Acțiuni','Setări'],
    project:   ['Workspace','Proiecte','ESC-2401'],
    expert:    ['Workspace','Director','Profil'],
  }[route] || [];

  return (
    <header className="tb">
      <div className="tb-crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === crumbs.length - 1 ? 'var(--fg-1)' : 'var(--fg-3)' }}>{c}</span>
            {i < crumbs.length - 1 && <span style={{ opacity: 0.4 }}>/</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="tb-search">
        <I name="search" size={13} className="icon-l" style={{ position:'absolute', left:'0.625rem', top:'50%', transform:'translateY(-50%)', color:'var(--fg-3)' }} />
        <input placeholder="Caută proiecte, experți, contracte…" />
        <span className="kbd-r"><span className="kbd">⌘K</span></span>
      </div>
      <div className="tb-actions">
        <button className="btn btn-secondary btn-sm"><I name="sparkle" size={13} /> Asistent AI</button>
        <button className="icon-btn"><I name="bell" size={15} /><span className="dot" /></button>
        <button className="icon-btn"><I name="help" size={15} /></button>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });
