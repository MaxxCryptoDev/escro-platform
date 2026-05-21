import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { prefetchDownloadToken } from '../utils/format';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await axios.get('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          setUser(response.data.user);
          // AWAIT prefetch so first PDF link doesn't 401 — small extra wait on app load,
          // but prevents race where withAuthToken() returns bare URL before token cached.
          await prefetchDownloadToken();
        } catch (err) {
          console.error('Failed to restore user:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          setToken(null);
        }
      }
      setLoading(false);
    };

    restoreUser();
  }, []);

  // Background refresh of download token every 4 minutes (token TTL is 5 min) — prevents
  // long-session 401s on <a href={withAuthToken(...)}> links.
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      prefetchDownloadToken();
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('userRole', userData.role);
    if (userData.referral_code) {
      localStorage.setItem('referralCode', userData.referral_code);
    }
    setUser(userData);
    setToken(authToken);
    // Prefetch download token so subsequent PDF links work
    prefetchDownloadToken();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('referralCode');
    sessionStorage.removeItem('escro_download_token');
    sessionStorage.removeItem('escro_download_token_exp');
  };

  const updateUser = (patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  };

  // Called by TermsAcceptanceModal after successful acceptance
  const clearTermsRequirement = () => {
    setUser(prev => prev ? { ...prev, requires_terms_acceptance: false } : prev);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    clearTermsRequirement,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
