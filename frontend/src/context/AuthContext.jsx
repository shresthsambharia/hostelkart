import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load user info on mount if token exists
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('userInfo');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Refresh user profile details from server
          const { data } = await authAPI.getProfile();
          setUser(data);
          localStorage.setItem('userInfo', JSON.stringify(data));
        } catch (error) {
          console.error('Session expired or error refreshing profile:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      
      if (data.twoFactorRequired || data.requires2FA) {
        setLoading(false);
        return {
          success: true,
          twoFactorRequired: true,
          twoFactorToken: data.twoFactorToken,
        };
      }

      // Store credentials
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        hostelDetails: data.hostelDetails,
      }));

      setUser(data);
      setLoading(false);
      
      // Redirect based on role
      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.role === 'delivery') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  }, [navigate]);

  const register = useCallback(async (name, email, password, phone, captchaId, captchaAnswer) => {
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name, email, password, phone, captchaId, captchaAnswer });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        hostelDetails: data.hostelDetails,
      }));

      setUser(data);
      setLoading(false);
      
      // Redirect based on role
      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.role === 'delivery') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Registration failed.';
      return { success: false, message };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error on backend:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const login2FA = useCallback(async (code, twoFactorToken, isRecovery = false) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login2FA({ code, twoFactorToken, isRecovery });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        hostelDetails: data.hostelDetails,
      }));

      setUser(data);
      setLoading(false);

      if (data.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.role === 'delivery') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Verification failed.';
      return { success: false, message };
    }
  }, [navigate]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const { data } = await authAPI.updateProfile(profileData);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        hostelDetails: data.hostelDetails,
      }));

      setUser(data);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile.';
      return { success: false, message };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await authAPI.getProfile();
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true, data };
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return { success: false, error };
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    login2FA,
    refreshProfile,
    isAdmin: user?.role === 'admin',
    isDelivery: user?.role === 'delivery',
    isStudent: user?.role === 'student',
  }), [user, loading, login, register, logout, updateProfile, login2FA, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
