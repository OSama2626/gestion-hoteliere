```javascript
// src/services/notificationService.js
const MOCK_API_DELAY = 500;
let mockNotifications = [];
let nextNotificationId = 1;

export const addNotification = async (userId, message, type = 'general', linkTo = null) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newNotification = {
        id: `notif-${nextNotificationId++}`,
        userId,
        message,
        type,
        linkTo, // e.g., /reservations/${reservationId}
        read: false,
        createdAt: new Date().toISOString()
      };
      mockNotifications.unshift(newNotification); // Add to beginning for easy display
      console.log('Notification added:', newNotification, 'All notifications:', mockNotifications);
      resolve(newNotification);
    }, MOCK_API_DELAY);
  });
};

export const getNotificationsForUser = async (userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userId) {
        return reject({ message: 'User ID is required to fetch notifications.' });
      }
      const userNotifications = mockNotifications.filter(n => n.userId === userId);
      resolve(userNotifications);
    }, MOCK_API_DELAY);
  });
};

export const markNotificationAsRead = async (notificationId, userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const notification = mockNotifications.find(n => n.id === notificationId && n.userId === userId);
      if (notification) {
        notification.read = true;
        resolve(notification);
      } else {
        reject({ message: 'Notification not found or unauthorized.' });
      }
    }, MOCK_API_DELAY);
  });
};
```
