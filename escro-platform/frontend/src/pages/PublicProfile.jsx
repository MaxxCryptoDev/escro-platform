import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
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
        if (token && userRole === 'admin') {
          setIsAdmin(true);
        }
        const response = await axios.get(`/api/users/${userId}/public-profile`);
        setUser(response.data);
        setPortfolio(response.data.portfolio || []);
        try {
          const trustResponse = await axios.get(`/api/trust-profiles/${userId}`);
          setTrustProfile(trustResponse.data);
        } catch (e) {
          console.log('No trust profile available');
        }
        try {
          const reviewsResponse = await axios.get(`/api/reviews/user/${userId}`);
          setReviews(reviewsResponse.data.reviews || []);
          setAverageRating(reviewsResponse.data.average_rating || 0);
          setTotalReviews(reviewsResponse.data.total_reviews || 0);
        } catch (e) {
          console.log('No reviews available');
        }
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserProfile();
  }, [userId]);

  if (loading) return <div style={styles.container}><div style={styles.loadingCard}><div style={styles.spinner}></div><p style={{ color: '#666', marginTop: '1rem' }}>Se încarcă profilul...</p></div></div>;
  if (error) return <div style={styles.container}><div style={styles.errorCard}><div style={styles.errorIcon}>⚠️</div><p style={styles.errorText}>{error}</p><button onClick={() => navigate(-1)} style={styles.backButton}>← Înapoi</button></div></div>;
  if (!user) return <div style={styles.container}><div style={styles.errorCard}><div style={styles.errorIcon}>🔍</div><p style={styles.errorText}>Profil negăsit</p><button onClick={() => navigate(-1)} style={styles.backButton}>← Înapoi</button></div></div>;

  const firstName = user.name ? user.name.split(' ')[0] : 'Utilizator';
  const isVerified = user.kyc_status === 'verified';
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }) : '';
  const trustLevel = trustProfile?.trust_level;

  const getTrustBadgeStyle = (level) => {
    switch (level) {
      case 5: return { ...styles.trustBadge, ...styles.trustBadgeLevel5 };
      case 4: return { ...styles.trustBadge, ...styles.trustBadgeLevel4 };
      case 3: return { ...styles.trustBadge, ...styles.trustBadgeLevel3 };
      case 2: return { ...styles.trustBadge, ...styles.trustBadgeLevel2 };
      default: return { ...styles.trustBadge, ...styles.trustBadgeLevel1 };
    }
  };
  
  const getTrustLabel = (level) => {
    switch (level) {
      case 5: return '⭐⭐⭐⭐⭐ Expert Verificat';
      case 4: return '⭐⭐⭐⭐ Foarte de Încredere';
      case 3: return '⭐⭐⭐ Încredere Medie';
      case 2: return '⭐⭐ Încredere Minimă';
      default: return '⭐ Încredere Scăzută';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButtonTop}>← Înapoi</button>
      </div>

      {selectedMedia && (
        <div style={styles.lightbox} onClick={() => setSelectedMedia(null)}>
          <button style={styles.closeButton} onClick={() => setSelectedMedia(null)}>×</button>
          {selectedMedia.file_type === 'video' ? <video src={selectedMedia.file_url} controls style={styles.lightboxMedia} autoPlay /> : <img src={selectedMedia.file_url} alt={selectedMedia.title} style={styles.lightboxMedia} />}
          <div style={styles.lightboxCaption}>
            <h3>{selectedMedia.title}</h3>
            {selectedMedia.category && <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', marginRight: '0.5rem' }}>{selectedMedia.category}</span>}
            {selectedMedia.is_featured && <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem' }}>⭐ Featured</span>}
            {selectedMedia.description && <p style={{ marginTop: '0.75rem', color: '#d1d5db' }}>{selectedMedia.description}</p>}
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'auto auto', gap: '1rem', fontSize: '0.85rem' }}>
              {selectedMedia.client_name && <div><span style={{ color: '#9ca3af' }}>Client:</span> <span style={{ color: 'white' }}>{selectedMedia.client_name}</span></div>}
              {selectedMedia.project_year && <div><span style={{ color: '#9ca3af' }}>An:</span> <span style={{ color: 'white' }}>{selectedMedia.project_year}</span></div>}
              {selectedMedia.technologies && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#9ca3af' }}>Tehnologii:</span> <span style={{ color: '#93c5fd' }}>{selectedMedia.technologies}</span></div>}
              {selectedMedia.results && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#9ca3af' }}>Rezultate:</span> <span style={{ color: '#6ee7b7' }}>{selectedMedia.results}</span></div>}
            </div>
          </div>
        </div>
      )}

      {showCompletedProjects && (
        <div style={styles.lightbox} onClick={() => setShowCompletedProjects(false)}>
          <div style={{ ...styles.profileCard, maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>✅ Proiecte Finalizate</h2>
              <button style={styles.closeButton} onClick={() => setShowCompletedProjects(false)}>×</button>
            </div>
            {loadingProjects ? <p style={{ textAlign: 'center', color: '#666' }}>Se încarcă...</p> : completedProjects.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>Nu există proiecte finalizate</p> : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {completedProjects.map((project) => (
                  <div key={project.id} style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => { setShowCompletedProjects(false); navigate(`/project/${project.id}`); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>{project.title}</h3>
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>✓ Finalizat</span>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{project.description?.length > 120 ? project.description.substring(0, 120) + '...' : project.description || 'Fără descriere'}</p>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      <span>💰 <strong>{parseInt(project.budget_ron || 0).toLocaleString('ro-RO')} RON</strong></span>
                      <span>📅 {new Date(project.created_at).toLocaleDateString('ro-RO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.profileWrapper}>
        {isAdmin && (
          <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', borderBottom: '3px solid #dc2626' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem', fontWeight: '700' }}>Panel Admin - Informații Verificare</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>📧 Email & Identitate</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Email:</strong> {user?.email}</p>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Telefon:</strong> {user?.phone || 'N/A'}</p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}><strong>KYC (Stripe):</strong> <span style={{ color: trustProfile?.verified_identity ? '#059669' : '#dc2626', fontWeight: '600' }}>{trustProfile?.verified_identity ? '✅ Verificat' : '❌ Neconfirmat'}</span></p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>⭐ Trust Profile</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Level:</strong> {trustProfile?.trust_level || 1} / 5</p>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Score:</strong> {trustProfile?.trust_score || 0}</p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}><strong>Apel verificare:</strong> <span style={{ color: trustProfile?.has_verification_call ? '#059669' : '#dc2626' }}>{trustProfile?.has_verification_call ? '✅' : '❌'}</span></p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>🆔 Puncte Identitate</h4>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cunoscut direct de admin:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.is_known_directly_by_admin ? '#059669' : '#dc2626' }}>
                      {trustProfile?.is_known_directly_by_admin ? '✅ 20p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Apel verificare:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.has_verification_call ? '#059669' : '#dc2626' }}>
                      {trustProfile?.has_verification_call ? '✅ 15p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Profil complet:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.profile_completed ? '#059669' : '#dc2626' }}>
                      {trustProfile?.profile_completed ? '✅ 15p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fotografie profil:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.profile_photo_added ? '#059669' : '#dc2626' }}>
                      {trustProfile?.profile_photo_added ? '✅ 10p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Email validat:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.email_validated ? '#059669' : '#dc2626' }}>
                      {trustProfile?.email_validated ? '✅ 10p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Portofoliu aprobat:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.portfolio_approved_by_admin ? '#059669' : '#dc2626' }}>
                      {trustProfile?.portfolio_approved_by_admin ? '✅ 15p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>KYC (Stripe):</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.verified_identity ? '#059669' : '#dc2626' }}>
                      {trustProfile?.verified_identity ? '✅ 5p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contract Master (doar companii):</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.accepted_master_contract ? '#059669' : '#dc2626' }}>
                      {trustProfile?.accepted_master_contract ? '✅ 15p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recomandat de utilizator:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.referred_by ? '#059669' : '#dc2626' }}>
                      {trustProfile?.referred_by ? '✅ 10p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Colaborare directă:</span>
                    <span style={{ fontWeight: '600', color: trustProfile?.has_direct_collaboration ? '#059669' : '#dc2626' }}>
                      {trustProfile?.has_direct_collaboration ? '✅ 10p' : '❌ 0p'}
                    </span>
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb', fontWeight: '600' }}>
                    Total: {trustProfile?.type2_points || 0} puncte
                  </p>
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>🎁 Sistem Referire</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Recomandat de:</strong> {trustProfile?.recommended_by_user_id ? <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => navigate(`/profile/${trustProfile.recommended_by_user_id}`)}>Vezi profil</span> : 'Nu'}</p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}><strong>Contract Master:</strong> <span style={{ color: trustProfile?.accepted_master_contract ? '#059669' : '#dc2626' }}>{trustProfile?.accepted_master_contract ? '✅ Da' : '❌ Nu'}</span></p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>📊 Statistici</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Proiecte finalizate:</strong> {trustProfile?.total_projects_completed || 0}</p>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}><strong>Rating:</strong> {trustProfile?.average_rating || 0} / 5</p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}><strong>Cunoscut de admin:</strong> <span style={{ color: trustProfile?.is_known_directly_by_admin ? '#059669' : '#dc2626' }}>{trustProfile?.is_known_directly_by_admin ? '✅' : '❌'}</span></p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '0.9rem' }}>⚡ Acțiuni</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {user?.kyc_status !== 'verified' && <button onClick={async () => { try { const token = localStorage.getItem('token'); await axios.put(`http://localhost:5000/api/admin/users/${userId}/verify`, {}, { headers: { Authorization: `Bearer ${token}` } }); alert('Utilizator aprobat!'); window.location.reload(); } catch (e) { alert('Eroare: ' + (e.response?.data?.error || e.message)); } }} style={{ padding: '0.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✅ Aprobă KYC</button>}
                  <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📊 Dashboard</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={styles.banner}>
          <div style={styles.bannerPattern}></div>
        </div>

        <div style={styles.profileCard}>
          <div style={styles.profileHeader}>
            <div style={styles.photoContainer}>
              {user.profile_image_url ? <img src={user.profile_image_url} alt={user.name} style={styles.profilePhoto} /> : <div style={{ ...styles.photoPlaceholder, borderColor: user.role === 'expert' ? '#3b82f6' : '#10b981' }}>{user.role === 'expert' ? '👨‍💻' : '🏢'}</div>}
              {isVerified && <div style={styles.verifiedBadge} title="Profil Verificat">✓</div>}
            </div>
            <div style={styles.basicInfo}>
              <div style={styles.nameRow}>
                <h1 style={styles.name}>{firstName}</h1>
                {isVerified && <span style={styles.verifiedTag}>Verificat</span>}
              </div>
              {trustLevel && <div style={getTrustBadgeStyle(trustLevel)}>{getTrustLabel(trustLevel)}</div>}
              <p style={styles.role}>{user.role === 'expert' ? '🔧 Expert' : '🏢 Client / Companie'}</p>
              {user.company && isAdmin && <p style={styles.company}>🏢 {user.company}</p>}
              {memberSince && <p style={styles.memberSince}>Membru din {memberSince}</p>}
            </div>
          </div>

          <div style={styles.statsBar}>
            <div style={{ ...styles.statItem, cursor: 'pointer' }} onClick={() => fetchCompletedProjects()}>
              <span style={{ ...styles.statNumber, color: '#2563eb' }}>{user.completed_projects || 0}</span>
              <span style={{ ...styles.statLabel, color: '#2563eb', textDecoration: 'underline' }}>Proiecte Finalizate</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{user.reviews_count || 0}</span>
              <span style={styles.statLabel}>Recenzii</span>
            </div>
          </div>

          <div style={styles.pointsSection}>
            <h3 style={styles.pointsTitle}>🏆 Sistem de Puncte</h3>
            <div style={styles.pointsGrid}>
              <div style={{ ...styles.pointCard, borderLeft: '4px solid #f59e0b' }}>
                <div style={styles.pointIcon}>⭐</div>
                <div style={styles.pointInfo}><span style={styles.pointValue}>{Math.round(trustProfile?.trust_score || 0)}</span><span style={styles.pointLabel}>Incredere</span></div>
              </div>
              <div style={{ ...styles.pointCard, borderLeft: '4px solid #3b82f6' }}>
                <div style={styles.pointIcon}>🆔</div>
                <div style={styles.pointInfo}><span style={styles.pointValue}>{trustProfile?.type2_points || 0}</span><span style={styles.pointLabel}>Identitate</span></div>
              </div>
              <div style={{ ...styles.pointCard, borderLeft: '4px solid #10b981' }}>
                <div style={styles.pointIcon}>🎁</div>
                <div style={styles.pointInfo}><span style={styles.pointValue}>{trustProfile?.type1_points || 0}</span><span style={styles.pointLabel}>Recompensa</span></div>
              </div>
            </div>
          </div>

          {totalReviews > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1f2937' }}>⭐ Recenzii ({totalReviews}) {averageRating > 0 && <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>{averageRating} / 5</span>}</h3>
              <div style={{ display: 'grid', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>{[1,2,3,4,5].map((star) => <span key={star} style={{ color: star <= review.rating ? '#f59e0b' : '#d1d5db' }}>★</span>)}<span style={{ fontSize: '0.85rem', color: '#6b7280' }}>de la {review.reviewer_name || 'Utilizator'}</span></div>
                    {review.review_text && <p style={{ margin: 0, fontSize: '0.95rem', color: '#374151' }}>{review.review_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.mainContent}>
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>📋 Informații</h2>
              <div style={styles.infoGrid}>
                {user.industry && <div style={styles.infoItem}><label style={styles.label}>Industrie</label><p style={styles.value}>{user.industry}</p></div>}
                {user.expertise && <div style={styles.infoItem}><label style={styles.label}>{user.role === 'expert' ? 'Expertiză' : 'Domeniu'}</label><p style={styles.value}>{user.expertise}</p></div>}
                {user.experience && <div style={styles.infoItem}><label style={styles.label}>Experiență</label><p style={styles.value}>{user.experience} ani</p></div>}
              </div>
            </section>
            {user.bio && <section style={styles.section}><h2 style={styles.sectionTitle}>✍️ Despre</h2><p style={styles.bioText}>{user.bio}</p></section>}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>🎨 Portfolio ({portfolio.length})</h2>
              {portfolio.length === 0 ? <div style={styles.portfolioPlaceholder}><span style={styles.portfolioIcon}>📁</span><p>Nu există proiecte în portfolio</p></div> : (
                <div style={{ ...styles.portfolioGrid, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {portfolio.map((item) => (
                    <div key={item.id} style={{ ...styles.portfolioItem, border: item.is_featured ? '2px solid #f59e0b' : styles.portfolioItem.border }} onClick={() => setSelectedMedia(item)}>
                      {item.is_featured && <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '600', zIndex: 2 }}>⭐ FEATURED</div>}
                      {item.file_type === 'video' ? <div style={styles.videoWrapper}><video src={item.file_url} style={styles.portfolioThumbnail} muted playsInline /><div style={styles.playIcon}>▶</div></div> : <img src={item.file_url} alt={item.title} style={styles.portfolioThumbnail} />}
                      <div style={{ ...styles.portfolioOverlay, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                        <h4 style={{ ...styles.portfolioTitle, marginBottom: item.category ? '0.25rem' : '0' }}>{item.title}</h4>
                        {item.category && <span style={{ fontSize: '0.65rem', color: '#93c5fd', marginRight: '0.5rem' }}>{item.category}</span>}
                        {item.client_name && <span style={{ fontSize: '0.65rem', color: '#a7f3d0' }}>👤 {item.client_name} {item.project_year && `(${item.project_year})`}</span>}
                      </div>
                      {(item.technologies || item.results) && (
                        <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                          {item.technologies && <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.7rem', color: '#3b82f6', fontWeight: '500' }}>🔧 {item.technologies}</p>}
                          {item.results && <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981' }}>📈 {item.results}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div style={styles.privacyNotice}><span>🔒</span><p>Datele de contact sunt vizibile doar utilizatorilor autentificați care au un proiect activ cu acest profil.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '1.5rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { maxWidth: '800px', margin: '0 auto 1.5rem auto' },
  backButtonTop: { padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#4b5563', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' },
  loadingCard: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '4rem 2rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' },
  errorCard: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '4rem 2rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' },
  errorIcon: { fontSize: '3rem', marginBottom: '1rem' },
  errorText: { color: '#6b7280', fontSize: '1.1rem', marginBottom: '1.5rem' },
  backButton: { padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' },
  profileWrapper: { maxWidth: '800px', margin: '0 auto' },
  banner: { height: '120px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '16px 16px 0 0', position: 'relative', overflow: 'hidden' },
  bannerPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' },
  profileCard: { backgroundColor: 'white', borderRadius: '0 0 16px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: '-60px', position: 'relative', zIndex: 1 },
  profileHeader: { display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'flex-end' },
  photoContainer: { position: 'relative', flexShrink: 0 },
  profilePhoto: { width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  photoPlaceholder: { width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  verifiedBadge: { position: 'absolute', bottom: '5px', right: '5px', width: '28px', height: '28px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold', border: '3px solid white' },
  basicInfo: { flex: 1, paddingBottom: '0.5rem' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  name: { margin: 0, color: '#1f2937', fontSize: '1.75rem', fontWeight: '700' },
  verifiedTag: { backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' },
  trustBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', marginTop: '8px' },
  trustBadgeLevel5: { backgroundColor: '#dcfce7', color: '#166534' },
  trustBadgeLevel4: { backgroundColor: '#dbeafe', color: '#1e40af' },
  trustBadgeLevel3: { backgroundColor: '#fef3c7', color: '#92400e' },
  trustBadgeLevel2: { backgroundColor: '#fed7aa', color: '#9a3412' },
  trustBadgeLevel1: { backgroundColor: '#fee2e2', color: '#991b1b' },
  role: { margin: '0.5rem 0', color: '#6b7280', fontSize: '1rem' },
  company: { margin: '0.25rem 0', color: '#374151', fontSize: '1rem', fontWeight: '500' },
  memberSince: { margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '0.85rem' },
  statsBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '1.5rem 2rem', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  statNumber: { fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' },
  statLabel: { fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statDivider: { width: '1px', height: '40px', backgroundColor: '#e5e7eb' },
  pointsSection: { padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb' },
  pointsTitle: { margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1rem', fontWeight: '600' },
  pointsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' },
  pointCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' },
  pointIcon: { fontSize: '1.5rem' },
  pointInfo: { display: 'flex', flexDirection: 'column' },
  pointValue: { fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' },
  pointLabel: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
  mainContent: { padding: '2rem' },
  section: { marginBottom: '2rem' },
  sectionTitle: { margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label: { fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  value: { fontSize: '1rem', color: '#374151', fontWeight: '500', margin: 0 },
  bioText: { fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.7', margin: 0 },
  portfolioPlaceholder: { backgroundColor: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center' },
  portfolioIcon: { fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' },
  portfolioGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  portfolioItem: { borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f3f4f6', cursor: 'pointer', position: 'relative', aspectRatio: '4/3' },
  portfolioThumbnail: { width: '100%', height: '100%', objectFit: 'cover' },
  videoWrapper: { position: 'relative', width: '100%', height: '100%' },
  playIcon: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' },
  portfolioOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: 'white' },
  portfolioTitle: { margin: 0, fontSize: '0.85rem', fontWeight: '500' },
  privacyNotice: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' },
  lightbox: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' },
  closeButton: { position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lightboxMedia: { maxWidth: '90%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' },
  lightboxCaption: { color: 'white', textAlign: 'center', marginTop: '1rem', maxWidth: '600px' }
};
