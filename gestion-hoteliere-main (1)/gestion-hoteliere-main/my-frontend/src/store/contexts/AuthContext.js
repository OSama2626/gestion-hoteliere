import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import {
  getToken as getStoredToken,
  getCurrentUser as getStoredUser,
  logout as authServiceLogout,
} from '../../services/authService';
import { getNotificationsForUser as fetchUserNotifications } from '../../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const refreshNotificationsCount = useCallback(async (currentUserId) => {
    if (currentUserId) {
      try {
        const notifications = await fetchUserNotifications(currentUserId);
        const unreadCount = notifications.filter((n) => !n.read).length;
        setUnreadNotificationsCount(unreadCount);
      } catch (error) {
        console.error('Failed to fetch notifications count', error);
      }
    } else {
      setUnreadNotificationsCount(0);
    }
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      refreshNotificationsCount(storedUser.id);
    } else {
      setUnreadNotificationsCount(0);
    }
    setLoading(false);
  }, [refreshNotificationsCount]);

  const login = (email, password, role) => {
    // DEMO USERS
    let demoUser = null;
    if (role === 'agent' && email === 'agent@hotel.com' && password === 'agent123') {
      demoUser = { id: 1, email, role: 'agent', name: 'Agent Demo' };
    } else if (role === 'client' && email === 'client@hotel.com' && password === 'client123') {
      demoUser = { id: 2, email, role: 'client', name: 'Client Demo' };
    } else if (role === 'admin' && email === 'admin@hotel.com' && password === 'admin123') {
      demoUser = { id: 3, email, role: 'admin', name: 'Admin Demo' };
    }

    if (demoUser) {
      const demoToken = 'demo-token-' + role;
      localStorage.setItem('authToken', demoToken);
      localStorage.setItem('authUser', JSON.stringify(demoUser));
      setUser(demoUser);
      setToken(demoToken);
      refreshNotificationsCount(demoUser.id);
      return true;
    }

    return false;
  };

  const signup = (userData, userToken) => {
    localStorage.setItem('authToken', userToken);
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
    refreshNotificationsCount(userData.id);
  };

  const updateUserInContext = (updatedUserData) => {
    const sanitizedUserData = {
      id: updatedUserData.id,
      email: updatedUserData.email,
      name: updatedUserData.name,
      role: updatedUserData.role,
    };
    localStorage.setItem('authUser', JSON.stringify(sanitizedUserData));
    setUser(sanitizedUserData);
  };

  const logout = () => {
    authServiceLogout();
    setUser(null);
    setToken(null);
    setUnreadNotificationsCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        signup,
        updateUserInContext,
        isAuthenticated: !!token,
        loading,
        unreadNotificationsCount,
        refreshNotificationsCount,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
