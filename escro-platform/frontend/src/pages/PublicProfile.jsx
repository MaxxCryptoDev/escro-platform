import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui';
import '../styles/PublicProfile.css';

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #1e3a8a, #0891b2)',
  'linear-gradient(135deg, #581c87, #db2777)',
  'linear-gradient(135deg, #134e4a, #16a34a)',
  'linear-gradient(135deg, #7c2d12, #ea580c)',
  'linear-gradient(135deg, #312e81, #6366f1)',
  'linear-gradient(135deg, #064e3b, #10b981)',
];
const gradientFor = (id) => PLACEHOLDER_GRADIENTS[Math.abs(Number(id) || 0) % PLACEHOLDER_GRADIENTS.length];

const splitName = (name) => {
  if (!name) return { head: 'U', tail: '' };
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return { head: '', tail: parts[0] };
  return { head: parts.slice(0, -1).join(' '), tail: parts[parts.length - 1] };
};

// ——— Hero avatar with verify badge ———
function HeroAvatar({ user, isVerified }) {
  const initial = (user.name || 'U')[0].toUpperCase();
  return (
    <div className="pp-avatar">
      {user.profile_image_url ? <img src={user.profile_image_url} alt={user.name} /> : initial}
      {isVerified && (
        <div className="pp-avatar-verify" title="Cont verificat KYC">
          <Icon name="check" size={14} />
        </div>
      )}
    </div>
  );
}

// ——— Hero ———
function Hero({ user, trust, canMessage, canPropose, onMessage, onPropose, onShare, memberSince }) {
  const isVerified = user.kyc_status === 'verified';
  const roleLabel = user.role === 'expert' ? 'Expert' : user.role === 'company' ? 'Companie' : 'Client';
  const trustLevel = trust?.trust_level || 0;
  const trustScore = Math.round(trust?.trust_score || 0);
  const { head, tail } = splitName(user.name);

  return (
    <div className="pp-hero">
      <div className="pp-hero-banner" />
      <div className="pp-hero-body">
        <HeroAvatar user={user} isVerified={isVerified} />

        <div className="pp-hero-id">
          <h1 className="pp-name">
            {head} <em>{tail}</em>
          </h1>
          <div className="pp-role-line">
            <span className="role-pill">{roleLabel}</span>
            {(user.expertise || user.industry) && (
              <>
                <span className="sep">·</span>
                <span>{user.expertise || user.industry}</span>
              </>
            )}
          </div>
          <div className="pp-meta">
            {user.location && (
              <span className="pp-meta-item"><Icon name="pin" size={12} />{user.location}</span>
            )}
            {memberSince && (
              <span className="pp-meta-item"><Icon name="calendar" size={12} />Membru din {memberSince}</span>
            )}
            {isVerified && (
              <span className="pp-meta-item" style={{ color: 'var(--success)' }}>
                <Icon name="shield-check" size={12} />Verificat KYC
              </span>
            )}
          </div>
        </div>

        {trustLevel > 0 && (
          <div className="pp-hero-trust-card">
            <div className="pp-trust-h">
              <span>Nivel Încredere</span>
              <Icon name="shield-check" size={12} style={{ color: 'var(--accent-hi)' }} />
            </div>
            <div className="pp-trust-level">
              L{trustLevel}
              <span style={{ fontSize: 16, color: 'var(--fg-3)', fontStyle: 'normal', marginLeft: 4 }}>/5</span>
            </div>
            <div className="pp-trust-pips">
              {[1,2,3,4,5].map(n => <div key={n} className={`pp-trust-pip ${n <= trustLevel ? 'on' : ''}`} />)}
            </div>
            <div className="pp-trust-score-row">
              <span>Scor</span>
              <span className="pp-trust-score-v">{trustScore}<span style={{ color: 'var(--fg-3)' }}>/100</span></span>
            </div>
          </div>
        )}
      </div>

      <div className="pp-actions">
        {canMessage && (
          <button className="btn btn-primary" onClick={onMessage}>
            <Icon name="message" size={14} />Trimite mesaj
          </button>
        )}
        {canPropose && (
          <button className="btn btn-secondary" onClick={onPropose}>
            <Icon name="plus" size={14} />Propune un proiect
          </button>
        )}
        <button className="btn btn-secondary btn-icon-only" title="Distribuie profil" onClick={onShare}>
          <Icon name="share" size={14} />
        </button>
        <button className="btn btn-secondary btn-icon-only" title="Raportează">
          <Icon name="flag" size={14} />
        </button>
      </div>
    </div>
  );
}

