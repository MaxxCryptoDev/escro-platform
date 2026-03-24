import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
        } catch (err) {
          console.error('Failed to restore user:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
        }
      }
      setLoading(false);
    };

    restoreUser();
  }, []);

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
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('userRole');
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
