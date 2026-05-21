import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchCompletedProjects = async () => {
    try {
      setLoadingProjects(true);
      setShowCompletedProjects(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/users/${userId}/completed-projects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCompletedProjects(response.data.projects || []);
    } catch (err) {
      console.error('Error fetching completed projects:', err);
      setCompletedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');
        if (token && userRole === 'admin') setIsAdmin(true);
        const response = await apiClient.get(`/users/${userId}/public-profile`);
        setUser(response.data);
        setPortfolio(response.data.portfolio || []);
        try {
          const trustResponse = await apiClient.get(`/trust-profiles/${userId}`);
          setTrustProfile(trustResponse.data);
        } catch (e) {}
        try {
          const reviewsResponse = await apiClient.get(`/reviews/user/${userId}`);
          setReviews(reviewsResponse.data.reviews || []);
          setAverageRating(reviewsResponse.data.average_rating || 0);
          setTotalReviews(reviewsResponse.data.total_reviews || 0);
        } catch (e) {}
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Profilul nu a putut fi încărcat');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserProfile();
  }, [userId]);

  if (loading) return (
    <div className="escro-page">
      <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 14 }}>
        Se încarcă profilul...
      </div>
    </div>
  );

  if (error || !user) return (
    <div className="escro-page">
      <div className="card" style={{ maxWidth: 440, margin: '3rem auto', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: 0 }}>{error || 'Profil negăsit'}</p>
      </div>
    </div>
  );

  const firstName = user.name ? user.name.split(' ')[0] : 'Utilizator';
  const isVerified = user.kyc_status === 'verified';
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    : '';
  const trustLevel = trustProfile?.trust_level;
  const roleLabel = user.role === 'expert' ? 'Expert' : user.role === 'company' ? 'Companie' : 'Client';
  const isViewingOtherProfile = authUser && String(authUser.id) !== String(userId);
  const canPropose = isViewingOtherProfile && (user.role === 'expert' || user.role === 'company');

  return (
    <div className="escro-page">

      {/* Lightbox */}
      {selectedMedia && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}
          onClick={() => setSelectedMedia(null)}
        >
          <button
            style={{ position: 'absolute', top: '1rem', right: '1rem', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedMedia(null)}
          >×</button>
          {selectedMedia.file_type === 'video'
            ? <video src={selectedMedia.file_url} controls style={{ maxWidth: '90%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--r-md)' }} autoPlay />
            : <img src={selectedMedia.file_url} alt={selectedMedia.title} loading="lazy" decoding="async" style={{ maxWidth: '90%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--r-md)' }} />
          }
          <div
            style={{ marginTop: '1rem', maxWidth: 600, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: '1rem 1.25rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 .5rem', color: 'var(--fg-0)', fontSize: 15, fontWeight: 600 }}>{selectedMedia.title}</h3>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: selectedMedia.description ? '.625rem' : 0 }}>
              {selectedMedia.category && <span className="badge badge-blue no-dot">{selectedMedia.category}</span>}
              {selectedMedia.is_featured && <span className="badge badge-amber no-dot">⭐ Featured</span>}
            </div>
            {selectedMedia.description && <p style={{ margin: '0 0 .75rem', color: 'var(--fg-2)', fontSize: 13, lineHeight: 1.6 }}>{selectedMedia.description}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '.75rem', fontSize: 13 }}>
              {selectedMedia.client_name && <div><span style={{ color: 'var(--fg-3)' }}>Client: </span><span style={{ color: 'var(--fg-1)' }}>{selectedMedia.client_name}</span></div>}
              {selectedMedia.project_year && <div><span style={{ color: 'var(--fg-3)' }}>An: </span><span style={{ color: 'var(--fg-1)' }}>{selectedMedia.project_year}</span></div>}
              {selectedMedia.technologies && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--fg-3)' }}>Tehnologii: </span><span style={{ color: 'var(--accent-hi)' }}>{selectedMedia.technologies}</span></div>}
              {selectedMedia.results && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--fg-3)' }}>Rezultate: </span><span style={{ color: 'var(--success)' }}>{selectedMedia.results}</span></div>}
            </div>
          </div>
        </div>
      )}

      {/* Completed projects modal */}
      {showCompletedProjects && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}
          onClick={() => setShowCompletedProjects(false)}
        >
          <div
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', maxWidth: 680, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-head">
              <span className="card-title">Proiecte Finalizate</span>
              <button
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border-1)', border: '1px solid var(--border-2)', color: 'var(--fg-2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowCompletedProjects(false)}
              >×</button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              {loadingProjects
                ? <p style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '2rem 0' }}>Se încarcă...</p>
                : completedProjects.length === 0
                  ? <p style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '2rem 0' }}>Nu există proiecte finalizate</p>
                  : (
                    <div style={{ display: 'grid', gap: '.75rem' }}>
                      {completedProjects.map(project => (
                        <div
                          key={project.id}
                          className="vault"
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setShowCompletedProjects(false); navigate(`/project/${project.id}`); }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>{project.title}</span>
                            <span className="badge badge-green no-dot">✓ Finalizat</span>
                          </div>
                          <p style={{ margin: '0 0 .5rem', color: 'var(--fg-3)', fontSize: 13 }}>
                            {project.description?.length > 120 ? project.description.substring(0, 120) + '...' : project.description || 'Fără descriere'}
                          </p>
                          <div style={{ display: 'flex', gap: '1.25rem', fontSize: 12.5, color: 'var(--fg-3)' }}>
                            <span>💰 <strong style={{ color: 'var(--fg-2)' }}>{parseInt(project.budget_ron || 0).toLocaleString('ro-RO')} RON</strong></span>
                            <span>📅 {new Date(project.created_at).toLocaleDateString('ro-RO')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              }
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{roleLabel}</div>
          <h1 className="page-title">{user.name || firstName}</h1>
          <p className="page-subtitle">
            {user.expertise || user.industry || roleLabel}
            {memberSince && <> · Membru din {memberSince}</>}
          </p>
        </div>
        <div className="page-actions">
          {canPropose && (
            <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
              + Propune un proiect
            </button>
          )}
        </div>
      </div>

      {/* Admin panel */}
      {isAdmin && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', marginBottom: '1.5rem' }}>
          <div className="card-head" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
            <span className="card-title" style={{ color: 'var(--danger)' }}>🛡️ Panel Admin — Informații Verificare</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/dashboard')}>Dashboard →</button>
          </div>
          <div className="card-body">
            <div className="grid-3" style={{ gap: '1rem' }}>

              {/* Email & Identitate */}
              <div className="vault">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '.75rem' }}>📧 Email & Identitate</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--fg-3)' }}>Email: </span><span style={{ color: 'var(--fg-1)' }}>{user?.email}</span></div>
                  <div><span style={{ color: 'var(--fg-3)' }}>Telefon: </span><span style={{ color: 'var(--fg-1)' }}>{user?.phone || 'N/A'}</span></div>
                  <div>
                    <span style={{ color: 'var(--fg-3)' }}>KYC (Stripe): </span>
                    <span style={{ color: trustProfile?.verified_identity ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {trustProfile?.verified_identity ? '✅ Verificat' : '❌ Neconfirmat'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Profile */}
              <div className="vault">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '.75rem' }}>⭐ Trust Profile</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--fg-3)' }}>Level: </span><span style={{ color: 'var(--fg-1)' }}>{trustProfile?.trust_level || 1} / 5</span></div>
                  <div><span style={{ color: 'var(--fg-3)' }}>Score: </span><span style={{ color: 'var(--fg-1)' }}>{trustProfile?.trust_score || 0}</span></div>
                  <div>
                    <span style={{ color: 'var(--fg-3)' }}>Apel verificare: </span>
                    <span style={{ color: trustProfile?.has_verification_call ? 'var(--success)' : 'var(--danger)' }}>
                      {trustProfile?.has_verification_call ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistici */}
              <div className="vault">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '.75rem' }}>📊 Statistici</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--fg-3)' }}>Proiecte finalizate: </span><span style={{ color: 'var(--fg-1)' }}>{trustProfile?.total_projects_completed || 0}</span></div>
                  <div><span style={{ color: 'var(--fg-3)' }}>Rating: </span><span style={{ color: 'var(--fg-1)' }}>{trustProfile?.average_rating || 0} / 5</span></div>
                  <div>
                    <span style={{ color: 'var(--fg-3)' }}>Cunoscut de admin: </span>
                    <span style={{ color: trustProfile?.is_known_directly_by_admin ? 'var(--success)' : 'var(--danger)' }}>
                      {trustProfile?.is_known_directly_by_admin ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Puncte Identitate */}
              <div className="vault" style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '.75rem' }}>🆔 Puncte Identitate</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '.3rem .75rem' }}>
                  {[
                    { label: 'Cunoscut direct de admin', val: trustProfile?.is_known_directly_by_admin, pts: '20p' },
                    { label: 'Apel verificare', val: trustProfile?.has_verification_call, pts: '15p' },
                    { label: 'Profil complet', val: trustProfile?.profile_completed, pts: '15p' },
                    { label: 'Fotografie profil', val: trustProfile?.profile_photo_added, pts: '10p' },
                    { label: 'Email validat', val: trustProfile?.email_validated, pts: '10p' },
                    { label: 'Portofoliu aprobat', val: trustProfile?.portfolio_approved_by_admin, pts: '15p' },
                    { label: 'KYC (Stripe)', val: trustProfile?.verified_identity, pts: '5p' },
                    { label: 'Contract Master (doar companii)', val: trustProfile?.accepted_master_contract, pts: '15p' },
                    { label: 'Recomandat de utilizator', val: trustProfile?.referred_by, pts: '10p' },
                    { label: 'Colaborare directă', val: trustProfile?.has_direct_collaboration, pts: '10p' },
                  ].map(({ label, val, pts }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-2)', padding: '.25rem 0' }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 600, color: val ? 'var(--success)' : 'var(--fg-3)' }}>
                        {val ? `✅ ${pts}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border-1)', fontWeight: 600, fontSize: 13, color: 'var(--fg-1)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total puncte identitate</span>
                  <span style={{ color: 'var(--accent-hi)' }}>{trustProfile?.type2_points || 0}p</span>
                </div>
              </div>

              {/* Admin actions */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                {user?.kyc_status !== 'verified' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={async () => {
                      try {
                        await apiClient.put(`/admin/experts/${userId}/verify`, {});
                        alert('Utilizator aprobat!');
                        window.location.reload();
                      } catch (e) {
                        alert('Eroare: ' + (e.response?.data?.error || e.message));
                      }
                    }}
                  >✅ Aprobă KYC</button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main profile card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>

        {/* Banner */}
        <div style={{
          height: 110,
          background: 'linear-gradient(135deg, var(--accent-lo) 0%, var(--violet) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
        </div>

        {/* Profile hero */}
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginTop: -46, marginBottom: '1rem' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user.profile_image_url
                ? <img
                    src={user.profile_image_url}
                    alt={user.name}
                    style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-card)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
                  />
                : <div className="avatar xl" style={{ border: '3px solid var(--bg-card)' }}>{firstName[0]}</div>
              }
              {isVerified && (
                <div style={{ position: 'absolute', bottom: 4, right: 2, width: 22, height: 22, background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, border: '2px solid var(--bg-card)' }}>✓</div>
              )}
            </div>

            {/* Name + badges */}
            <div style={{ paddingBottom: '.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', flexWrap: 'wrap', marginBottom: '.375rem' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.02em', fontWeight: 700 }}>{user.name || firstName}</span>
                {isVerified && <span className="badge badge-green no-dot">Verificat KYC</span>}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: trustLevel ? '.625rem' : 0 }}>
                {roleLabel}
                {(user.expertise || user.industry) && <> · {user.expertise || user.industry}</>}
              </div>
              {trustLevel && (
                <div className="trust">
                  <div className="trust-l">Trust L{trustLevel}</div>
                  <div className="trust-d">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`trust-pip ${n <= trustLevel ? 'on' : ''}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border-1)' }}>
          {[
            { label: 'Proiecte finalizate', value: user.completed_projects || 0, color: 'var(--accent-hi)', sep: true, click: fetchCompletedProjects, underline: true },
            { label: 'Rating mediu', value: totalReviews > 0 ? Number(averageRating).toFixed(1) : '—', color: totalReviews > 0 ? 'var(--warning)' : 'var(--fg-3)', sep: true },
            { label: 'Recenzii', value: totalReviews, color: 'var(--fg-0)' },
          ].map(s => (
            <div key={s.label}
              onClick={s.click}
              style={{
                flex: 1, padding: '1rem', textAlign: 'center',
                borderRight: s.sep ? '1px solid var(--border-1)' : 'none',
                cursor: s.click ? 'pointer' : 'default',
              }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 5, textDecoration: s.underline ? 'underline dotted' : 'none', textUnderlineOffset: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Points */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Puncte Încredere', value: Math.round(trustProfile?.trust_score || 0), color: 'var(--warning)', borderColor: 'var(--warning-border)' },
          { label: 'Puncte Identitate', value: trustProfile?.type2_points || 0,            color: 'var(--accent-hi)', borderColor: 'var(--accent-border)' },
          { label: 'Puncte Recompensă', value: trustProfile?.type1_points || 0,            color: 'var(--success)', borderColor: 'var(--success-border)' },
        ].map(pt => (
          <div key={pt.label} className="stat" style={{ borderLeft: `3px solid ${pt.borderColor}` }}>
            <div className="stat-label">{pt.label}</div>
            <div className="stat-value" style={{ color: pt.color, fontSize: 26 }}>{pt.value}</div>
          </div>
        ))}
      </div>

      {/* Info + Bio */}
      {(user.industry || user.expertise || user.experience || user.bio) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {(user.industry || user.expertise || user.experience) && (
            <div className="card-body" style={{ borderBottom: user.bio ? '1px solid var(--border-1)' : 'none' }}>
              <div className="card-title" style={{ marginBottom: '.875rem' }}>Informații</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {user.industry && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Industrie</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{user.industry}</div>
                  </div>
                )}
                {user.expertise && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{user.role === 'expert' ? 'Expertiză' : 'Domeniu'}</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{user.expertise}</div>
                  </div>
                )}
                {user.experience && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Experiență</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{user.experience} ani</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {user.bio && (
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: '.875rem' }}>Despre</div>
              <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.75, margin: 0 }}>{user.bio}</p>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <span className="card-title">Recenzii</span>
          {totalReviews > 0 && <span className="badge badge-grey no-dot">{totalReviews}</span>}
        </div>
        <div className="card-body">
          {totalReviews === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-3)', fontSize: 13, padding: '1.5rem 0' }}>
              Nicio recenzie disponibilă încă.
            </div>
          ) : (
            <>
              {/* Rating summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 1.25rem', background: 'var(--bg-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-1)', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', minWidth: 64 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--f-mono)', lineHeight: 1 }}>{Number(averageRating).toFixed(1)}</div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '4px 0' }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize: 13, color: s <= Math.round(parseFloat(averageRating)) ? 'var(--warning)' : 'var(--border-3)' }}>★</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{totalReviews} recenzii</div>
                </div>
                <div style={{ flex: 1 }}>
                  {[5,4,3,2,1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = totalReviews > 0 ? Math.round(count / totalReviews * 100) : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', width: 12, textAlign: 'right' }}>{star}</span>
                        <span style={{ fontSize: 10, color: 'var(--warning)' }}>★</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--warning)', borderRadius: 3, transition: 'width .4s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', width: 24 }}>{count > 0 ? count : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual reviews */}
              <div style={{ display: 'grid', gap: '.75rem' }}>
                {reviews.map(review => (
                  <div key={review.id} className="vault">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', marginBottom: review.review_text ? '.5rem' : 0 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                          {[1,2,3,4,5].map(s => (
                            <span key={s} style={{ fontSize: 14, color: s <= review.rating ? 'var(--warning)' : 'var(--border-3)' }}>★</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                          <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{review.reviewer_name || 'Utilizator anonim'}</strong>
                          {review.project_title && <span style={{ marginLeft: 4 }}>· {review.project_title}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, marginTop: 2 }}>
                        {new Date(review.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    {review.review_text && (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65, fontStyle: 'italic' }}>
                        "{review.review_text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Portfolio */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <span className="card-title">Portofoliu</span>
          <span className="badge badge-grey no-dot">{portfolio.length}</span>
        </div>
        <div className="card-body">
          {portfolio.length === 0 ? (
            <div style={{ background: 'var(--bg-1)', border: '2px dashed var(--border-2)', borderRadius: 'var(--r-md)', padding: '2.5rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
              Nu există proiecte în portofoliu
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {portfolio.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  style={{
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                    background: 'var(--bg-1)',
                    border: item.is_featured ? '1px solid var(--warning-border)' : '1px solid var(--border-1)',
                    cursor: 'pointer',
                    position: 'relative',
                    aspectRatio: '4/3',
                  }}
                >
                  {item.is_featured && (
                    <div style={{ position: 'absolute', top: '.5rem', left: '.5rem', background: 'var(--warning)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, zIndex: 2, letterSpacing: '0.05em' }}>⭐ FEATURED</div>
                  )}
                  {item.file_type === 'video'
                    ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <video src={item.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 40, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>▶</div>
                      </div>
                    )
                    : <img src={item.file_url} alt={item.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '.75rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.82))', color: 'white' }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, marginBottom: item.category ? '.2rem' : 0 }}>{item.title}</h4>
                    {item.category && <span style={{ fontSize: '0.65rem', color: 'rgba(180,210,255,0.9)', marginRight: '.5rem' }}>{item.category}</span>}
                    {item.client_name && <span style={{ fontSize: '0.65rem', color: 'rgba(120,230,160,0.9)' }}>👤 {item.client_name}{item.project_year && ` (${item.project_year})`}</span>}
                  </div>
                  {(item.technologies || item.results) && (
                    <div style={{ padding: '.625rem .75rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-1)' }}>
                      {item.technologies && <p style={{ margin: '0 0 .2rem', fontSize: '0.7rem', color: 'var(--accent-hi)', fontWeight: 500 }}>🔧 {item.technologies}</p>}
                      {item.results && <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--success)' }}>📈 {item.results}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', padding: '.75rem 1rem', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--fg-3)' }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>🔒</span>
        Datele de contact sunt vizibile doar utilizatorilor autentificați care au un proiect activ.
      </div>

    </div>
  );
}