// ——— Stats strip ———
function StatsStrip({ user, trust, avgRating, totalReviews, onShowProjects }) {
  const completed = trust?.total_projects_completed || user.completed_projects || 0;
  return (
    <div className="pp-stats-strip">
      <div className="pp-stat clickable" onClick={onShowProjects}>
        <div className="pp-stat-l"><Icon name="briefcase" size={11} />Proiecte finalizate</div>
        <div className="pp-stat-v"><em>{completed}</em></div>
        <div className="pp-stat-sub link">Vezi listă <Icon name="arrow-right" size={11} /></div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-l"><Icon name="star" size={11} />Rating mediu</div>
        <div className="pp-stat-v">
          {totalReviews > 0 ? Number(avgRating).toFixed(1) : '—'}
          <span className="pp-stat-u">/ 5</span>
        </div>
        <div className="pp-stat-sub">{totalReviews} recenzii</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-l"><Icon name="shield-check" size={11} />Scor încredere</div>
        <div className="pp-stat-v">{Math.round(trust?.trust_score || 0)}<span className="pp-stat-u">/ 100</span></div>
        <div className="pp-stat-sub">Nivel L{trust?.trust_level || 1}</div>
      </div>
      <div className="pp-stat">
        <div className="pp-stat-l"><Icon name="award" size={11} />Recompense</div>
        <div className="pp-stat-v">{trust?.type1_points || 0}<span className="pp-stat-u">pct</span></div>
        <div className="pp-stat-sub">Identitate: {trust?.type2_points || 0}</div>
      </div>
    </div>
  );
}

// ——— Radial score ———
function RadialScore({ score, max = 100, size = 160 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, score / max);
  const offset = c - c * pct;
  return (
    <div className="pp-trust-radial" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-1)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-hi)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pp-trust-radial-center">
        <div className="pp-trust-radial-score"><em>{Math.round(score)}</em></div>
        <div className="pp-trust-radial-label">din {max}</div>
      </div>
    </div>
  );
}

