```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNotificationsForUser, markNotificationAsRead } from '../../services/notificationService'; // Adjust path as needed

const NotificationsPage = () => {
  const { currentUser, isAuthenticated, loading: authLoading, refreshNotificationsCount } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      const userNotifications = await getNotificationsForUser(currentUser.id);
      // Sort notifications by date, newest first
      userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(userNotifications);
    } catch (err) {
      setError('Failed to load notifications.');
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchNotifications();
    } else if (!authLoading && !isAuthenticated) {
      navigate('/login'); // Redirect to login if not authenticated
    }
  }, [isAuthenticated, authLoading, fetchNotifications, navigate]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id, currentUser.id);
        // Update local state to reflect read status immediately
        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        // Refresh unread count in AuthContext
        if (currentUser) {
          refreshNotificationsCount(currentUser.id);
        }
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        // Optionally show an error to the user
      }
    }
    if (notification.linkTo) {
      navigate(notification.linkTo);
    }
  };

  if (authLoading || isLoading) {
    return <p>Loading notifications...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>You have no new notifications.</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              style={{
                padding: '10px',
                borderBottom: '1px solid #eee',
                backgroundColor: notification.read ? '#f9f9f9' : '#e6f7ff',
                cursor: 'pointer'
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <p style={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                {notification.message}
              </p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
```
