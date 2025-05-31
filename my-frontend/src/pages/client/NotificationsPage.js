import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { getNotificationsForUser, markNotificationAsRead } from '../../services/notificationService';
import { Link, useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const { user, isAuthenticated, loading: authLoading, refreshNotificationsCount } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (isAuthenticated && user && user.id) {
      console.log("NotificationsPage: Fetching notifications for user:", user.id);
      setLoading(true);
      setError('');
      try {
        const data = await getNotificationsForUser(user.id);
        // Sort by date, newest first
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(data);
        console.log("NotificationsPage: Notifications fetched:", data);
      } catch (err) {
        setError(err.message || 'Failed to fetch notifications.');
        console.error("NotificationsPage: Error fetching notifications:", err);
      }
      setLoading(false);
    } else if (!authLoading) {
      setNotifications([]);
      setLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchNotifications();
    }
  }, [fetchNotifications, authLoading]);

  const handleMarkAsRead = async (notificationId) => {
    if (!user || !user.id) return;
    console.log("NotificationsPage: Marking notification as read:", notificationId);
    try {
      const updatedNotification = await markNotificationAsRead(notificationId, user.id);
      setNotifications(prevNotifications =>
        prevNotifications.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      refreshNotificationsCount(user.id); // Update unread count in AuthContext

      if (updatedNotification.linkTo) {
        navigate(updatedNotification.linkTo);
      }
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read.');
      console.error("NotificationsPage: Error marking notification as read:", err);
    }
  };

  if (authLoading) {
    return <p>Loading user information...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Notifications</h1>
        <p>Please <Link to="/login">login</Link> to view your notifications.</p>
      </div>
    );
  }

  if (loading) return <p>Loading notifications...</p>;

  return (
    <div>
      <h1>Notifications</h1>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}
      {notifications.length === 0 && !error ? (
        <p>You have no notifications.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {notifications.map(notif => (
            <li
              key={notif.id}
              style={{
                border: `1px solid ${notif.read ? '#ddd' : '#007bff'}`,
                backgroundColor: notif.read ? '#f9f9f9' : '#e7f3ff',
                marginBottom: '10px',
                padding: '15px',
                borderRadius: '5px',
                cursor: notif.linkTo || !notif.read ? 'pointer' : 'default'
              }}
              onClick={() => !notif.read ? handleMarkAsRead(notif.id) : (notif.linkTo ? navigate(notif.linkTo) : null)}
            >
              <p style={{ fontWeight: notif.read ? 'normal' : 'bold', margin: 0 }}>
                {notif.message}
              </p>
              <small style={{ color: '#555' }}>
                Type: {notif.type.replace(/_/g, ' ')} | Received: {new Date(notif.createdAt).toLocaleString()}
              </small>
              {!notif.read && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                  style={{ marginLeft: '10px', padding: '3px 6px', fontSize: '0.8em' }}
                >
                  Mark as Read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
