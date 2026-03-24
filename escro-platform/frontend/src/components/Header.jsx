import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Header({ currentPage = 'dashboard' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [trustProfile, setTrustProfile] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const dropdownRef = useRef(null);

  // Get stored role for initial render
  const storedRole = localStorage.getItem('userRole');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const kyc_status = response.data.user?.kyc_status || 'pending';
        setVerificationStatus(kyc_status);
        
        // Fetch trust profile for all authenticated users
        try {
          const trustResponse = await axios.get('/api/trust-profiles/my-trust-profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('[DEBUG Header] Trust profile loaded:', trustResponse.data);
          setTrustProfile(trustResponse.data);
        } catch (e) {
          console.log('[DEBUG Header] No trust profile yet:', e.message);
        }
        
        // Get referral code from user data
        if (response.data.user?.referral_code) {
          setReferralCode(response.data.user.referral_code);
        }
        
        // Fetch referral stats
        try {
          const referralResponse = await axios.get('/api/referrals/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setReferralStats(referralResponse.data);
        } catch (e) {
          console.log('No referral stats');
        }
      } catch (err) {
        console.error('Error checking verification:', err);
      }
    };

    checkVerification();
  }, [user]);

  const styles = {
    header: {
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '0.875rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '2rem'
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    logoIcon: {
      fontSize: '1.5rem'
    },
    navTabs: {
      display: 'flex',
      gap: '0.125rem'
    },
    navTab: {
      padding: '0.4rem 0.75rem',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '500',
      color: '#6b7280',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      whiteSpace: 'nowrap'
    },
    navTabActive: {
      backgroundColor: '#eff6ff',
      color: '#2563eb'
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      position: 'relative'
    },
    createButton: {
      padding: '0.5rem 1rem',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    profileButton: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: '2px solid #e5e7eb',
      backgroundColor: '#f3f4f6',
      cursor: 'pointer',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      overflow: 'hidden'
    },
    dropdown: {
      position: 'absolute',
      top: '52px',
      right: '0',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      minWidth: '260px',
      zIndex: 200,
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      animation: 'slideUp 0.2s ease'
    },
    userInfo: {
      padding: '1rem',
      borderBottom: '1px solid #f3f4f6',
      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
    },
    userName: {
      fontWeight: '600',
      color: '#111827',
      fontSize: '0.9375rem'
    },
    userEmail: {
      fontSize: '0.8125rem',
      color: '#9ca3af'
    },
    dropdownItem: {
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: '#374151',
      border: 'none',
      background: 'none',
      width: '100%',
      textAlign: 'left'
    },
    dropdownItemHover: {
      backgroundColor: '#f9fafb'
    },
    dropdownItemDanger: {
      color: '#dc2626'
    },
    trustBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginTop: '8px'
    },
    trustBadgeLevel5: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    trustBadgeLevel4: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    trustBadgeLevel3: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    trustBadgeLevel2: {
      backgroundColor: '#fed7aa',
      color: '#9a3412'
    },
    trustBadgeLevel1: {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    },
    referralCode: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '6px',
      padding: '4px 8px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      fontFamily: 'monospace'
    },
    referralSection: {
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#f0f9ff',
      borderRadius: '8px',
      border: '1px solid #bae6fd'
    },
    referralTitle: {
      fontSize: '0.7rem',
      fontWeight: '600',
      color: '#0369a1',
      marginBottom: '6px'
    },
    referralCodeLarge: {
      fontSize: '0.9rem',
      fontWeight: '700',
      color: '#0284c7',
      fontFamily: 'monospace',
      backgroundColor: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
      marginBottom: '6px'
    },
    referralStats: {
      display: 'flex',
      gap: '10px',
      marginTop: '6px'
    },
    referralStat: {
      textAlign: 'center',
      flex: 1
    },
    referralStatNumber: {
      fontSize: '0.9rem',
      fontWeight: '700',
      color: '#0369a1'
    },
    referralStatLabel: {
      fontSize: '0.6rem',
      color: '#64748b'
    },
    copyButton: {
      marginTop: '6px',
      padding: '4px 10px',
      fontSize: '0.7rem',
      backgroundColor: '#0284c7',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      width: '100%'
    }
  };

  const getNavTabStyle = (isActive) => ({
    ...styles.navTab,
    ...(isActive ? styles.navTabActive : {})
  });

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

  const isExpertsActive = location.pathname === '/directory' && searchParams.get('tab') === 'experts';
  const isCompaniesActive = location.pathname === '/directory' && searchParams.get('tab') === 'companies';
  const isDashboardActive = location.pathname.includes('/dashboard');
  const isProjectsActive = location.pathname.includes('/dashboard') && (searchParams.get('tab') === 'projects' || !searchParams.get('tab'));
  const isMyProjectsActive = location.pathname.includes('/dashboard') && searchParams.get('tab') === 'myprojects';
  const isPostTaskActive = location.pathname.includes('/dashboard') && searchParams.get('tab') === 'post-task';
  const isPendingActive = location.pathname.includes('/dashboard') && searchParams.get('tab') === 'pending-approval';

  const currentRole = user?.role || storedRole;
  
  return (
    <div style={styles.header}>
      <div style={styles.leftSection}>
        <Link to={currentRole === 'expert' ? '/expert/dashboard' : '/company/dashboard'} style={styles.logo}>
          <span style={styles.logoIcon}>🔒</span>
          ESCRO
        </Link>
        
        <div style={styles.navTabs}>
          <button
            onClick={() => navigate(currentRole === 'expert' ? '/expert/dashboard?tab=projects' : '/company/dashboard?tab=projects')}
            style={getNavTabStyle(isProjectsActive)}
          >
            📋 Toate Proiectele
          </button>
          
          <button
            onClick={() => navigate(currentRole === 'expert' ? '/expert/dashboard?tab=myprojects' : '/company/dashboard?tab=myprojects')}
            style={getNavTabStyle(isMyProjectsActive)}
          >
            📁 Proiectele Mele
          </button>

          <button
            onClick={() => navigate('/directory?tab=experts')}
            style={getNavTabStyle(location.pathname === '/directory')}
          >
            🤝 Prestatori
          </button>

          {currentRole === 'admin' && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={getNavTabStyle(location.pathname.includes('/admin'))}
            >
              ⚙️ Admin
            </button>
          )}
        </div>
      </div>

      <div style={styles.rightSection}>
        {user && verificationStatus === 'verified' && (currentRole === 'company' || currentRole === 'expert') && (
          <button
            onClick={() => navigate('/create-project')}
            style={styles.createButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }}
          >
            ➕ Creare Task
          </button>
        )}
        
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            style={styles.profileButton}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            {user?.profile_image_url ? (
              <img 
                src={user.profile_image_url} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              '👤'
            )}
          </button>

          {dropdownOpen && (
            <div style={styles.dropdown}>
              <div style={styles.userInfo}>
                <div style={styles.userName}>
                  {user?.name || user?.company || 'User'}
                </div>
                <div style={styles.userEmail}>{user?.email}</div>
                
                {/* DEBUG: Show loading state */}
                <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '4px' }}>
                  Debug: user={user ? 'yes' : 'no'} | trustProfile={trustProfile ? 'yes' : 'no'} | level={trustProfile?.trust_level || 'none'}
                </div>
                
                {/* Trust Level Badge - Show for all authenticated users */}
                {user && (
                  <div style={getTrustBadgeStyle(trustProfile?.trust_level || 1)}>
                    {getTrustLabel(trustProfile?.trust_level || 1)}
                  </div>
                )}
                
                {/* Points Display - Show when trustProfile is loaded */}
                {trustProfile ? (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>🏆 Punctele Mele</div>
                      <a 
                        href="/referral" 
                        style={{ fontSize: '0.65rem', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        vezi detalii →
                      </a>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f59e0b' }}>⭐</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>{Math.round(trustProfile.trust_score || 0)}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Incredere</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6' }}>🆔</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>{trustProfile.type2_points || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Identitate</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>🎁</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>{trustProfile.type1_points || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Recompensa</div>
                      </div>
                    </div>
                  </div>
                ) : user && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>🏆 Punctele Mele</div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f59e0b' }}>⭐</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>0</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Incredere</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6' }}>🆔</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>0</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Identitate</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>🎁</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>0</div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Recompensa</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Referral Code */}
                {referralCode && (user?.role === 'expert' || user?.role === 'company') && (
                  <div style={styles.referralSection}>
                    <div style={styles.referralTitle}>🎁 INVITĂ PRIETENII ȘI CREȘTE-ȚI TRUST LEVEL!</div>
                    <div style={styles.referralCodeLarge}>{referralCode}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '6px' }}>
                      Cine se înregistrează cu codul tău primește +15 puncte Trust!
                    </div>
                    {referralStats && (
                      <div style={styles.referralStats}>
                        <div style={styles.referralStat}>
                          <div style={styles.referralStatNumber}>{referralStats.total || 0}</div>
                          <div style={styles.referralStatLabel}>Invitați</div>
                        </div>
                        <div style={styles.referralStat}>
                          <div style={styles.referralStatNumber}>{referralStats.completed || 0}</div>
                          <div style={styles.referralStatLabel}>Completate</div>
                        </div>
                        <div style={styles.referralStat}>
                          <div style={styles.referralStatNumber}>+{referralStats.totalTrustEarned || 0}</div>
                          <div style={styles.referralStatLabel}>Puncte</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/profile-edit');
                }}
                style={styles.dropdownItem}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                ⚙️ Profilul Meu (cu Portfolio)
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  if (location.pathname === '/directory') {
                    if (user?.role === 'expert') {
                      navigate('/expert/dashboard?tab=myprojects');
                    } else if (user?.role === 'company') {
                      navigate('/company/dashboard?tab=myprojects');
                    } else {
                      navigate('/admin/dashboard?tab=profile');
                    }
                  } else {
                    setSearchParams({ tab: 'myprojects' });
                  }
                }}
                style={styles.dropdownItem}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                📁 Proiectele Mele
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/referral');
                }}
                style={styles.dropdownItem}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                🎁 Invită Prieteni
              </button>

              <div style={{ borderTop: '1px solid #f3f4f6', margin: '0.25rem 0' }}></div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                style={{ ...styles.dropdownItem, ...styles.dropdownItemDanger }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
