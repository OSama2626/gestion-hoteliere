const MOCK_API_DELAY = 300;
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
        linkTo, // e.g., `/client/reservations/${reservationId}`
        read: false,
        createdAt: new Date().toISOString()
      };
      mockNotifications.unshift(newNotification); // Add to beginning for easy display
      console.log('NotificationService: Notification added:', newNotification, 'All notifications:', mockNotifications);
      resolve(newNotification);
    }, MOCK_API_DELAY);
  });
};

export const getNotificationsForUser = async (userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userId) {
        console.error('NotificationService: User ID is required to fetch notifications.');
        return reject({ message: 'User ID is required to fetch notifications.' });
      }
      const userNotifications = mockNotifications.filter(n => n.userId === userId);
      console.log(`NotificationService: Fetched ${userNotifications.length} notifications for user ${userId}:`, userNotifications);
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
        console.log('NotificationService: Notification marked as read:', notificationId, 'All notifications:', mockNotifications);
        resolve(notification);
      } else {
        console.warn(`NotificationService: Notification not found (id: ${notificationId}) or unauthorized for user ${userId}.`);
        reject({ message: 'Notification not found or unauthorized.' });
      }
    }, MOCK_API_DELAY);
  });
};
