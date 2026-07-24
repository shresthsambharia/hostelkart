import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('userInfo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const navigate = useNavigate();

  // Load user info on mount if token exists & initialize CSRF token
  useEffect(() => {
    const checkLoggedIn = async () => {
      // Ensure fresh CSRF token is available
      try {
        const csrfRes = await authAPI.getCsrfToken();
        if (csrfRes.data?.csrfToken) {
          localStorage.setItem('csrfToken', csrfRes.data.csrfToken);
        }
      } catch (e) {
        console.warn('Failed to fetch initial CSRF token:', e.message);
      }

      const hasCachedUser = !!localStorage.getItem('userInfo') && !!localStorage.getItem('token');
      if (!hasCachedUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        setUser(null);
        return;
      }

      try {
        const { data } = await authAPI.getProfile();
        setUser(data);
        if (data.csrfToken) {
          localStorage.setItem('csrfToken', data.csrfToken);
        }
        localStorage.setItem('userInfo', JSON.stringify({
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          hostelDetails: data.hostelDetails,
        }));
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          setUser(null);
        }
      }
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

      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.csrfToken) {
        localStorage.setItem('csrfToken', data.csrfToken);
      }

      // Store credentials
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
      
      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.csrfToken) {
        localStorage.setItem('csrfToken', data.csrfToken);
      }

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
      const refreshToken = localStorage.getItem('refreshToken');
      await authAPI.logout(refreshToken);
    } catch (err) {
      console.error('Logout error on backend:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('csrfToken');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const login2FA = useCallback(async (code, twoFactorToken, isRecovery = false) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login2FA({ code, twoFactorToken, isRecovery });
      
      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.csrfToken) {
        localStorage.setItem('csrfToken', data.csrfToken);
      }

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
    initializing,
    login,
    register,
    logout,
    updateProfile,
    login2FA,
    refreshProfile,
    isAdmin: user?.role === 'admin',
    isDelivery: user?.role === 'delivery',
    isStudent: user?.role === 'student',
  }), [user, loading, initializing, login, register, logout, updateProfile, login2FA, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
