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
        // Only marketplace listings (admin-approved, unassigned, open)
        const market = all.filter(p =>
          p.is_marketplace
          && ['open', 'pending_assignment'].includes(p.status)
          && !p.expert_id
          && !p.company_id
          && String(p.client_id) !== String(user?.id)
        );
        if (!cancelled) setProjects(market);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || 'Nu am putut încărca proiectele.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filterService !== 'all') list = list.filter(p => p.service_type === filterService);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q)
        || (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, filterService, search]);

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
          {filtered.map(p => (
            <div
              key={p.id}
              className="card"
              onClick={() => navigate(`/project/${p.id}`)}
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
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 4 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                    <span><Icon name="user" size={11} /> {p.client_name || 'Anonim'}</span>
                    <span><Icon name="briefcase" size={11} /> {p.service_type === 'matching' ? 'Matching' : 'Direct'}</span>
                    {p.timeline_days && <span><Icon name="clock" size={11} /> {p.timeline_days} zile</span>}
                    <span><Icon name="calendar" size={11} /> {fmtDate(p.created_at)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, fontSize: 18, color: 'var(--accent-hi)' }}>
                    {fmtRON(p.budget_ron)}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: '0.75rem',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.description}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={e => { e.stopPropagation(); navigate(`/project/${p.id}`); }}
                >
                  Vezi detalii
                </button>
                {canApply && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate(`/project/${p.id}?apply=1`); }}
                  >
                    <Icon name="send" size={12} /> Aplică
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
