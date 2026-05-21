import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui';

const IDENTITY_POINTS_CONFIG = {
  profile_completed: { points: 15, label: 'Profil complet', icon: '✓', description: 'Nume, email, telefon, biografie, profesie, industrie, expertiză, experiență' },
  profile_photo: { points: 10, label: 'Fotografie de profil', icon: '📷', description: 'Încarcă o fotografie de profil' },
  portfolio_approved: { points: 15, label: 'Portofoliu', icon: '🎨', description: 'Min. 3 imagini în portofoliu' },
  email_validated: { points: 10, label: 'Email validat', icon: '📧', description: 'Email confirmat în sistem' },
  kyc_verified: { points: 5, label: 'Verificare Stripe (KYC)', icon: '🪪', description: 'Verificare identitate prin Stripe' },
  payment_method: { points: 10, label: 'Metodă de plată', icon: '💳', description: 'Adaugă o metodă de plată' },
  verification_call: { points: 15, label: 'Apel de validare identitate', icon: '📞', description: 'Apel intern de validare a identității' }
};

// ——— Dark-themed local components ———

const IdentityItem = ({ config, completed }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '.625rem', padding: '.75rem',
    background: completed ? 'var(--success-bg)' : 'var(--bg-1)',
    border: `1px solid ${completed ? 'var(--success-border)' : 'var(--border-1)'}`,
    borderRadius: 'var(--r-md)',
  }}>
    <span style={{ color: completed ? 'var(--success)' : 'var(--fg-3)', fontSize: 14, marginTop: 1, flexShrink: 0 }}>
      {completed ? '✓' : '○'}
    </span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: completed ? 'var(--success)' : 'var(--fg-1)' }}>{config.label}</div>
      <div style={{ fontSize: 11, color: completed ? 'var(--success)' : 'var(--fg-3)', marginTop: 2 }}>
        {completed ? 'Completat' : config.description}
      </div>
    </div>
    <span style={{ fontSize: 11, fontWeight: 700, color: completed ? 'var(--success)' : 'var(--fg-3)', whiteSpace: 'nowrap', fontFamily: 'var(--f-mono)' }}>
      +{config.points}p
    </span>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: '1.5rem', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="row-between" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--fg-3)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ——— Main component ———

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

  // ——— Computed values for identity points ———
  const completedCount = Object.entries(IDENTITY_POINTS_CONFIG).filter(([key]) => {
    if (key === 'profile_photo') return !!profile.profile_image_url;
    if (key === 'portfolio_approved') return portfolio.length >= 3;
    return trustProfile && trustProfile[key];
  }).length;

  // ——— Loading state ———
  if (loading) {
    return (
      <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <span className="muted">Se încarcă...</span>
      </div>
    );
  }

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="page-eyebrow">Cont</div>
          <h1 className="page-title">Profilul meu</h1>
          <p className="page-subtitle">Editează informațiile publice, fotografia și portofoliul.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/profile/${user?.id}`)}>
            Previzualizare profil public →
          </button>
        </div>
      </div>

      {/* Flash message */}
      {message.text && (
        <div style={{
          padding: '.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--r-sm)', fontSize: 13,
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {message.text}
        </div>
      )}

      {/* Identity Points card */}
      {trustProfile && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-head">
            <div className="card-title">Puncte de Identitate</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-hi)', fontFamily: 'var(--f-mono)' }}>
              {trustProfile.type2_points || 0}{' '}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>pct</span>
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.75rem' }}>
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.profile_photo}
                completed={!!profile.profile_image_url}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.profile_completed}
                completed={!!trustProfile.profile_completed}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.email_validated}
                completed={!!trustProfile.email_validated}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.portfolio_approved}
                completed={portfolio.length >= 3}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.kyc_verified}
                completed={!!trustProfile.kyc_verified}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.payment_method}
                completed={!!trustProfile.payment_method_added}
              />
              <IdentityItem
                config={IDENTITY_POINTS_CONFIG.verification_call}
                completed={!!trustProfile.has_verification_call}
              />
            </div>
            <div style={{ marginTop: '1rem', fontSize: 12, color: 'var(--fg-3)' }}>
              <strong style={{ color: 'var(--fg-1)' }}>{completedCount}</strong> din{' '}
              <strong style={{ color: 'var(--fg-1)' }}>{Object.keys(IDENTITY_POINTS_CONFIG).length}</strong> secțiuni completate
            </div>
          </div>
        </div>
      )}

      {/* Profile photo card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <div className="card-title">Fotografie de profil</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                border: '2px solid var(--accent-border)', background: 'var(--bg-2)', position: 'relative',
              }}
            >
              {profile.profile_image_url
                ? <img src={profile.profile_image_url} alt="Profile" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--fg-3)' }}>👤</div>
              }
              <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', borderRadius: '50%', padding: 6, fontSize: 12 }}>📷</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 4 }}>Click pe poză pentru a schimba fotografia</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>JPG, PNG, max 10MB</div>
            </div>
          </div>
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
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Personal info form card */}
      <form onSubmit={handleSaveProfile}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-head">
            <div className="card-title">Informații personale</div>
          </div>
          <div className="card-body col" style={{ gap: '.875rem' }}>
            <div className="form-row-2">
              <div>
                <label className="label">Nume</label>
                <input
                  className="input"
                  type="text"
                  name="name"
                  value={profile.name || ''}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={profile.email || ''}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  className="input"
                  type="tel"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="label">Companie</label>
                <input
                  className="input"
                  type="text"
                  name="company"
                  value={profile.company || ''}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="label">Industrie</label>
                <input
                  className="input"
                  type="text"
                  name="industry"
                  value={profile.industry || ''}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="label">Expertiză</label>
                <input
                  className="input"
                  type="text"
                  name="expertise"
                  value={profile.expertise || ''}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            {/* Experience — full width */}
            <div>
              <label className="label">Experiență</label>
              <input
                className="input"
                type="text"
                name="experience"
                value={profile.experience || ''}
                onChange={handleProfileChange}
                placeholder="ex: 5 ani"
              />
            </div>

            {/* Bio — full width */}
            <div>
              <label className="label">Biografie</label>
              <textarea
                className="input"
                name="bio"
                value={profile.bio || ''}
                onChange={handleProfileChange}
                placeholder="Spune-ne câte ceva despre tine..."
              />
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Se salvează...' : 'Salvează profilul'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Portfolio card */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            Portofoliu{' '}
            <span className="muted-2" style={{ fontWeight: 400 }}>({portfolio.length})</span>
          </div>
        </div>
        <div className="card-body col" style={{ gap: '1rem' }}>
          {/* Upload drop zone */}
          <div
            onClick={() => portfolioInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-2)', borderRadius: 'var(--r-md)', padding: '1.25rem',
              textAlign: 'center', cursor: 'pointer', background: 'var(--bg-1)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {uploading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                <span style={{ fontSize: 18 }}>⏳</span>
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Se încarcă...</span>
              </div>
            ) : (
              <>
                <Icon name="upload" size={20} style={{ color: 'var(--fg-3)', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>Click pentru a adăuga</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>JPG, PNG, GIF, MP4, WebM</div>
              </>
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

          {/* Portfolio grid */}
          {portfolio.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {portfolio.map((item) => (
                <div key={item.id} style={{
                  borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-1)',
                  border: item.is_featured ? '1px solid var(--warning-border)' : '1px solid var(--border-1)',
                }}>
                  {/* Thumbnail */}
                  <div style={{ width: '100%', height: 160, background: 'var(--bg-2)', position: 'relative' }}>
                    {item.file_type === 'video' ? (
                      <video src={item.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                    ) : (
                      <img src={item.file_url} alt={item.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}

                    {/* Featured badge */}
                    {item.is_featured && (
                      <div style={{
                        position: 'absolute', top: '.5rem', left: '.5rem',
                        background: 'var(--warning)', color: '#000',
                        padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: 10, fontWeight: 700,
                      }}>⭐ FEATURED</div>
                    )}

                    {/* Action buttons */}
                    <div style={{ position: 'absolute', top: '.5rem', right: '.5rem', display: 'flex', gap: '.25rem' }}>
                      <button
                        onClick={() => openEditModal(item)}
                        title="Editează"
                        style={{
                          width: 28, height: 28, background: 'rgba(59,130,246,0.85)', color: '#fff',
                          border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        onClick={() => handleDeletePortfolio(item.id)}
                        title="Șterge"
                        style={{
                          width: 28, height: 28, background: 'rgba(239,68,68,0.85)', color: '#fff',
                          border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Category pill */}
                    {item.category && (
                      <div style={{
                        position: 'absolute', bottom: '.5rem', left: '.5rem',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: 10,
                      }}>
                        {item.category}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '.75rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', marginBottom: '.25rem' }}>{item.title}</div>
                    {item.client_name && (
                      <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: '.2rem' }}>
                        👤 {item.client_name}{item.project_year ? ` (${item.project_year})` : ''}
                      </div>
                    )}
                    {item.technologies && (
                      <div style={{ fontSize: 11, color: 'var(--accent-hi)', fontWeight: 500, marginBottom: '.2rem' }}>
                        🔧 {item.technologies}
                      </div>
                    )}
                    {item.results && (
                      <div style={{ fontSize: 11, color: 'var(--success)' }}>
                        📈 {item.results}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {portfolio.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '2rem',
              border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)',
              background: 'var(--bg-1)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🎨</div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Nu ai încă elemente în portofoliu.</div>
            </div>
          )}
        </div>
      </div>


      {/* Edit modal — always rendered regardless of tab */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editează Portofoliu">
        <form onSubmit={handleSaveEdit} className="col" style={{ gap: '.875rem' }}>
          <div>
            <label className="label">Titlu Proiect</label>
            <input
              className="input"
              type="text"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Descriere</label>
            <textarea
              className="input"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="form-row-2">
            <div>
              <label className="label">Client</label>
              <input
                className="input"
                type="text"
                value={editForm.client_name}
                onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">An</label>
              <input
                className="input"
                type="number"
                value={editForm.project_year}
                onChange={e => setEditForm({ ...editForm, project_year: e.target.value })}
                placeholder="2024"
              />
            </div>
          </div>
          <div>
            <label className="label">Categorie</label>
            <select
              className="input"
              value={editForm.category}
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
            >
              <option value="">Selectează...</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tehnologii</label>
            <input
              className="input"
              type="text"
              value={editForm.technologies}
              onChange={e => setEditForm({ ...editForm, technologies: e.target.value })}
              placeholder="React, Node.js, PostgreSQL"
            />
          </div>
          <div>
            <label className="label">Rezultate</label>
            <input
              className="input"
              type="text"
              value={editForm.results}
              onChange={e => setEditForm({ ...editForm, results: e.target.value })}
              placeholder="+200% conversii, timp încărcare 2s"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '.25rem' }}>
            <input
              type="checkbox"
              id="is_featured"
              checked={editForm.is_featured}
              onChange={e => setEditForm({ ...editForm, is_featured: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <label htmlFor="is_featured" style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', cursor: 'pointer' }}>
              ⭐ Proiect Featured (afișat primul)
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: '.5rem', marginTop: '.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Salvează</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
