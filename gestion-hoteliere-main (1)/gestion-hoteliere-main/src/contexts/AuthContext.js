```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getCurrentUser as fetchCurrentUser, login as apiLogin, logout as apiLogout, signup as apiSignup, updateUserProfile as apiUpdateUserProfile } from '../services/authService'; // Assuming authService.js is in ../services
import { getNotificationsForUser } from '../services/notificationService'; // Import for notification count

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const refreshNotificationsCount = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const notifications = await getNotificationsForUser(userId);
      const unreadCount = notifications.filter(n => !n.read).length;
      setUnreadNotificationsCount(unreadCount);
    } catch (error) {
      console.error("Error fetching notifications count:", error);
    }
  }, []); // Empty dependency array as getNotificationsForUser is stable

  useEffect(() => {
    const user = fetchCurrentUser();
    if (user) {
      setCurrentUser(user);
      setToken(localStorage.getItem('authToken')); // Ensure token is also set if user exists
      refreshNotificationsCount(user.id); // Fetch initial notification count
    }
    setLoading(false);
  }, [refreshNotificationsCount]);

  const login = async (email, password) => {
    try {
      const { user, token: newToken } = await apiLogin(email, password);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(newToken);
      setCurrentUser(user);
      await refreshNotificationsCount(user.id); // Refresh count on login
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const signup = async (email, password, name) => {
    try {
      const { user, token: newToken } = await apiSignup(email, password, name);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(newToken);
      setCurrentUser(user);
      await refreshNotificationsCount(user.id); // Refresh count on sign up
      return user;
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    }
  };

  const logout = () => {
    apiLogout(); // This should handle clearing token from localStorage
    setCurrentUser(null);
    setToken(null);
    setUnreadNotificationsCount(0); // Reset count on logout
  };

  const updateUser = async (updatedUserInfo) => {
    if (!currentUser) return; // Or handle error appropriately
    const { user: newUserData } = await apiUpdateUserProfile(currentUser.id, updatedUserInfo);
    setCurrentUser(newUserData); // Update state with potentially new info like name
    localStorage.setItem('user', JSON.stringify(newUserData)); // Update stored user info
    return newUserData;
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, login, logout, signup, updateUser, loading, isAuthenticated: !!token, unreadNotificationsCount, refreshNotificationsCount }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```
