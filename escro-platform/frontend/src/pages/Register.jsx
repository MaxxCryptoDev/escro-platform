import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'expert',
    company: '',
    cui: '',
    industry: '',
    expertise: '',
    experience: '',
    acceptTerms: false,
    referral_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode }));
      setReferralMessage('Vei primi +15 puncte Trust pentru că te-ai înregistrat cu un cod de referință!');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.company || !formData.industry || !formData.expertise || !formData.experience) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }
    
    if (!formData.acceptTerms) {
      setError('Trebuie să accepți Termenii și Condițiile');
      return;
    }
    
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`
      };
      
      const response = await authAPI.register(submitData);
      login(response.data.user, response.data.token);
      localStorage.setItem('referralCode', response.data.user.referral_code || '');
      navigate(formData.role === 'expert' ? '/expert/dashboard' : '/company/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Înregistrare eșuată');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={{ marginRight: '0.5rem', fontSize: '1.75rem' }}>🔒</span>
            ESCRO
          </div>
          <h1 style={styles.title}>Creează un cont</h1>
          <p style={styles.subtitle}>Alătură-te platformei ESCRO</p>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {referralMessage && (
          <div style={{ ...styles.error, backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' }}>
            🎁 {referralMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Tip cont</label>
            <div style={styles.roleButtons}>
              <button
                type="button"
                style={{
                  ...styles.roleButton,
                  ...(formData.role === 'expert' ? styles.roleButtonActive : {})
                }}
                onClick={() => setFormData(prev => ({ ...prev, role: 'expert' }))}
              >
                👨‍💼 Expert
              </button>
              <button
                type="button"
                style={{
                  ...styles.roleButton,
                  ...(formData.role === 'company' ? styles.roleButtonActive : {})
                }}
                onClick={() => setFormData(prev => ({ ...prev, role: 'company' }))}
              >
                🏢 Companie
              </button>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nume *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Nume"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Prenume *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Prenume"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="exemplu@email.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Parolă *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Telefon *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+40 7xx xxx xxx"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nume Companie *</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Numele companiei"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CUI (Cod Unic de Identificare)</label>
            <input
              type="text"
              name="cui"
              value={formData.cui}
              onChange={handleChange}
              placeholder="Ex: 12345678"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Industrie *</label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="Ex: IT, Construcții, Marketing"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Expertiză *</label>
            <input
              type="text"
              name="expertise"
              value={formData.expertise}
              onChange={handleChange}
              placeholder={formData.role === 'expert' ? "Ex: Web Developer, Designer" : "Ce servicii cauți?"}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Experiență (ani) *</label>
            <input
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="Ex: 5"
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
              style={{ marginTop: '0.3rem', width: '18px', height: '18px' }}
              required
            />
            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.4' }}>
              Am citit și accept <a href="/terms" target="_blank" style={{ color: '#007bff' }}>Termenii și Condițiile</a> platformei ESCRO și sunt de acord cu utilizarea datelor mele personale.
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button}
          >
            {loading ? 'Se creează contul...' : 'Creează Cont'}
          </button>
        </form>

        <p style={styles.footer}>
          Ai deja cont? <Link to="/login" style={styles.link}>Conectează-te</Link>
        </p>

        <Link to="/" style={styles.backLink}>
          ← Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '2rem'
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    margin: 0
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.25rem',
    fontSize: '0.875rem'
  },
  roleButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  roleButton: {
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#6b7280'
  },
  roleButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    color: '#2563eb'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.375rem'
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#f9fafb'
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem'
  },
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.9375rem',
    color: '#6b7280'
  },
  link: {
    color: '#2563eb',
    fontWeight: '500',
    textDecoration: 'none'
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    textDecoration: 'none'
  }
};
