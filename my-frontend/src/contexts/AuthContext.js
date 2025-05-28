import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/users/profile');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = async (credentials) => {
    // ... inside the login function ...
const response = await axiosInstance.post('/auth/login', credentials);

// ADD THIS DEBUG LOG:
console.log('AuthContext login API response.data:', response.data);

if (response.data.requiresTwoFactor) {
  // ADD THIS DEBUG LOG:
  console.log('AuthContext login: 2FA is required by backend.', response.data);
  setIsLoading(false);
  return { requiresTwoFactor: true, userId: response.data.userId, message: response.data.message };
}

// ADD THIS CHECK AND LOGS:
if (response.data.token && response.data.user) {
  console.log('AuthContext login: Token and user found in response. Setting state and localStorage.');
  setToken(response.data.token);
  setUser(response.data.user);
  localStorage.setItem('user', JSON.stringify(response.data.user));
} else {
  console.error('AuthContext login: Critical - Token or user missing in API response!', response.data);
  // You might want to throw an error here if this case is not expected
  // throw new Error('Login response missing token or user.');
}

setIsLoading(false);
return { success: true, user: response.data.user };
// ... rest of the function ...
  };

  const verify2FA = async (twoFactorData) => { /* ... similar to login ... */ setIsLoading(true); try { const response = await axiosInstance.post('/auth/verify-2fa', twoFactorData); setToken(response.data.token); setUser(response.data.user); localStorage.setItem('user', JSON.stringify(response.data.user)); setIsLoading(false); return { success: true, user: response.data.user }; } catch (error) { setIsLoading(false); throw error.response ? error.response.data : new Error('2FA failed'); }};
  const register = async (userData) => { /* ... */ setIsLoading(true); try { const response = await axiosInstance.post('/auth/register', userData); setIsLoading(false); return { success: true, ...response.data }; } catch (error) { setIsLoading(false); throw error.response ? error.response.data : new Error('Register failed'); } };
  const logout = () => { setToken(null); };

  const value = { user, token, isAuthenticated, isLoading, login, register, logout, verify2FA, fetchUserProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};