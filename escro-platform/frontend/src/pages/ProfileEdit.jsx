import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const IDENTITY_POINTS_CONFIG = {
  profile_completed: { points: 15, label: 'Profil complet', icon: '✓', description: 'Nume, email, telefon, biografie, profesie, industrie, expertiză, experiență' },
  profile_photo: { points: 10, label: 'Fotografie de profil', icon: '📷', description: 'Încarcă o fotografie de profil' },
  portfolio_approved: { points: 15, label: 'Portofoliu', icon: '🎨', description: 'Min. 3 imagini în portofoliu' },
  email_validated: { points: 10, label: 'Email validat', icon: '📧', description: 'Email confirmat în sistem' },
  kyc_verified: { points: 5, label: 'Verificare identitate (KYC)', icon: '🪪', description: 'Verificare identitate cu document' },
  payment_method: { points: 10, label: 'Metodă de plată', icon: '💳', description: 'Adaugă o metodă de plată' },
  verification_call: { points: 15, label: 'Apel de verificare', icon: '📞', description: 'Apel video de verificare' }
};

export default function ProfileEdit() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    expertise: '',
    bio: '',
    industry: '',
    experience: '',
    portfolio_description: ''
  });
  
  const [portfolio, setPortfolio] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', client_name: '', project_year: '', results: '', technologies: '', category: '', is_featured: false });

  useEffect(() => {
    fetchProfile();
    fetchPortfolio();
    fetchNotifications();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data.user);
      setTrustProfile(response.data.trustProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get('/api/users/portfolio', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPortfolio(response.data.portfolio || []);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await axios.put('/api/users/profile', profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.pointsAwarded && response.data.pointsAwarded.length > 0) {
        const pointsText = response.data.pointsAwarded
          .map(p => `+${p.points} puncte pentru ${p.description}`)
          .join(', ');
        setMessage({ type: 'success', text: `Profil actualizat! ${pointsText}` });
        fetchNotifications();
      } else {
        setMessage({ type: 'success', text: 'Profil actualizat cu succes!' });
      }
      setProfile(response.data.user);
      fetchProfile();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePortfolio = async (itemId) => {
    if (!confirm('Ești sigur că vrei să ștergi acest element?')) return;
    
    try {
      await axios.delete(`/api/users/portfolio/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPortfolio();
      setMessage({ type: 'success', text: 'Element șters!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete item' });
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      client_name: item.client_name || '',
      project_year: item.project_year || '',
      results: item.results || '',
      technologies: item.technologies || '',
      category: item.category || '',
      is_featured: item.is_featured || false
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/portfolio/${editingItem.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingItem(null);
      fetchPortfolio();
      setMessage({ type: 'success', text: 'Portfolio actualizat!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update portfolio item' });
    }
  };

  const handleUploadWithDetails = async (file, details) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', details.title || file.name.split('.')[0]);
    formData.append('description', details.description || '');
    formData.append('client_name', details.client_name || '');
    formData.append('project_year', details.project_year || '');
    formData.append('results', details.results || '');
    formData.append('technologies', details.technologies || '');
    formData.append('category', details.category || '');
    formData.append('is_featured', details.is_featured || false);
    
    await axios.post('/api/users/portfolio', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
  };

  const categoryOptions = [
    'Web Development', 'Mobile Apps', 'UI/UX Design', 'E-commerce', 'Marketing', 
    'SEO', 'Content', 'Video', 'Photography', 'Consulting', 'Other'
  ];

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '2rem 1rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '2rem'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #f0f0f0'
    },
    backButton: {
      padding: '0.5rem 1rem',
      backgroundColor: 'transparent',
      color: '#1e40af',
      border: '1px solid #1e40af',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    success: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem'
    },
    error: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem'
    },
    section: {
      marginBottom: '3rem'
    },
    sectionTitle: {
      margin: '0 0 1.5rem 0',
      color: '#333',
      fontSize: '1.3rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '1rem'
    },
    label: {
      fontSize: '0.9rem',
      color: '#666',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    input: {
      padding: '0.75rem',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '1rem',
      width: '100%',
      boxSizing: 'border-box'
    },
    saveButton: {
      padding: '0.75rem 2rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '1rem',
      marginTop: '1rem'
    },
    helpText: {
      color: '#666',
      marginBottom: '1rem',
      fontSize: '0.95rem'
    }
  };

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  const IdentityPointsItem = ({ config, completed, onClick }) => (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.75rem',
        backgroundColor: completed ? '#dcfce7' : '#f3f4f6',
        borderRadius: '8px',
        border: `1px solid ${completed ? '#86efac' : '#e5e7eb'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
    >
      <span style={{fontSize: '1rem', marginTop: '2px'}}>{completed ? '✓' : '○'}</span>
      <div style={{flex: 1}}>
        <div style={{
          fontSize: '0.85rem',
          color: completed ? '#166534' : '#4b5563',
          fontWeight: completed ? '600' : '500'
        }}>{config.label}</div>
        <div style={{
          fontSize: '0.75rem',
          color: completed ? '#22c55e' : '#9ca3af'
        }}>{completed ? 'Completat' : config.description}</div>
      </div>
      <span style={{
        fontSize: '0.85rem',
        color: completed ? '#166534' : '#9ca3af',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      }}>{completed ? `+${config.points}` : `${config.points}`}</span>
    </div>
  );

  if (loading) {
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1>Edit Profile</h1>
          <button onClick={() => navigate(-1)} style={styles.backButton}>← Back</button>
        </div>

        {message.text && (
          <div style={message.type === 'success' ? styles.success : styles.error}>
            {message.text}
          </div>
        )}

        {trustProfile && (
          <div style={{marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h3 style={{margin: 0, color: '#0369a1', fontSize: '1.1rem'}}>🪪 Puncte de Identitate</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1'}}>{trustProfile.type2_points || 0}</span>
                <span style={{color: '#64748b', fontSize: '0.9rem'}}>puncte</span>
              </div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem'}}>
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.profile_photo}
                completed={!!profile.profile_image_url}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.profile_completed}
                completed={trustProfile.profile_completed}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.email_validated}
                completed={trustProfile.email_validated}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.portfolio_approved}
                completed={portfolio.length >= 3}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.kyc_verified}
                completed={trustProfile.kyc_verified}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.payment_method}
                completed={trustProfile.payment_method_added}
              />
              <IdentityPointsItem 
                config={IDENTITY_POINTS_CONFIG.verification_call}
                completed={trustProfile.has_verification_call}
              />
            </div>
            
            <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #bae6fd'}}>
              <p style={{margin: 0, fontSize: '0.85rem', color: '#64748b'}}>
                <strong>{Object.entries(IDENTITY_POINTS_CONFIG).filter(([key, _]) => {
                  if (key === 'profile_photo') return !!profile.profile_image_url;
                  if (key === 'portfolio_approved') return portfolio.length >= 3;
                  return trustProfile[key];
                }).length}</strong> din <strong>{Object.keys(IDENTITY_POINTS_CONFIG).length}</strong> completate. 
                Completează toate secțiunile pentru a primi toate punctele!
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={styles.section}>
          <h2 style={styles.sectionTitle}>👤 Poza de Profil</h2>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px'}}>
            <div 
              onClick={() => avatarInputRef.current?.click()}
              style={{width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #3b82f6', flexShrink: 0, cursor: 'pointer', position: 'relative'}}
            >
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb', fontSize: '3rem'}}>👤</div>
              )}
              <div style={{position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', borderRadius: '50%', padding: '8px', fontSize: '14px'}}>📷</div>
            </div>
            <div style={{flex: 1}}>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      const formData = new FormData();
                      formData.append('profile_image', file);
                      await axios.post('/api/users/profile-image', formData, {
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                      });
                      setMessage({ type: 'success', text: 'Poza de profil actualizată!' });
                      fetchProfile();
                    } catch (err) {
                      setMessage({ type: 'error', text: 'Failed to upload avatar' });
                    }
                  }
                }}
                accept="image/*"
                style={{display: 'none'}}
              />
              <p style={{color: '#6b7280', fontSize: '0.9rem'}}>Click pe poză pentru a schimba fotografia</p>
            </div>
          </div>
          
          <h2 style={styles.sectionTitle}>👤 Informații Personale</h2>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                name="name"
                value={profile.name || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={profile.email || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              <input
                type="text"
                name="company"
                value={profile.company || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Industry</label>
              <input
                type="text"
                name="industry"
                value={profile.industry || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Expertise</label>
              <input
                type="text"
                name="expertise"
                value={profile.expertise || ''}
                onChange={handleProfileChange}
                style={styles.input}
              />
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Experience</label>
            <input
              type="text"
              name="experience"
              value={profile.experience || ''}
              onChange={handleProfileChange}
              style={styles.input}
              placeholder="e.g. 5 years"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Biography</label>
            <textarea
              name="bio"
              value={profile.bio || ''}
              onChange={handleProfileChange}
              style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              placeholder="Tell us about yourself..."
            />
          </div>

          <button type="submit" disabled={saving} style={styles.saveButton}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🎨 Portofoliu ({portfolio.length})</h2>
          <p style={styles.helpText}>
            Încarcă poze și videouri pentru a-ți展示作品. Utilizatorii le vor vedea pe profilul tău public.
          </p>
          
          <div 
            onClick={() => portfolioInputRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f9fafb',
              transition: 'all 0.2s ease',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}
          >
            {uploading ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <span style={{fontSize: '1.25rem'}}>⏳</span>
                <p style={{color: '#6b7280', margin: 0, fontSize: '0.9rem'}}>Se încarcă...</p>
              </div>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <span style={{fontSize: '1.5rem'}}>📁</span>
                <div style={{textAlign: 'left'}}>
                  <p style={{color: '#374151', fontWeight: '500', margin: 0, fontSize: '0.9rem'}}>Click pentru a adăuga</p>
                  <p style={{color: '#9ca3af', fontSize: '0.75rem', margin: 0}}>JPG, PNG, GIF, MP4, WebM</p>
                </div>
              </div>
            )}
          </div>
          
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              
              const title = prompt('Titlul proiectului:', file.name.split('.')[0]);
              if (!title) return;
              
              const client_name = prompt('Numele clientului (opțional):', '');
              const project_year = prompt('Anul proiectului (ex: 2024):', new Date().getFullYear().toString());
              const category = prompt('Categoria (' + categoryOptions.join(', ') + '):', '');
              const results = prompt('Rezultate/Realizări (opțional):', '');
              const technologies = prompt('Tehnologii folosite (opțional):', '');
              
              setUploading(true);
              try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('title', title);
                formData.append('description', '');
                formData.append('client_name', client_name || '');
                formData.append('project_year', project_year || '');
                formData.append('category', category || '');
                formData.append('results', results || '');
                formData.append('technologies', technologies || '');
                
                await axios.post('/api/users/portfolio', formData, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                });
                setMessage({ type: 'success', text: 'Fișier încărcat în portofoliu!' });
                fetchPortfolio();
              } catch (err) {
                setMessage({ type: 'error', text: 'Failed to upload' });
              } finally {
                setUploading(false);
              }
            }}
            style={{ display: 'none' }}
          />

          {portfolio.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {portfolio.map((item) => (
                <div key={item.id} style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  border: item.is_featured ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    width: '100%',
                    height: '160px',
                    backgroundColor: '#f3f4f6',
                    position: 'relative'
                  }}>
                    {item.file_type === 'video' ? (
                      <video 
                        src={item.file_url}
                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                        controls
                      />
                    ) : (
                      <img 
                        src={item.file_url}
                        alt={item.title}
                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                      />
                    )}
                    {item.is_featured && (
                      <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600' }}>⭐ FEATURED</div>
                    )}
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                      <button 
                        onClick={() => openEditModal(item)}
                        style={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: 'rgba(59, 130, 246, 0.85)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Editează"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeletePortfolio(item.id)}
                        style={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: 'rgba(220, 38, 38, 0.85)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Șterge"
                      >
                        ×
                      </button>
                    </div>
                    {item.category && (
                      <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem' }}>
                        {item.category}
                      </div>
                    )}
                  </div>
                  <div style={{padding: '0.75rem'}}>
                    <h4 style={{
                      margin: '0 0 0.25rem 0',
                      color: '#1f2937',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>{item.title}</h4>
                    {item.client_name && (
                      <p style={{ margin: '0 0 0.25rem 0', color: '#6b7280', fontSize: '0.75rem' }}>👤 {item.client_name} {item.project_year && `(${item.project_year})`}</p>
                    )}
                    {item.technologies && (
                      <p style={{ margin: '0 0 0.25rem 0', color: '#3b82f6', fontSize: '0.7rem', fontWeight: '500' }}>🔧 {item.technologies}</p>
                    )}
                    {item.results && (
                      <p style={{ margin: '0', color: '#10b981', fontSize: '0.7rem' }}>📈 {item.results}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {portfolio.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#9ca3af',
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              border: '1px dashed #d1d5db'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🎨</div>
              <p style={{margin: 0, fontSize: '0.9rem'}}>Nu ai încă elemente în portofoliu.</p>
            </div>
          )}
        </div>
        <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editează Portofoliu">
          <form onSubmit={handleSaveEdit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Titlu Proiect</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Descriere</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Client</label>
                <input
                  type="text"
                  value={editForm.client_name}
                  onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>An</label>
                <input
                  type="number"
                  value={editForm.project_year}
                  onChange={e => setEditForm({ ...editForm, project_year: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  placeholder="2024"
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Categorie</label>
              <select
                value={editForm.category}
                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="">Selectează...</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Tehnologii</label>
              <input
                type="text"
                value={editForm.technologies}
                onChange={e => setEditForm({ ...editForm, technologies: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                placeholder="React, Node.js, PostgreSQL"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Rezultate</label>
              <input
                type="text"
                value={editForm.results}
                onChange={e => setEditForm({ ...editForm, results: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                placeholder="+200% conversii, timp încărcare 2s"
              />
            </div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="is_featured"
                checked={editForm.is_featured}
                onChange={e => setEditForm({ ...editForm, is_featured: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="is_featured" style={{ fontWeight: '500', color: '#374151' }}>⭐ Proiect Featured (afișat primul)</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer' }}>Anulează</button>
              <button type="submit" style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Salvează</button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
