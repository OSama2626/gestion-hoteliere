import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'; // Added useCallback
import { getToken as getStoredToken, getCurrentUser as getStoredUser, logout as authServiceLogout } from '../../services/authService';
import { getNotificationsForUser as fetchUserNotifications } from '../../services/notificationService'; // Alias import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0); // New state

  const refreshNotificationsCount = useCallback(async (currentUserId) => {
    if (currentUserId) {
      console.log("AuthContext: Attempting to refresh notifications count for user:", currentUserId);
      try {
        const notifications = await fetchUserNotifications(currentUserId);
        const unreadCount = notifications.filter(n => !n.read).length;
        setUnreadNotificationsCount(unreadCount);
        console.log("AuthContext: Refreshed unread notifications count:", unreadCount);
      } catch (error) {
        console.error("AuthContext: Failed to fetch notifications count", error);
      }
    } else {
      console.log("AuthContext: No currentUserId provided to refreshNotificationsCount, setting count to 0.");
      setUnreadNotificationsCount(0); // Reset if no user
    }
  }, []);

  useEffect(() => {
    console.log('AuthProvider useEffect: Attempting to load token and user');
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      console.log('AuthProvider useEffect: Found stored token and user', storedUser);
      setToken(storedToken);
      setUser(storedUser);
      refreshNotificationsCount(storedUser.id); // Fetch count on load
    } else {
      console.log('AuthProvider useEffect: No stored token or user found');
      setUnreadNotificationsCount(0); // Ensure count is 0 if no user
    }
    setLoading(false);
  }, [refreshNotificationsCount]); // Added refreshNotificationsCount

  const login = (userData, userToken) => {
    console.log('AuthContext login: Storing token and user', userData);
    localStorage.setItem('authToken', userToken);
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
    console.log("AuthContext login, user set to:", userData);
    refreshNotificationsCount(userData.id); // Refresh count on login
  };

  const signup = (userData, userToken) => {
    localStorage.setItem('authToken', userToken);
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
    console.log("AuthContext signup, user set to:", userData);
    refreshNotificationsCount(userData.id); // Refresh count on signup
  };

  const updateUserInContext = (updatedUserData) => {
    // Ensure that we are only updating with the fields we expect (id, email, name, role)
    // This helps prevent accidentally storing sensitive info if the backend ever returned more.
    const sanitizedUserData = {
        id: updatedUserData.id,
        email: updatedUserData.email,
        name: updatedUserData.name,
        role: updatedUserData.role,
    };
    localStorage.setItem('authUser', JSON.stringify(sanitizedUserData));
    setUser(sanitizedUserData);
    console.log("AuthContext user updated to:", sanitizedUserData);
  };

  const logout = () => {
    console.log('AuthContext logout: Clearing user and token');
    authServiceLogout(); // from authService, clears localStorage
    setUser(null);
    setToken(null);
    setUnreadNotificationsCount(0); // Reset count on logout
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      signup,
      updateUserInContext,
      isAuthenticated: !!token,
      loading,
      unreadNotificationsCount,      // Provide new state
      refreshNotificationsCount    // Provide new function
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