// ——— Trust panel ———
function TrustPanel({ trust, verifiedAt }) {
  if (!trust) return null;
  const milestones = [
    { label: 'Email validat', on: trust.email_validated },
    { label: 'KYC verificat (Stripe)', on: trust.verified_identity },
    { label: 'Apel verificare cu admin', on: trust.has_verification_call },
    { label: 'Profil complet', on: trust.profile_completed },
    { label: 'Portofoliu aprobat', on: trust.portfolio_approved_by_admin },
    { label: 'Cunoscut direct de admin', on: trust.is_known_directly_by_admin },
    { label: 'Recomandat de utilizator', on: !!trust.referred_by },
    { label: 'Colaborare directă', on: trust.has_direct_collaboration },
  ];
  return (
    <div className="pp-card">
      <div className="pp-card-h">
        <div className="pp-card-title">
          <Icon name="shield-check" size={16} style={{ color: 'var(--accent-hi)' }} />
          Profil de încredere
        </div>
        {verifiedAt && (
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
            Verificat pe {verifiedAt}
          </span>
        )}
      </div>
      <div className="pp-card-body">
        <div className="pp-trust-panel">
          <RadialScore score={trust.trust_score || 0} max={100} size={160} />
          <div className="pp-milestones">
            {milestones.map(m => (
              <div key={m.label} className={`pp-milestone ${m.on ? '' : 'off'}`}>
                <div className="pp-milestone-i">
                  <Icon name={m.on ? 'check' : 'x'} size={12} />
                </div>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— Sidebar ———
function Sidebar({ user, trust, completedProjects, onShowProjects }) {
  const industries = useMemo(() => {
    const list = [];
    if (user.industry) list.push(user.industry);
    if (user.expertise) {
      user.expertise.split(/[·,]/).map(s => s.trim()).filter(Boolean).forEach(s => {
        if (s.includes(':')) s = s.split(':').pop().trim();
        s.split(',').map(x => x.trim()).filter(Boolean).forEach(t => {
          if (t && !list.includes(t)) list.push(t);
        });
      });
    }
    return list.slice(0, 8);
  }, [user]);

  return (
    <div className="pp-sticky-side">
      <div className="pp-side-card">
        <div className="pp-side-l"><span>Puncte & Recompense</span></div>
        <div className="pp-points">
          <div className="pp-point-row">
            <div className="pp-point-i" style={{ background: 'var(--accent-bg)', color: 'var(--accent-hi)' }}>
              <Icon name="shield-check" size={13} />
            </div>
            <div className="pp-point-l">Încredere</div>
            <div className="pp-point-v">{Math.round(trust?.trust_score || 0)}</div>
          </div>
          <div className="pp-point-row">
            <div className="pp-point-i" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>
              <Icon name="verify" size={13} />
            </div>
            <div className="pp-point-l">Identitate</div>
            <div className="pp-point-v">{trust?.type2_points || 0}</div>
          </div>
          <div className="pp-point-row">
            <div className="pp-point-i" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <Icon name="award" size={13} />
            </div>
            <div className="pp-point-l">Recompensă</div>
            <div className="pp-point-v">{trust?.type1_points || 0}</div>
          </div>
        </div>
      </div>

      {industries.length > 0 && (
        <div className="pp-side-card">
          <div className="pp-side-l">Industrii & Expertize</div>
          <div className="pp-chips">
            {industries.map(ind => <span key={ind} className="pp-chip">{ind}</span>)}
          </div>
        </div>
      )}

      {completedProjects?.length > 0 && (
        <div className="pp-side-card">
          <div className="pp-side-l">
            <span>Proiecte recente</span>
            <a
              onClick={onShowProjects}
              style={{ color: 'var(--accent-hi)', cursor: 'pointer', fontSize: 11, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--f-sans)' }}
            >Vezi toate ({completedProjects.length})</a>
          </div>
          <div>
            {completedProjects.slice(0, 3).map(p => (
              <div key={p.id} className="pp-mini-proj" onClick={onShowProjects}>
                <div className="pp-mini-proj-icon"><Icon name="check" size={13} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pp-mini-proj-t">{p.title}</div>
                  <div className="pp-mini-proj-m">
                    {new Date(p.created_at).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pp-side-card" style={{ background: 'var(--bg-1)', borderColor: 'var(--border-1)' }}>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
          <Icon name="lock" size={14} style={{ color: 'var(--fg-3)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            Datele de contact sunt vizibile doar utilizatorilor cu un proiect activ împreună.
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— Empty state ———
function EmptyState({ icon = 'folder', title, description }) {
  return (
    <div className="pp-empty">
      <div className="pp-empty-i"><Icon name={icon} size={22} /></div>
      <div className="pp-empty-t">{title}</div>
      {description && <div className="pp-empty-d">{description}</div>}
    </div>
  );
}

// ——— Reviews summary + breakdown ———
function ReviewsSummary({ reviews, avgRating, totalReviews }) {
  return (
    <div className="pp-rev-summary">
      <div className="pp-rev-big-rating">
        <div className="pp-rev-avg"><em>{Number(avgRating).toFixed(1)}</em></div>
        <div className="pp-rev-stars">
          {[1,2,3,4,5].map(s => (
            <Icon key={s} name="star" size={14} className={s <= Math.round(avgRating) ? '' : 'off'} />
          ))}
        </div>
        <div className="pp-rev-count">{totalReviews} recenzii</div>
      </div>
      <div className="pp-rev-bars">
        {[5,4,3,2,1].map(star => {
          const count = reviews.filter(r => r.rating === star).length;
          const pct = totalReviews > 0 ? Math.round(count / totalReviews * 100) : 0;
          return (
            <div key={star} className="pp-rev-bar-row">
              <span className="star-lbl">{star}<Icon name="star" size={10} /></span>
              <div className="pp-rev-bar"><div className="pp-rev-bar-fill" style={{ width: `${pct}%` }} /></div>
              <span style={{ textAlign: 'right' }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ——— Single review item ———
function ReviewItem({ review }) {
  const initial = (review.reviewer_name || '?')[0].toUpperCase();
  return (
    <div className="pp-rev-item">
      <div className="pp-rev-item-h">
        <div className="pp-rev-author">
          <div className="pp-rev-author-avatar">{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div className="pp-rev-author-name">{review.reviewer_name || 'Utilizator anonim'}</div>
            <div className="pp-rev-author-meta">
              {review.reviewer_role && (
                <>
                  <span>
                    {review.reviewer_role === 'company' ? 'Companie' :
                     review.reviewer_role === 'expert'  ? 'Expert'   :
                     review.reviewer_role === 'client'  ? 'Client'   : review.reviewer_role}
                  </span>
                  {review.project_title && <span className="sep">·</span>}
                </>
              )}
              {review.project_title && <span>{review.project_title}</span>}
            </div>
          </div>
        </div>
        <div className="pp-rev-date">
          {new Date(review.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className="pp-rev-stars-inline">
        {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} className={s <= review.rating ? '' : 'off'} />)}
      </div>
      {review.review_text && <p className="pp-rev-text">{review.review_text}</p>}
    </div>
  );
}

// ——— Reviews section ———
function ReviewsSection({ reviews, avgRating, totalReviews }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');

  const ratingCounts = useMemo(() => ({
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  }), [reviews]);

  const filtered = useMemo(() => {
    let list = reviews.slice();
    if (filter !== 'all') {
      const r = parseInt(filter, 10);
      list = list.filter(x => x.rating === r);
    }
    list.sort((a, b) => {
      if (sort === 'recent') return new Date(b.created_at) - new Date(a.created_at);
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'best')   return b.rating - a.rating || (new Date(b.created_at) - new Date(a.created_at));
      if (sort === 'worst')  return a.rating - b.rating || (new Date(b.created_at) - new Date(a.created_at));
      return 0;
    });
    return list;
  }, [reviews, filter, sort]);

  return (
    <div className="pp-card">
      <div className="pp-card-h">
        <div className="pp-card-title">
          Recenzii
          <span className="ct-count">{totalReviews}</span>
        </div>
      </div>
      <div className="pp-card-body">
        {totalReviews === 0 ? (
          <EmptyState
            icon="star-outline"
            title="Niciun review încă"
            description="Recenziile apar după ce un proiect este finalizat și partenerul lasă feedback."
          />
        ) : (
          <>
            <ReviewsSummary reviews={reviews} avgRating={avgRating} totalReviews={totalReviews} />

            <div className="pp-rev-controls">
              <span className="sort-l">Filtrează:</span>
              <button
                className={`pp-pill-btn ${filter === 'all' ? 'on' : ''}`}
                onClick={() => setFilter('all')}
              >
                Toate <span style={{ opacity: 0.6 }}>({totalReviews})</span>
              </button>
              {[5,4,3,2,1].filter(s => ratingCounts[s] > 0).map(s => (
                <button
                  key={s}
                  className={`pp-pill-btn ${filter === String(s) ? 'on' : ''}`}
                  onClick={() => setFilter(String(s))}
                >
                  {s}<Icon name="star" size={10} style={{ color: 'var(--warning)' }} />
                  <span style={{ opacity: 0.6 }}>({ratingCounts[s]})</span>
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="sort-l">Sortare:</span>
                <select className="pp-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="recent">Cele mai recente</option>
                  <option value="oldest">Cele mai vechi</option>
                  <option value="best">Rating ↓</option>
                  <option value="worst">Rating ↑</option>
                </select>
              </div>
            </div>

            <div className="pp-rev-list">
              {filtered.length === 0 ? (
                <EmptyState icon="filter" title="Nicio recenzie cu acest filtru" description="Schimbă filtrul pentru a vedea mai multe." />
              ) : filtered.map(r => <ReviewItem key={r.id} review={r} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ——— Portfolio item ———
function PortfolioItem({ item, onClick }) {
  const grad = gradientFor(item.id);
  const hasMedia = !!item.file_url;
  return (
    <div className={`pp-port-item ${item.is_featured ? 'featured' : ''}`} onClick={onClick}>
      <div className="pp-port-thumb" style={{ background: hasMedia ? 'var(--bg-2)' : grad }}>
        {hasMedia && item.file_type === 'video' && (
          <>
            <video src={item.file_url} muted playsInline preload="metadata" />
            <div className="pp-port-video-overlay"><Icon name="play" size={18} /></div>
          </>
        )}
        {hasMedia && item.file_type !== 'video' && (
          <img src={item.file_url} alt={item.title} loading="lazy" decoding="async" />
        )}
        {!hasMedia && <div className="pp-port-thumb-grid" />}
        {item.is_featured && (
          <div className="pp-port-featured-badge"><Icon name="star" size={9} />Featured</div>
        )}
        {!hasMedia && (
          <div className="pp-port-thumb-label">
            {item.file_type === 'video'
              ? <Icon name="video" size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />
              : `[${item.category || 'project'}]`
            }
          </div>
        )}
      </div>
      <div className="pp-port-info">
        <div className="pp-port-title">{item.title}</div>
        <div className="pp-port-meta">
          {item.category && <span>{item.category}</span>}
          {item.client_name && (
            <>
              <span className="sep">·</span>
              <span>{item.client_name}</span>
            </>
          )}
          {item.project_year && (
            <>
              <span className="sep">·</span>
              <span>{item.project_year}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Portfolio section ———
function PortfolioSection({ portfolio, onOpenItem }) {
  const [cat, setCat] = useState('all');
  const categories = useMemo(() => {
    const set = new Set(portfolio.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [portfolio]);
  const filtered = useMemo(
    () => cat === 'all' ? portfolio : portfolio.filter(p => p.category === cat),
    [portfolio, cat]
  );

  return (
    <div className="pp-card">
      <div className="pp-card-h">
        <div className="pp-card-title">
          Portofoliu
          <span className="ct-count">{portfolio.length}</span>
        </div>
      </div>
      <div className="pp-card-body">
        {portfolio.length === 0 ? (
          <EmptyState
            icon="image"
            title="Portofoliul este gol"
            description="Acest utilizator nu a adăugat încă proiecte în portofoliu."
          />
        ) : (
          <>
            {categories.length > 2 && (
              <div className="pp-chips pp-scroll-x" style={{ marginBottom: '1rem', flexWrap: 'nowrap' }}>
                {categories.map(c => (
                  <button
                    key={c}
                    className={`pp-chip pp-chip-btn ${cat === c ? 'on' : ''}`}
                    onClick={() => setCat(c)}
                  >
                    {c === 'all' ? 'Toate' : c}
                    <span style={{ opacity: 0.6, marginLeft: 4 }}>
                      ({c === 'all' ? portfolio.length : portfolio.filter(p => p.category === c).length})
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="pp-port-grid">
              {filtered.map(item => (
                <PortfolioItem key={item.id} item={item} onClick={() => onOpenItem(item)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ——— Lightbox ———
function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;
  const grad = gradientFor(item.id);
  const hasMedia = !!item.file_url;

  return (
    <div className="pp-lb-bg" onClick={onClose}>
      <button className="pp-lb-close" onClick={onClose}><Icon name="x" size={16} /></button>
      <div className="pp-lb-box" onClick={e => e.stopPropagation()}>
        <div className="pp-lb-media" style={{ background: hasMedia ? 'var(--bg-2)' : grad }}>
          {hasMedia && item.file_type === 'video' && (
            <video src={item.file_url} controls autoPlay />
          )}
          {hasMedia && item.file_type !== 'video' && (
            <img src={item.file_url} alt={item.title} loading="lazy" decoding="async" />
          )}
          {!hasMedia && (
            <>
              <div className="pp-port-thumb-grid" style={{ position: 'absolute', inset: 0 }} />
              <div style={{
                position: 'relative',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--f-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                [{item.category || 'project'} preview]
              </div>
            </>
          )}
          {item.is_featured && (
            <div className="pp-port-featured-badge" style={{ top: 16, left: 16 }}>
              <Icon name="star" size={10} />Featured
            </div>
          )}
        </div>
        <div className="pp-lb-details">
          <div>
            {item.category && (
              <div style={{
                fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
              }}>{item.category}</div>
            )}
            <h2 className="pp-lb-title">{item.title}</h2>
          </div>

          {item.description && (
            <p style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
          )}

          <div>
            {item.client_name && (
              <div className="pp-lb-row"><span className="l">Client</span><span className="v">{item.client_name}</span></div>
            )}
            {item.project_year && (
              <div className="pp-lb-row"><span className="l">An</span><span className="v">{item.project_year}</span></div>
            )}
            {item.technologies && (
              <div className="pp-lb-row">
                <span className="l">Tehnologii</span>
                <span className="v" style={{ color: 'var(--accent-hi)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>{item.technologies}</span>
              </div>
            )}
            {item.results && (
              <div className="pp-lb-row">
                <span className="l">Rezultate</span>
                <span className="v" style={{ color: 'var(--success)' }}>{item.results}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— Completed projects modal ———
function ProjectsModal({ projects, onClose, onPick }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="pp-lb-bg" onClick={onClose}>
      <div className="pp-lb-box" onClick={e => e.stopPropagation()} style={{ gridTemplateColumns: '1fr', maxWidth: 720 }}>
        <button className="pp-lb-close" onClick={onClose}><Icon name="x" size={16} /></button>
        <div className="pp-lb-details" style={{ padding: '1.5rem', maxHeight: 'min(80vh, 700px)' }}>
          <div>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-3)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}>{projects.length} proiecte</div>
            <h2 className="pp-lb-title">Proiecte finalizate</h2>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon="folder" title="Niciun proiect finalizat" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 4 }}>
              {projects.map(p => (
                <div
                  key={p.id}
                  className="pp-mini-proj"
                  onClick={() => onPick(p)}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-md)',
                    borderTop: '1px solid var(--border-1)',
                  }}
                >
                  <div className="pp-mini-proj-icon"><Icon name="check" size={14} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pp-mini-proj-t">{p.title}</div>
                    {p.description && (
                      <div style={{
                        fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.45,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                      }}>{p.description}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, color: 'var(--fg-1)', fontWeight: 600 }}>
                      {parseInt(p.budget_ron || 0).toLocaleString('ro-RO')}
                      <span style={{ color: 'var(--fg-3)', fontSize: 10 }}> RON</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>
                      {new Date(p.created_at).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Floating CTA ———
function FloatingCTA({ user, onClick, show }) {
  return (
    <div className={`pp-floating-cta ${show ? 'show' : ''}`}>
      <div className="pp-fc-avatar">{(user.name || 'U')[0]}</div>
      <div className="pp-fc-text">
        Discută cu <strong>{user.name?.split(' ')[0]}</strong>
      </div>
      <button className="btn btn-primary" onClick={onClick}>
        <Icon name="message" size={13} />Trimite mesaj
      </button>
    </div>
  );
}

// ——— Admin debug panel (kept from previous version, collapsible) ———
function AdminPanel({ user, trust, userId, navigate }) {
  const [open, setOpen] = useState(false);
  const pts = [
    { label: 'Cunoscut direct de admin', val: trust?.is_known_directly_by_admin, pts: '20p' },
    { label: 'Apel verificare', val: trust?.has_verification_call, pts: '15p' },
    { label: 'Profil complet', val: trust?.profile_completed, pts: '15p' },
    { label: 'Fotografie profil', val: trust?.profile_photo_added, pts: '10p' },
    { label: 'Email validat', val: trust?.email_validated, pts: '10p' },
    { label: 'Portofoliu aprobat', val: trust?.portfolio_approved_by_admin, pts: '15p' },
    { label: 'KYC (Stripe)', val: trust?.verified_identity, pts: '5p' },
    { label: 'Contract Master (doar companii)', val: trust?.accepted_master_contract, pts: '15p' },
    { label: 'Recomandat de utilizator', val: trust?.referred_by, pts: '10p' },
    { label: 'Colaborare directă', val: trust?.has_direct_collaboration, pts: '10p' },
  ];

  return (
    <div className="pp-card" style={{ borderColor: 'var(--danger-border)' }}>
      <div
        className="pp-card-h"
        style={{ cursor: 'pointer', background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="pp-card-title" style={{ color: 'var(--danger)' }}>
          <Icon name="shield" size={15} />
          Panel Admin — Informații Verificare
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => { e.stopPropagation(); navigate('/admin/dashboard'); }}
          >Dashboard →</button>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} style={{ color: 'var(--fg-3)' }} />
        </div>
      </div>
      {open && (
        <div className="pp-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 8, fontFamily: 'var(--f-mono)' }}>
                Email & Identitate
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <div><span style={{ color: 'var(--fg-3)' }}>Email: </span><span style={{ color: 'var(--fg-1)' }}>{user?.email || 'N/A'}</span></div>
                <div><span style={{ color: 'var(--fg-3)' }}>Telefon: </span><span style={{ color: 'var(--fg-1)' }}>{user?.phone || 'N/A'}</span></div>
                <div>
                  <span style={{ color: 'var(--fg-3)' }}>KYC (Stripe): </span>
                  <span style={{ color: trust?.verified_identity ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {trust?.verified_identity ? 'Verificat' : 'Neconfirmat'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 8, fontFamily: 'var(--f-mono)' }}>
                Trust Profile
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <div><span style={{ color: 'var(--fg-3)' }}>Level: </span><span style={{ color: 'var(--fg-1)' }}>{trust?.trust_level || 1} / 5</span></div>
                <div><span style={{ color: 'var(--fg-3)' }}>Score: </span><span style={{ color: 'var(--fg-1)' }}>{Math.round(trust?.trust_score || 0)}</span></div>
                <div><span style={{ color: 'var(--fg-3)' }}>Proiecte: </span><span style={{ color: 'var(--fg-1)' }}>{trust?.total_projects_completed || 0}</span></div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '0.875rem 1rem', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 8, fontFamily: 'var(--f-mono)' }}>
                Puncte Identitate
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.25rem 0.75rem' }}>
                {pts.map(({ label, val, pts: p }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)', padding: '0.25rem 0' }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600, color: val ? 'var(--success)' : 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>
                      {val ? p : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '0.75rem', paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-1)',
                fontWeight: 600, fontSize: 12.5,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'var(--fg-1)' }}>Total puncte identitate</span>
                <span style={{ color: 'var(--accent-hi)', fontFamily: 'var(--f-mono)' }}>{trust?.type2_points || 0}p</span>
              </div>
            </div>
          </div>

          {user?.kyc_status !== 'verified' && (
            <button
              className="btn btn-success btn-sm"
              onClick={async () => {
                try {
                  await apiClient.put(`/admin/experts/${userId}/verify`, {});
                  window.location.reload();
                } catch (e) {
                  alert('Eroare: ' + (e.response?.data?.error || e.message));
                }
              }}
            >Aprobă KYC</button>
          )}
        </div>
      )}
    </div>
  );
}

// ——— Main PublicProfile ———
export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [user, setUser] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [lightboxItem, setLightboxItem] = useState(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const isAdmin = authUser?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
  const isSelf = authUser && String(authUser.id) === String(userId);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const profileRes = await apiClient.get(`/users/${userId}/public-profile`);
        if (cancelled) return;
        setUser(profileRes.data);
        setPortfolio(profileRes.data.portfolio || []);

        const tasks = [
          apiClient.get(`/trust-profiles/${userId}`).then(r => !cancelled && setTrustProfile(r.data)).catch(() => {}),
          apiClient.get(`/reviews/user/${userId}`).then(r => {
            if (cancelled) return;
            setReviews(r.data.reviews || []);
            setAverageRating(r.data.average_rating || 0);
            setTotalReviews(r.data.total_reviews || 0);
          }).catch(() => {}),
          apiClient.get(`/users/${userId}/completed-projects`)
            .then(r => !cancelled && setCompletedProjects(r.data.projects || []))
            .catch(() => {}),
        ];
        await Promise.allSettled(tasks);
        if (!cancelled) setError('');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Profilul nu a putut fi încărcat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) fetchAll();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const handler = () => setShowFloating(window.scrollY > 540);
    handler();
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (loading) {
    return (
      <div className="pp-wrap">
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 14 }}>
          Se încarcă profilul...
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="pp-wrap">
        <div className="pp-card" style={{ maxWidth: 440, margin: '3rem auto', textAlign: 'center' }}>
          <div className="pp-card-body">
            <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: 0 }}>{error || 'Profil negăsit'}</p>
          </div>
        </div>
      </div>
    );
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    : '';
  const verifiedAt = user.verification_date
    ? new Date(user.verification_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const canMessage = !isSelf && !!authUser;
  const canPropose = !isSelf && (user.role === 'expert' || user.role === 'company');

  const onMessage = () => navigate(`/chat?to=${userId}`);
  const onPropose = () => navigate('/create-project', { state: { expertId: userId } });
  const onShare = async () => {
    const url = `${window.location.origin}/profile/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: user.name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  return (
    <div className="pp-wrap">
      {isAdmin && <AdminPanel user={user} trust={trustProfile} userId={userId} navigate={navigate} />}

      <Hero
        user={user}
        trust={trustProfile}
        canMessage={canMessage}
        canPropose={canPropose}
        onMessage={onMessage}
        onPropose={onPropose}
        onShare={onShare}
        memberSince={memberSince}
      />

      <StatsStrip
        user={user}
        trust={trustProfile}
        avgRating={averageRating}
        totalReviews={totalReviews}
        onShowProjects={() => setShowProjects(true)}
      />

      <div className="pp-grid">
        <div>
          {trustProfile && <TrustPanel trust={trustProfile} verifiedAt={verifiedAt} />}

          {(user.industry || user.expertise || user.experience || user.bio) && (
            <div className="pp-card">
              <div className="pp-card-h">
                <div className="pp-card-title">Despre</div>
              </div>
              <div className="pp-card-body">
                {(user.industry || user.expertise || user.experience) && (
                  <div className="pp-about-grid">
                    {user.industry && (
                      <div className="pp-info-row">
                        <div className="pp-info-l">Industrie</div>
                        <div className="pp-info-v">{user.industry}</div>
                      </div>
                    )}
                    {user.expertise && (
                      <div className="pp-info-row">
                        <div className="pp-info-l">{user.role === 'expert' ? 'Expertiză' : 'Domeniu'}</div>
                        <div className="pp-info-v">{user.expertise}</div>
                      </div>
                    )}
                    {user.experience && (
                      <div className="pp-info-row">
                        <div className="pp-info-l">Experiență</div>
                        <div className="pp-info-v">{user.experience} ani</div>
                      </div>
                    )}
                  </div>
                )}
                {user.bio && <p className="pp-bio">{user.bio}</p>}
              </div>
            </div>
          )}

          <ReviewsSection reviews={reviews} avgRating={averageRating} totalReviews={totalReviews} />

          <PortfolioSection portfolio={portfolio} onOpenItem={setLightboxItem} />
        </div>

        <Sidebar
          user={user}
          trust={trustProfile}
          completedProjects={completedProjects}
          onShowProjects={() => setShowProjects(true)}
        />
      </div>

      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
      {showProjects && (
        <ProjectsModal
          projects={completedProjects}
          onClose={() => setShowProjects(false)}
          onPick={(p) => { setShowProjects(false); navigate(`/project/${p.id}`); }}
        />
      )}
      {canMessage && <FloatingCTA user={user} onClick={onMessage} show={showFloating} />}
    </div>
  );
}
