import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon, EmptyState, Spinner, StatusBadge } from '../components/ui';
import { fmtRON, fmtDate } from '../utils/format';

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterService, setFilterService] = useState('all'); // all | matching | direct
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get('/api/projects', { headers });
        const all = r.data.projects || r.data || [];
        // Marketplace = anything pending (backend `is_marketplace` flag covers all pending
        // statuses: open, pending_assignment, pending_admin_approval, pending_client_approval,
        // pending_expert_approval). A PM with any pending sub-task surfaces here.
        const market = all.filter(p => p.is_marketplace);
        if (!cancelled) setProjects(market);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || 'Nu am putut încărca proiectele.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Group projects: sub-tasks (with task_id) collapse under their parent PM task;
  // standalone direct/matching projects show individually.
  const grouped = useMemo(() => {
    const pmGroups = new Map();
    const standalone = [];
    projects.forEach(p => {
      if (p.task_id) {
        const existing = pmGroups.get(p.task_id);
        if (existing) {
          existing.sub_count += 1;
          existing.sub_total_budget += parseFloat(p.budget_ron) || 0;
          existing.sub_tasks.push(p);
        } else {
          pmGroups.set(p.task_id, {
            id: p.task_id,
            is_pm_group: true,
            title: p.task_title || 'Proiect PM',
            description: p.task_description || p.description,
            task_id: p.task_id,
            client_id: p.client_id,
            client_name: p.client_name,
            client_company: p.client_company,
            service_type: 'project_management',
            timeline_days: p.task_timeline || p.timeline_days,
            budget_ron: parseFloat(p.task_budget) || 0,
            status: 'open',
            created_at: p.created_at,
            sub_count: 1,
            sub_total_budget: parseFloat(p.budget_ron) || 0,
            sub_tasks: [p],
          });
        }
      } else {
        standalone.push({ ...p, is_pm_group: false });
      }
    });
    return [...pmGroups.values(), ...standalone];
  }, [projects]);

  const filtered = useMemo(() => {
    let list = grouped;
    if (filterService !== 'all') {
      list = list.filter(p => {
        if (filterService === 'project_management') return p.is_pm_group;
        return !p.is_pm_group && p.service_type === filterService;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q)
        || (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [grouped, filterService, search]);

  const canApply = user?.role === 'expert' || user?.role === 'company';

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="h-eyebrow"><Icon name="search" size={11} /> Marketplace</div>
          <h1 className="h-title">Proiecte deschise pe platformă</h1>
          <p className="h-sub">
            {canApply
              ? 'Aplică la proiectele care îți potrivesc. Adminul aprobă candidatura.'
              : 'Doar prestatorii (expert / companie) pot aplica la proiecte.'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="row" style={{ gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Caută după titlu sau descriere..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240 }}
        />
        <select
          className="input"
          value={filterService}
          onChange={e => setFilterService(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="all">Toate tipurile</option>
          <option value="matching">Matching</option>
          <option value="direct">Direct</option>
          <option value="project_management">Project Management</option>
        </select>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="search"
          title="Niciun proiect disponibil"
          description={projects.length === 0
            ? 'Momentan nu sunt proiecte deschise. Revino mai târziu.'
            : 'Niciun proiect nu corespunde filtrelor curente.'}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="col" style={{ gap: '0.75rem' }}>
          {filtered.map(p => {
            // PM groups navigate to parent task; standalone navigate to themselves.
            const targetId = p.is_pm_group ? p.task_id : p.id;
            const detailHref = `/project/${targetId}`;
            const applyHref = `/project/${targetId}?apply=1`;
            const cardKey = p.is_pm_group ? `pm-${p.task_id}` : p.id;
            const serviceLabel = p.is_pm_group ? 'Project Management'
              : p.service_type === 'matching' ? 'Matching' : 'Direct';
            const displayBudget = p.is_pm_group ? (p.budget_ron || p.sub_total_budget) : p.budget_ron;
            return (
            <div
              key={cardKey}
              className="card"
              onClick={() => navigate(detailHref)}
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}
            >
              <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {p.is_pm_group && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10.5, fontFamily: 'var(--f-mono)', fontWeight: 600,
                      color: 'var(--accent-hi)', background: 'var(--accent-bg)',
                      border: '1px solid var(--accent-border)', borderRadius: 4,
                      padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}>
                      <Icon name="layers" size={10} /> Proiect PM · {p.sub_count} {p.sub_count === 1 ? 'sub-task deschis' : 'sub-task-uri deschise'}
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 4 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                    <span><Icon name="user" size={11} /> {p.client_name || 'Anonim'}</span>
                    <span><Icon name="briefcase" size={11} /> {serviceLabel}</span>
                    {p.timeline_days && <span><Icon name="clock" size={11} /> {p.timeline_days} zile</span>}
                    <span><Icon name="calendar" size={11} /> {fmtDate(p.created_at)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 18, color: 'var(--accent-hi)' }}>
                    {fmtRON(displayBudget)}
                  </div>
                  {!p.is_pm_group && <StatusBadge status={p.status} />}
                  {p.is_pm_group && (
                    <span style={{
                      fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)',
                      marginTop: 4, display: 'inline-block',
                    }}>
                      buget proiect total
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: '0.75rem',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.description}
              </div>

              {/* PM group: preview of sub-tasks looking for prestator */}
              {p.is_pm_group && p.sub_tasks?.length > 0 && (
                <div style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--r-sm)',
                  padding: '0.625rem 0.75rem',
                  marginBottom: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Sub-task-uri disponibile
                  </div>
                  {p.sub_tasks.slice(0, 3).map(st => (
                    <div key={st.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 12, color: 'var(--fg-1)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                        <Icon name="flag" size={10} style={{ color: 'var(--accent-hi)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.title}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, marginLeft: 8 }}>
                        {fmtRON(st.budget_ron)}
                      </span>
                    </div>
                  ))}
                  {p.sub_tasks.length > 3 && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>
                      … +{p.sub_tasks.length - 3} alte sub-task-uri
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={e => { e.stopPropagation(); navigate(detailHref); }}
                >
                  {p.is_pm_group ? 'Vezi proiectul' : 'Vezi detalii'}
                </button>
                {canApply && !p.is_pm_group && String(p.client_id) !== String(user?.id) && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate(applyHref); }}
                  >
                    <Icon name="send" size={12} /> Aplică
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
