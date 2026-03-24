import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function Directory() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trustProfiles, setTrustProfiles] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'experts') {
      setActiveTab('experts');
    } else if (tab === 'companies') {
      setActiveTab('companies');
    }
    loadDirectory();
  }, [location.search]);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.get('/api/users', { headers });
      
      const allUsers = response.data.users || [];
      
      console.log('API Response:', response.data);
      console.log('First user data:', allUsers[0]);
      
      const companiesList = allUsers.filter(u => u.role === 'company');
      const expertsList = allUsers.filter(u => u.role === 'expert');
      
      console.log('Companies:', companiesList);
      console.log('Experts:', expertsList);
      
      // Fetch trust profiles for all users
      const profiles = {};
      try {
        const trustResponse = await axios.get('/api/trust-profiles/all', { headers });
        if (trustResponse.data.profiles) {
          trustResponse.data.profiles.forEach(p => {
            profiles[p.user_id] = p;
          });
        }
      } catch (e) {
        console.log('No trust profiles available');
      }
      
      setTrustProfiles(profiles);
      setCompanies(companiesList);
      setExperts(expertsList);
      setError('');
    } catch (err) {
      console.error('Error loading directory:', err);
      setError('Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const getFirstName = (fullName) => {
    if (!fullName) return 'Unknown';
    return fullName.split(' ')[0];
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  const styles = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    container: {
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '2rem',
    },
    pageTitle: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.5rem 0',
    },
    pageSubtitle: {
      fontSize: '1rem',
      color: '#64748b',
      margin: 0,
    },
    tabNav: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      backgroundColor: 'white',
      padding: '0.5rem',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    tabButton: {
      padding: '0.875rem 1.75rem',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    tabButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
    tabButtonInactive: {
      backgroundColor: 'transparent',
      color: '#64748b',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '1.75rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      textAlign: 'center',
      cursor: 'pointer',
      border: '1px solid #e2e8f0',
    },
    cardHover: {
      transform: 'translateY(-6px)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
      borderColor: '#3b82f6',
    },
    avatarContainer: {
      position: 'relative',
      width: '100px',
      height: '100px',
      margin: '0 auto 1.25rem auto',
    },
    profileImage: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '3px solid #3b82f6',
      display: 'block',
    },
    defaultAvatar: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      border: '3px solid #3b82f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2.5rem',
      backgroundColor: '#eff6ff',
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '24px',
      height: '24px',
      backgroundColor: '#22c55e',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      border: '2px solid white',
    },
    name: {
      fontSize: '1.25rem',
      fontWeight: '700',
      margin: '0 0 0.25rem 0',
      color: '#1e293b'
    },
    company: {
      fontSize: '0.95rem',
      color: '#64748b',
      marginBottom: '1rem',
    },
    statsRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '1rem 0',
      borderTop: '1px solid #e2e8f0',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '1rem',
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem',
    },
    statNumber: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#3b82f6',
    },
    statLabel: {
      fontSize: '0.75rem',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    infoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      fontSize: '0.9rem',
    },
    infoLabel: {
      color: '#94a3b8',
      fontWeight: '500',
    },
    infoValue: {
      color: '#475569',
      fontWeight: '600',
    },
    viewButton: {
      marginTop: '1rem',
      padding: '0.75rem 1.5rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.9rem',
      width: '100%',
      transition: 'all 0.2s ease',
    },
    emptyState: {
      textAlign: 'center',
      padding: '4rem 2rem',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    },
    emptyIcon: {
      fontSize: '4rem',
      marginBottom: '1rem',
    },
    emptyTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 0.5rem 0',
    },
    emptyText: {
      color: '#64748b',
      margin: 0,
    },
    errorAlert: {
      padding: '1rem 1.25rem',
      backgroundColor: '#fee2e2',
      borderLeft: '4px solid #ef4444',
      marginBottom: '1.5rem',
      borderRadius: '8px',
      color: '#dc2626',
      fontWeight: '500',
    },
    trustBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: '600',
      marginTop: '8px'
    },
  };

  const getTrustBadgeStyle = (level) => {
    switch (level) {
      case 5: return { ...styles.trustBadge, backgroundColor: '#dcfce7', color: '#166534' };
      case 4: return { ...styles.trustBadge, backgroundColor: '#dbeafe', color: '#1e40af' };
      case 3: return { ...styles.trustBadge, backgroundColor: '#fef3c7', color: '#92400e' };
      case 2: return { ...styles.trustBadge, backgroundColor: '#fed7aa', color: '#9a3412' };
      default: return { ...styles.trustBadge, backgroundColor: '#fee2e2', color: '#991b1b' };
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

  const [hoveredCard, setHoveredCard] = useState(null);

  const renderCard = (item, type) => {
    const isVerified = item.kyc_status === 'verified';
    const isHovered = hoveredCard === item.id;
    const trustProfile = trustProfiles[item.id];
    const trustLevel = trustProfile?.trust_level;
    
    return (
      <div
        key={item.id}
        style={{
          ...styles.card,
          ...(isHovered ? styles.cardHover : {}),
        }}
        onMouseEnter={() => setHoveredCard(item.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => navigate(`/profile/${item.id}`)}
      >
        <div style={styles.avatarContainer}>
          {item.profile_image_url ? (
            <img
              src={item.profile_image_url}
              alt={item.name}
              style={styles.profileImage}
            />
          ) : (
            <div style={styles.defaultAvatar}>
              {type === 'expert' ? '👨‍💼' : '🏢'}
            </div>
          )}
          {isVerified && (
            <div style={styles.verifiedBadge} title="Verificat">✓</div>
          )}
        </div>
        
        <h3 style={styles.name}>{getFirstName(item.name)}</h3>
        <p style={styles.company}>{item.role === 'expert' ? 'Expert' : 'Companie'}</p>
        
        {/* Trust Level Badge */}
        {trustLevel && (
          <div style={getTrustBadgeStyle(trustLevel)}>
            {getTrustLabel(trustLevel)}
          </div>
        )}
        
        {/* Points Display */}
        {trustProfile && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '0.35rem 0.5rem', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d' }}>
              <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>⭐</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#111827', marginLeft: '2px' }}>{Math.round(trustProfile.trust_score || 0)}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '0.35rem 0.5rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #93c5fd' }}>
              <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>🆔</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#111827', marginLeft: '2px' }}>{trustProfile.type2_points || 0}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '0.35rem 0.5rem', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #6ee7b7' }}>
              <span style={{ fontSize: '0.7rem', color: '#10b981' }}>🎁</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#111827', marginLeft: '2px' }}>{trustProfile.type1_points || 0}</span>
            </div>
          </div>
        )}
        
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{item.completed_projects || 0}</span>
            <span style={styles.statLabel}>Proiecte Finalizate</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{item.reviews_count || 0}</span>
            <span style={styles.statLabel}>Recenzii</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Industrie</span>
            <span style={styles.infoValue}>{item.industry || '—'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>{type === 'expert' ? 'Expertiză' : 'Domeniu'}</span>
            <span style={styles.infoValue}>{item.expertise || '—'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Experiență</span>
            <span style={styles.infoValue}>{item.experience ? `${item.experience} ani` : '—'}</span>
          </div>
        </div>
        
        <button style={styles.viewButton}>
          Vezi Profil →
        </button>
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <Header currentPage="directory" />
      
      <div style={styles.container}>
        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}

        <div style={styles.tabNav}>
          <button 
            onClick={() => handleTabChange('companies')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'companies' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
          >
            🏢 Companii ({companies.length})
          </button>
          <button 
            onClick={() => handleTabChange('experts')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'experts' ? styles.tabButtonActive : styles.tabButtonInactive)
            }}
          >
            👨‍💼 Experți ({experts.length})
          </button>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⏳</div>
            <p style={{ color: '#64748b' }}>Se încarcă...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'companies' && (
              <div>
                {companies.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🏢</div>
                    <h3 style={styles.emptyTitle}>Nu sunt companii</h3>
                    <p style={styles.emptyText}>Nu există companii înregistrate în platformă în acest moment</p>
                  </div>
                ) : (
                  <div style={styles.gridContainer}>
                    {companies.map(company => renderCard(company, 'company'))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'experts' && (
              <div>
                {experts.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>👨‍💼</div>
                    <h3 style={styles.emptyTitle}>Nu sunt experți</h3>
                    <p style={styles.emptyText}>Nu există experți înregistrați în platformă în acest moment</p>
                  </div>
                ) : (
                  <div style={styles.gridContainer}>
                    {experts.map(expert => renderCard(expert, 'expert'))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
