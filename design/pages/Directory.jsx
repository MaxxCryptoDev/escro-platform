import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Icon, Avatar, Spinner, EmptyState } from '../components/ui';
import { avatarColor } from '../utils/format';

export default function Directory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'experts');
  const [companies, setCompanies] = useState([]);
  const [experts, setExperts] = useState([]);
  const [trustProfiles, setTrustProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterKyc, setFilterKyc] = useState(false);
  const [filterRating, setFilterRating] = useState(0);
  const [filterTrustLevel, setFilterTrustLevel] = useState(0);
  const [sortBy, setSortBy] = useState('trust_desc');
  const [showFilters, setShowFilters] = useState(false);

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, trustRes] = await Promise.allSettled([
        axios.get('/api/users', { headers }),
        axios.get('/api/trust-profiles/all', { headers }),
      ]);
      if (usersRes.status === 'fulfilled') {
        const all = usersRes.value.data.users || [];
        setCompanies(all.filter(u => u.role === 'company'));
        setExperts(all.filter(u => u.role === 'expert'));
      }
      if (trustRes.status === 'fulfilled') {
        const profiles = {};
        (trustRes.value.data.profiles || []).forEach(p => { profiles[p.user_id] = p; });
        setTrustProfiles(profiles);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const industries = [...new Set([...experts, ...companies].map(u => u.industry).filter(Boolean))].sort();

  const filtered = (activeTab === 'experts' ? experts : companies).filter(u => {
    if (filterKyc && u.kyc_status !== 'verified') return false;
    if (filterIndustry && u.industry !== filterIndustry) return false;
    if (filterRating > 0 && parseFloat(u.rating || 0) < filterRating) return false;
    if (filterTrustLevel > 0 && (trustProfiles[u.id]?.trust_level || 1) < filterTrustLevel) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q)
      || (u.expertise || '').toLowerCase().includes(q)
      || (u.industry || '').toLowerCase().includes(q)
      || (u.bio || '').toLowerCase().includes(q)
      || (u.company || '').toLowerCase().includes(q);
  });

  const list = [...filtered].sort((a, b) => {
    const ta = trustProfiles[a.id]?.trust_level || 1;
    const tb = trustProfiles[b.id]?.trust_level || 1;
    const ra = parseFloat(a.rating || 0);
    const rb = parseFloat(b.rating || 0);
    const ca = parseInt(a.completed_projects || 0);
    const cb = parseInt(b.completed_projects || 0);
    switch (sortBy) {
      case 'rating_desc': return rb - ra || tb - ta;
      case 'completed_desc': return cb - ca || tb - ta;
      case 'newest': return new Date(b.created_at) - new Date(a.created_at);
      case 'name_asc': return (a.name || '').localeCompare(b.name || '');
      case 'trust_desc':
      default:
        return tb - ta || rb - ra;
    }
  });

  return (
    <div className="escro-page fade-up">
      {/* Page header */}
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">Director · {experts.length + companies.length} membri verificați</div>
          <h1 className="h-title">
            {activeTab === 'experts'
              ? <>Experți cu <em>trust verificat</em>.</>
              : <>Companii <em>verificate</em>.</>
            }
          </h1>
          <p className="h-sub">
            {activeTab === 'experts'
              ? 'Fiecare expert din director a trecut prin validare internă și are cel puțin un proiect finalizat.'
              : `${companies.length} companii înregistrate în ecosistemul Escro.`
            }
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(v => !v)}
            style={{ background: (filterIndustry || filterKyc || filterRating > 0 || filterTrustLevel > 0) ? 'var(--accent-bg)' : undefined, borderColor: (filterIndustry || filterKyc || filterRating > 0) ? 'var(--accent-border)' : undefined }}>
            <Icon name="hash" size={13} /> Filtre {(filterIndustry || filterKyc || filterRating > 0 || filterTrustLevel > 0) ? '●' : ''}
          </button>
        </div>
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-1)', alignSelf: 'flex-end' }}>
          {[
            { id: 'experts',   label: 'Experți',   icon: 'user',     count: experts.length },
            { id: 'companies', label: 'Companii',  icon: 'building', count: companies.length },
          ].map(t => (
            <div key={t.id} onClick={() => switchTab(t.id)} style={{
              padding: '0.5rem 1rem', fontSize: 13, fontWeight: 500,
              color: activeTab === t.id ? 'var(--fg-0)' : 'var(--fg-2)',
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: -1,
            }}>
              <Icon name={t.icon} size={13} />{t.label}
              <span style={{ fontSize: 10, background: 'var(--border-1)', padding: '1px 5px', borderRadius: 3, color: 'var(--fg-3)' }}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={13} style={{ position: 'absolute', left: '.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
          <input
            className="input"
            style={{ paddingLeft: '2rem', width: 240, height: 34, fontSize: 13 }}
            placeholder={`Caută ${activeTab === 'experts' ? 'experți' : 'companii'}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: '.25rem' }}>Industrie</label>
            <select className="input" style={{ height: 32, fontSize: 13, minWidth: 180 }}
              value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
              <option value="">Toate industriile</option>
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '1.25rem' }}>
            <input type="checkbox" id="kyc_filter" checked={filterKyc} onChange={e => setFilterKyc(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
            <label htmlFor="kyc_filter" style={{ fontSize: 13, color: 'var(--fg-1)', cursor: 'pointer' }}>Doar verificați KYC</label>
          </div>
          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: '.25rem' }}>Rating minim</label>
            <select className="input" style={{ height: 32, fontSize: 13, minWidth: 140 }}
              value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}>
              <option value={0}>Orice rating</option>
              <option value={3}>3★ și peste</option>
              <option value={4}>4★ și peste</option>
              <option value={4.5}>4.5★ și peste</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: '.25rem' }}>Trust Level minim</label>
            <select className="input" style={{ height: 32, fontSize: 13, minWidth: 140 }}
              value={filterTrustLevel} onChange={e => setFilterTrustLevel(Number(e.target.value))}>
              <option value={0}>Orice nivel</option>
              <option value={2}>L2+</option>
              <option value={3}>L3+</option>
              <option value={4}>L4+</option>
              <option value={5}>L5</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ fontSize: 11, marginBottom: '.25rem' }}>Sortează după</label>
            <select className="input" style={{ height: 32, fontSize: 13, minWidth: 180 }}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="trust_desc">Trust Level (desc)</option>
              <option value="rating_desc">Rating (desc)</option>
              <option value="completed_desc">Proiecte finalizate (desc)</option>
              <option value="newest">Cel mai nou</option>
              <option value="name_asc">Alfabetic (A-Z)</option>
            </select>
          </div>
          {(filterIndustry || filterKyc || filterRating > 0 || filterTrustLevel > 0) && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}
              onClick={() => { setFilterIndustry(''); setFilterKyc(false); setFilterRating(0); setFilterTrustLevel(0); }}>
              ✕ Resetează filtre
            </button>
          )}
          <div style={{ marginLeft: 'auto', paddingTop: '1.25rem', fontSize: 12, color: 'var(--fg-3)' }}>
            {list.length} rezultate
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && list.length === 0 && (
        <EmptyState icon="users" title="Niciun rezultat" description={search ? 'Niciun rezultat pentru căutarea ta.' : 'Nu există înregistrări.'} />
      )}

      {!loading && list.length > 0 && (
        <div className="grid-3">
          {list.map(u => {
            const trust = trustProfiles[u.id];
            const score = trust?.trust_score || 0;
            const level = trust?.trust_level || 1;
            const tags = [u.expertise, u.industry, u.experience].filter(Boolean);
            const isExpert = u.role === 'expert';

            return (
              <div key={u.id} className="exp" onClick={() => navigate(`/profile/${u.id}`)}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Avatar
                      user={{ name: u.name || u.email, profile_image_url: u.profile_image_url, color: avatarColor(u.role) }}
                      size="lg"
                      online={u.kyc_status === 'verified'}
                    />
                    <div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 19, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>
                        {u.name || u.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                        {u.expertise || u.industry || (isExpert ? 'Expert' : 'Companie')}
                      </div>
                    </div>
                  </div>
                  {/* Trust pips */}
                  <div className="trust">
                    <div className="trust-l">Trust L{level}</div>
                    <div className="trust-d">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`trust-pip ${n <= level ? 'on' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quote / bio */}
                {u.bio && (
                  <div className="exp-quote">„{u.bio}"</div>
                )}
                {!u.bio && (
                  <div className="exp-quote" style={{ color: 'var(--fg-3)', fontStyle: 'normal', fontSize: 13, borderLeftColor: 'var(--border-1)' }}>
                    Nicio descriere disponibilă.
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {tags.slice(0, 3).map(t => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
                    {u.kyc_status === 'verified' && (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="check" size={11} /> Verificat
                      </span>
                    )}
                    {trust && (
                      <span>
                        <b style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{score}</b> pts
                      </span>
                    )}
                    {parseFloat(u.rating || 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ color: '#f59e0b' }}>★</span>
                        <b style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{parseFloat(u.rating).toFixed(1)}</b>
                        {u.reviews_count > 0 && <span style={{ color: 'var(--fg-4)' }}>({u.reviews_count})</span>}
                      </span>
                    )}
                    {u.city && <span>{u.city}</span>}
                  </div>
                  <Icon name="chevron-right" size={14} style={{ color: 'var(--fg-3)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
