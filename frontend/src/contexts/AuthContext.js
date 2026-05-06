import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI, apiClient } from '../services/api';

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
  const [token, setToken] = useState(localStorage.getItem('propnest_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('propnest_token')) return null;
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('propnest_user', JSON.stringify(res.data));
      return res.data;
    } catch (e) {
      // 401 etc.
      return null;
    }
  }, []);

  useEffect(() => {
    // Load user from localStorage on mount, then refresh from server
    const storedUser = localStorage.getItem('propnest_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      // Best-effort refresh in background
      refreshUser();
    }
    setLoading(false);
  }, [token, refreshUser]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      localStorage.setItem('propnest_token', access_token);
      localStorage.setItem('propnest_user', JSON.stringify(userData));
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { access_token, user: newUser } = response.data;
      
      setToken(access_token);
      setUser(newUser);
      
      localStorage.setItem('propnest_token', access_token);
      localStorage.setItem('propnest_user', JSON.stringify(newUser));
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('propnest_token');
    localStorage.removeItem('propnest_user');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
