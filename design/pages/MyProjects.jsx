import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon, StatusBadge } from '../components/ui';

const STATUS_ORDER = [
  'in_progress', 'pending_client_approval', 'pending_admin_approval',
  'active', 'open', 'completed', 'cancelled', 'disputed',
];

const FILTER_LABELS = {
  all:       'Toate',
  active:    'Active',
  completed: 'Finalizate',
};

function fmtRON(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' RON';
}

function isActive(status) {
  return !['completed', 'cancelled'].includes(status);
}

function matchesSearch(p, q) {
  if (!q) return true;
  return (
    p.title?.toLowerCase().includes(q) ||
    String(p.id).toLowerCase().includes(q)
  );
}

// ——— Card for standalone project or orphan assignment ———
function ProjectCard({ p, uid, navigate, nested = false }) {
  const isPrestator = String(p.expert_id) === uid || String(p.company_id) === uid;
  const role = isPrestator ? 'Prestator' : 'Beneficiar';
  const roleColor = isPrestator ? 'var(--accent-hi)' : 'var(--success)';
  const partner = isPrestator
    ? (p.client_name || null)
    : (p.expert_name || p.company_name || null);
  const budget = parseFloat(p.budget_ron) || 0;
  const milestones = p.milestones || [];
  const progress = milestones.length > 0
    ? Math.round(milestones.filter(m => m.status === 'approved').length / milestones.length * 100)
    : 0;
  const date = p.updated_at || p.created_at;
  const isAssignment = p.assignment_type === 'task_assignment';
  const navTarget = (isAssignment && p.task_id)
    ? `/project/${p.task_id}/assignment/${p.id}`
    : `/project/${p.id}`;

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        padding: '1rem 1.25rem',
        transition: 'border-color 0.15s',
        ...(nested ? { borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r-md)' } : {}),
      }}
      onClick={() => navigate(navTarget)}
      onMouseEnter={e => e.currentTarget.style.borderColor = nested ? 'var(--accent)' : 'var(--border-3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = nested ? 'var(--accent)' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: `color-mix(in srgb, ${roleColor} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${roleColor} 25%, transparent)`, padding: '1px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {role}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.title}
          </div>
          {partner && (
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>cu {partner}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.375rem', flexShrink: 0 }}>
          <StatusBadge status={p.status} />
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>
            {fmtRON(budget)}
          </span>
        </div>
      </div>

      {isActive(p.status) && (
        <div style={{ marginTop: '.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)', marginBottom: 4 }}>
            <span>Progres</span><span>{progress}%</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div style={{ marginTop: '.625rem', fontSize: 11, color: 'var(--fg-3)' }}>
        {date ? new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
      </div>
    </div>
  );
}

// ——— PM Task group: header + nested assignment cards ———
function PMTaskGroup({ task, assignments, uid, navigate }) {
  const budget = parseFloat(task.budget_ron) || 0;
  const date = task.updated_at || task.created_at;

  return (
    <div>
      {/* PM Task header card */}
      <div
        className="card"
        style={{ cursor: 'pointer', padding: '1rem 1.25rem', transition: 'border-color 0.15s', background: 'var(--bg-1)' }}
        onClick={() => navigate(`/project/${task.id}`)}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = ''}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.375rem' }}>
              <Icon name="folder" size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', padding: '1px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Project Management
              </span>
              <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
                {assignments.length} {assignments.length === 1 ? 'subtask' : 'subtask-uri'}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.375rem', flexShrink: 0 }}>
            <StatusBadge status={task.status} />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>
              {fmtRON(budget)}
            </span>
          </div>
        </div>
        {date && (
          <div style={{ marginTop: '.5rem', fontSize: 11, color: 'var(--fg-3)' }}>
            {new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Nested assignments */}
      {assignments.length > 0 && (
        <div style={{ marginLeft: '1.25rem', marginTop: '.375rem', display: 'flex', flexDirection: 'column', gap: '.375rem', position: 'relative' }}>
          {/* Vertical connector line */}
          <div style={{ position: 'absolute', left: -16, top: 0, bottom: 12, width: 1, background: 'var(--border-2)' }} />
          {assignments.map((a, idx) => (
            <div key={a.id} style={{ position: 'relative' }}>
              {/* Horizontal connector */}
              <div style={{ position: 'absolute', left: -16, top: '50%', width: 12, height: 1, background: 'var(--border-2)' }} />
              <ProjectCard p={a} uid={uid} navigate={navigate} nested />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyProjects() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get('/api/projects', { headers })
      .then(res => {
        const all = res.data.projects || res.data || [];
        const uid = String(user.id);
        const mine = all.filter(p =>
          String(p.expert_id)  === uid ||
          String(p.company_id) === uid ||
          String(p.client_id)  === uid
        );
        mine.sort((a, b) => {
          const ai = STATUS_ORDER.indexOf(a.status);
          const bi = STATUS_ORDER.indexOf(b.status);
          if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
        });
        setProjects(mine);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, token]);

  const uid = String(user?.id);
  const q = search.toLowerCase();

  // Classify all user projects
  const pmTaskMap = {};
  const assignmentsByTaskId = {};
  const standaloneList = [];

  projects.forEach(p => {
    if (p.is_pm_task) {
      pmTaskMap[String(p.id)] = p;
      if (!assignmentsByTaskId[String(p.id)]) assignmentsByTaskId[String(p.id)] = [];
    } else if (p.assignment_type === 'task_assignment' && p.task_id) {
      const key = String(p.task_id);
      if (!assignmentsByTaskId[key]) assignmentsByTaskId[key] = [];
      assignmentsByTaskId[key].push(p);
    } else {
      standaloneList.push(p);
    }
  });

  // Filter helper
  const passesFilter = (p) => {
    if (filter === 'active' && !isActive(p.status)) return false;
    if (filter === 'completed' && p.status !== 'completed') return false;
    return true;
  };

  // Build display groups
  const groups = [];

  // 1. Standalone projects
  standaloneList
    .filter(p => passesFilter(p) && matchesSearch(p, q))
    .forEach(p => groups.push({ type: 'standalone', project: p }));

  // 2. PM task groups — show if PM task or any of its assignments match
  Object.values(pmTaskMap).forEach(task => {
    const taskAssignments = assignmentsByTaskId[String(task.id)] || [];
    const taskMatches = passesFilter(task) && matchesSearch(task, q);
    const visibleAssignments = taskAssignments.filter(a => passesFilter(a) && matchesSearch(a, q));

    // Show the group if the task itself matches OR any assignment matches
    if (taskMatches || visibleAssignments.length > 0) {
      // When task itself matches, show all its assignments; otherwise only matching ones
      const assignmentsToShow = taskMatches ? taskAssignments.filter(passesFilter) : visibleAssignments;
      groups.push({ type: 'pm_group', task, assignments: assignmentsToShow });
    }
  });

  // 3. Orphan assignments — assignment whose parent PM task is NOT in user's list
  Object.entries(assignmentsByTaskId).forEach(([taskId, assignments]) => {
    if (pmTaskMap[taskId]) return; // has a PM task card — already in pm_group
    assignments
      .filter(a => passesFilter(a) && matchesSearch(a, q))
      .forEach(a => groups.push({ type: 'orphan', project: a }));
  });

  const totalVisible = groups.reduce((n, g) => {
    if (g.type === 'pm_group') return n + 1 + g.assignments.length;
    return n + 1;
  }, 0);

  const activeCount    = projects.filter(p => isActive(p.status)).length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="escro-page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Cont</div>
          <h1 className="page-title">Proiectele mele</h1>
          <p className="page-subtitle">Proiecte în care ești sau ai fost prestator ori beneficiar.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat">
          <div className="stat-label">Total</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--accent-hi)' }}>{activeCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Finalizate</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{completedCount}</div>
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: 3 }}>
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '.35rem .75rem', fontSize: 12.5, fontWeight: 600,
                background: filter === key ? 'var(--bg-card)' : 'transparent',
                border: filter === key ? '1px solid var(--border-2)' : '1px solid transparent',
                borderRadius: 'var(--r-sm)', color: filter === key ? 'var(--fg-0)' : 'var(--fg-3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 320 }}>
          <Icon name="search" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 30, height: 34, fontSize: 13 }}
            placeholder="Caută după titlu sau ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--fg-3)', fontSize: 14 }}>Se încarcă...</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <Icon name="folder" size={32} style={{ color: 'var(--fg-3)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--fg-3)', fontSize: 14, margin: 0 }}>
            {search || filter !== 'all' ? 'Niciun proiect nu corespunde filtrelor.' : 'Nu ai încă proiecte ca prestator sau beneficiar.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {groups.map((g, i) => {
            if (g.type === 'pm_group') {
              return <PMTaskGroup key={g.task.id} task={g.task} assignments={g.assignments} uid={uid} navigate={navigate} />;
            }
            const p = g.project;
            return <ProjectCard key={p.id} p={p} uid={uid} navigate={navigate} />;
          })}
        </div>
      )}
    </div>
  );
}
