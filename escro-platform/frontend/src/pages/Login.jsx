import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      login(response.data.user, response.data.token);
      
      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.data.user.role === 'expert') {
        navigate('/expert/dashboard');
      } else {
        navigate('/company/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login eșuat');
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
          <h1 style={styles.title}>Bine ai revenit!</h1>
          <p style={styles.subtitle}>Conectează-te la contul tău</p>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
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
            <label style={styles.label}>Parolă</label>
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

          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button}
          >
            {loading ? 'Se încarcă...' : 'Conectare'}
          </button>
        </form>

        <p style={styles.footer}>
          Nu ai cont? <Link to="/register" style={styles.link}>Creează un cont</Link>
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
    maxWidth: '420px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
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
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
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
    marginBottom: '1.5rem',
    fontSize: '0.875rem'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
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
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    textDecoration: 'none'
  }
};
